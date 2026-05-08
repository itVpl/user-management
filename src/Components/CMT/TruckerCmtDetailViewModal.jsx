import React, { useMemo } from 'react';
import {
  Building,
  Truck,
  FileText,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Eye,
  DollarSign,
} from 'lucide-react';
import { FaDownload } from 'react-icons/fa';
import API_CONFIG from '../../config/api.js';

const getExt = (nameOrUrl = '') => (String(nameOrUrl).split('?')[0].split('.').pop() || '').toUpperCase();

const absUrl = (u) => (u?.startsWith('http') ? u : `${API_CONFIG.BASE_URL}/${u}`);

function humanizeDocsVerifiedLabel(v) {
  if (v == null) return '';
  const raw = String(v).trim();
  if (!raw) return '';
  return raw
    .replace(/_/g, ' ')
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function docsVerifiedDisplay(v) {
  const empty = { label: '—', className: 'bg-gray-100 text-gray-500 border border-gray-200' };
  if (v == null) return empty;
  if (typeof v === 'boolean') {
    return v
      ? { label: 'Verified', className: 'bg-green-100 text-green-800 border border-green-200' }
      : { label: 'Unverified', className: 'bg-gray-100 text-gray-800 border border-gray-200' };
  }
  if (typeof v === 'number') {
    if (v === 1) return { label: 'Verified', className: 'bg-green-100 text-green-800 border border-green-200' };
    if (v === 0) return { label: 'Unverified', className: 'bg-gray-100 text-gray-800 border border-gray-200' };
  }
  const s = String(v).trim().toLowerCase();
  if (!s) return empty;
  const verified = new Set(['true', '1', 'verified', 'yes', 'approved', 'complete', 'completed', 'done']);
  const unverified = new Set(['false', '0', 'no', 'unverified', 'not_verified', 'not verified', 'rejected', 'denied']);
  const pending = new Set(['pending', 'in_progress', 'in progress', 'processing', 'submitted', 'review', 'under_review', 'under review']);
  if (verified.has(s)) {
    return { label: 'Verified', className: 'bg-green-100 text-green-800 border border-green-200' };
  }
  if (pending.has(s)) {
    return { label: humanizeDocsVerifiedLabel(v), className: 'bg-amber-100 text-amber-900 border border-amber-200' };
  }
  if (unverified.has(s)) {
    return { label: 'Unverified', className: 'bg-gray-100 text-gray-800 border border-gray-200' };
  }
  const label = humanizeDocsVerifiedLabel(v);
  return { label: label || '—', className: 'bg-slate-100 text-slate-700 border border-slate-200' };
}

function statusColor(status) {
  if (!status) return 'bg-yellow-100 text-yellow-700';
  if (status === 'approved' || status === 'accountant_approved') return 'bg-green-100 text-green-700';
  if (status === 'rejected') return 'bg-red-100 text-red-700';
  if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
  return 'bg-blue-100 text-blue-700';
}

function getDocumentDisplayName(docKey) {
  const displayNames = {
    brokeragePacket: 'Brokerage Packet',
    carrierPartnerAgreement: 'Carrier Partner Agreement',
    w9Form: 'W9 Form',
    mcAuthority: 'MC Authority',
    safetyLetter: 'Safety Letter',
    bankingInfo: 'Banking Information',
    inspectionLetter: 'Inspection Letter',
    insurance: 'Insurance',
  };
  return displayNames[docKey] || docKey;
}

const DOC_KEYS = [
  'brokeragePacket',
  'carrierPartnerAgreement',
  'w9Form',
  'mcAuthority',
  'safetyLetter',
  'bankingInfo',
  'inspectionLetter',
  'insurance',
];

function buildDocumentPreviewFromTrucker(trucker) {
  if (!trucker || typeof trucker !== 'object') return {};
  if (trucker.documentPreview && Object.keys(trucker.documentPreview).length > 0) {
    return trucker.documentPreview;
  }
  const out = {};
  for (const key of DOC_KEYS) {
    const pathOrUrl = trucker.documents?.[key] ?? trucker[`${key}Url`] ?? trucker[key];
    if (pathOrUrl == null || pathOrUrl === false) continue;
    const s = String(pathOrUrl).trim();
    if (!s || s === 'null' || s === 'undefined') continue;
    out[key] = {
      url: s,
      fileName: trucker[`${key}FileName`] || trucker[`${key}Name`] || key,
      fileType: getExt(s),
    };
  }
  return out;
}

/** View modal aligned with TruckerDocuments detail dialog. */
export default function TruckerCmtDetailViewModal({ trucker, onClose, onPreviewDocument }) {
  const displayTrucker = useMemo(() => {
    if (!trucker) return null;
    const documentPreview = buildDocumentPreviewFromTrucker(trucker);
    const n = Object.keys(documentPreview).length;
    return {
      ...trucker,
      documentPreview: n > 0 ? documentPreview : trucker.documentPreview,
      documentCount: trucker.documentCount ?? n,
    };
  }, [trucker]);

  if (!displayTrucker) return null;

  return (

        <div 
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4"
          onClick={() => onClose()}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" 
            style={{
              scrollbarWidth: 'none', // Firefox
              msOverflowStyle: 'none', // IE 10+
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Truck className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{displayTrucker.compName}</h2>
                    <p className="text-blue-100">Trucker Details</p>
                  </div>
                </div>
                <button
                  onClick={() => onClose()}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Company & Contact Information */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Building className="text-blue-600" size={20} />
                  <h3 className="text-lg font-bold text-gray-800">Company</h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Building className="text-blue-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Company Name</p>
                      <p className="font-semibold text-gray-800">{displayTrucker.compName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <FileText className="text-green-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">MC/DOT Number</p>
                      <p className="font-semibold text-gray-800">{displayTrucker.mc_dot_no}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Mail className="text-green-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email Address</p>
                      <p className="font-semibold text-gray-800">{displayTrucker.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Phone className="text-green-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone Number</p>
                      <p className="font-semibold text-gray-800">{displayTrucker.phoneNo}</p>
                    </div>
                  </div>
                  {displayTrucker.secondaryPhoneNo && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <Phone className="text-green-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Secondary Phone Number</p>
                        <p className="font-semibold text-gray-800">{displayTrucker.secondaryPhoneNo}</p>
                      </div>
                    </div>
                  )}
                  {(displayTrucker.assignedCompany || displayTrucker.onboardCompany || displayTrucker.companyName) && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                        <Building className="text-indigo-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Onboard Company</p>
                        <p className="font-semibold text-gray-800">{displayTrucker.assignedCompany || displayTrucker.onboardCompany || displayTrucker.companyName}</p>
                      </div>
                    </div>
                  )}
                  {(displayTrucker.loadRef || displayTrucker.loadReference) && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <FileText className="text-purple-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Load Reference</p>
                        <p className="font-semibold text-gray-800">{displayTrucker.loadRef || displayTrucker.loadReference}</p>
                      </div>
                    </div>
                  )}
                  {(() => {
                    const dv =
                      displayTrucker.docsVerified ??
                      displayTrucker.documents?.docsVerified ??
                      displayTrucker.user?.docsVerified ??
                      displayTrucker.driver?.docsVerified;
                    const d = docsVerifiedDisplay(dv);
                    return (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="text-teal-700" size={16} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Docs verified</p>
                          <p className="font-semibold">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${d.className}`}>{d.label}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <Truck className="text-orange-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Carrier Type</p>
                      <p className="font-semibold text-gray-800">{displayTrucker.carrierType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <Truck className="text-orange-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Fleet Size</p>
                      <p className="font-semibold text-gray-800">
                        {displayTrucker.fleetsize != null && displayTrucker.fleetsize !== ''
                          ? `${displayTrucker.fleetsize} trucks`
                          : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                      <DollarSign className="text-emerald-700" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Insurance amount</p>
                      <p className="font-semibold text-gray-800">
                        {(() => {
                          const raw =
                            displayTrucker.insuranceAmount ??
                            displayTrucker.insurance_amount;
                          if (raw === undefined || raw === null || raw === '') return '—';
                          const n = Number(raw);
                          return Number.isFinite(n)
                            ? new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                              }).format(n)
                            : String(raw);
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <Calendar className="text-gray-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Registration Date</p>
                      <p className="font-semibold text-gray-800">
                        {(() => {
                          const raw = displayTrucker.addedAt || displayTrucker.createdAt;
                          const dt = raw ? new Date(raw) : null;
                          return dt && !Number.isNaN(dt.getTime())
                            ? dt.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })
                            : '—';
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Address Information */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="text-purple-600" size={20} />
                  <h3 className="text-lg font-bold text-gray-800">Address Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <MapPin className="text-purple-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">City</p>
                      <p className="font-semibold text-gray-800">{displayTrucker.city}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <MapPin className="text-purple-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">State</p>
                      <p className="font-semibold text-gray-800">{displayTrucker.state}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <MapPin className="text-purple-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Country</p>
                      <p className="font-semibold text-gray-800">{displayTrucker.country}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Working Address Information */}
              {displayTrucker.workingAddress && Array.isArray(displayTrucker.workingAddress) && displayTrucker.workingAddress.length > 0 && (
                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6 mt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="text-orange-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Working Address</h3>
                    <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {displayTrucker.workingAddress.length} {displayTrucker.workingAddress.length === 1 ? 'address' : 'addresses'}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {displayTrucker.workingAddress.map((addr, idx) => (
                      <div key={idx} className="bg-white rounded-xl p-4 border border-orange-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-800">Working Address #{idx + 1}</h4>
                          {addr.attachment && (
                            <a
                              href={addr.attachment.startsWith('http') ? addr.attachment : `${API_CONFIG.BASE_URL}/${addr.attachment}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                            >
                              <FileText size={14} />
                              View Attachment
                            </a>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {addr.state && (
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                <MapPin className="text-orange-600" size={16} />
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">State</p>
                                <p className="font-semibold text-gray-800">{addr.state}</p>
                              </div>
                            </div>
                          )}
                          {addr.city && (
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                <MapPin className="text-orange-600" size={16} />
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">City</p>
                                <p className="font-semibold text-gray-800">{addr.city}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents Section */}
              {displayTrucker.documentPreview && Object.keys(displayTrucker.documentPreview).length > 0 && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="text-green-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Uploaded Documents</h3>
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {displayTrucker.documentCount || Object.keys(displayTrucker.documentPreview).length} documents
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(displayTrucker.documentPreview).map(([docKey, docInfo]) => (
                      <div key={docKey} className="bg-white rounded-xl p-4 shadow-sm border border-green-100 hover:shadow-md transition">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <FileText className="text-green-600" size={16} />
                            <span className="font-medium text-sm text-gray-800">
                              {getDocumentDisplayName(docKey)}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {docInfo.fileType}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="text-xs text-gray-600 truncate">
                            {docInfo.fileName}
                          </div>

                          <div className="flex gap-2">
                            {/* // Uploaded Documents (displayTrucker.documentPreview) card (inside map) */}
                            <button
                              onClick={() => onPreviewDocument(absUrl(docInfo.url), getDocumentDisplayName(docKey))}
                              className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-blue-600 transition"
                            >
                              <Eye size={12} />
                              Preview
                            </button>
                            <a
                              href={absUrl(docInfo.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-green-600 transition"
                            >
                              <FaDownload size={10} />
                              Download
                            </a>

                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Information */}
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="text-orange-600" size={20} />
                  <h3 className="text-lg font-bold text-gray-800">Status Information</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${statusColor(displayTrucker.status)}`}>
                      {(displayTrucker.status === 'approved' || displayTrucker.status === 'accountant_approved') && (
                        <CheckCircle size={14} />
                      )}
                      {displayTrucker.status === 'rejected' && <XCircle size={14} />}
                      {displayTrucker.status === 'pending' && <Clock size={14} />}
                      {displayTrucker.status === 'approved'
                        ? 'Approved'
                        : displayTrucker.status === 'accountant_approved'
                          ? 'Accountant Approved'
                          : displayTrucker.status === 'rejected'
                            ? 'Rejected'
                            : displayTrucker.status === 'pending'
                              ? 'Pending'
                              : displayTrucker.status || 'Pending'}
                    </span>
                  </div>
                  {displayTrucker.statusReason && (
                    <div className="bg-white p-3 rounded-lg border">
                      <p className="text-sm text-gray-600 mb-1">Status Reason:</p>
                      <p className="text-sm text-gray-800">{displayTrucker.statusReason}</p>
                    </div>
                  )}
                  {displayTrucker.statusUpdatedAt && (
                    <div className="text-xs text-gray-500">
                      Last updated: {new Date(displayTrucker.statusUpdatedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
  );
}
