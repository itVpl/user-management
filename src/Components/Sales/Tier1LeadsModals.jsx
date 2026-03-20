import React from 'react';
import {
  MapPin,
  Phone,
  Mail,
  User,
  Truck,
  Clock,
  Building,
  CreditCard,
  MessageSquare,
  FileText
} from 'lucide-react';

function customerHasLaneDetails(cust) {
  const ld = cust?.laneDetails;
  if (ld == null || ld === '') return false;
  if (Array.isArray(ld)) return ld.length > 0;
  if (typeof ld === 'object') {
    return !!(ld.pickupAddress || ld.dropAddress || ld._id || ld.equipmentType);
  }
  return false;
}

function getLaneDetailsList(cust) {
  const ld = cust?.laneDetails;
  if (!ld) return [];
  if (Array.isArray(ld)) return ld;
  if (typeof ld === 'object') return [ld];
  return [];
}

/**
 * View / Follow-up / Blacklist modals — same layout & APIs as AddCustomer CustomerTable.
 */
export default function Tier1LeadsModals({
  viewModal,
  followUpHistory,
  closeViewModal,
  prospectForm,
  prospectErrors,
  prospectSubmitting,
  handleProspectInput,
  handleProspectSubmit,
  followUpModal,
  followUpForm,
  setFollowUpForm,
  followUpErrors,
  followUpSubmitting,
  closeFollowUpModal,
  handleFollowUpSubmit,
  actionOpen,
  actionType,
  actionTarget,
  actionForm,
  actionErr,
  closeAction,
  onActionInput,
  submitAction,
  actionLoading
}) {
  return (
    <>
      {viewModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={closeViewModal}
        >
          <div
            className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <User className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Customer Details</h2>
                  <p className="text-blue-100 text-sm">{viewModal.customer?.compName || 'Loading...'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeViewModal}
                className="text-white hover:text-gray-200 text-2xl font-bold transition-colors"
              >
                ×
              </button>
            </div>

            {viewModal.loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading customer details...</p>
                </div>
              </div>
            ) : viewModal.data ? (
              <div className="p-6 space-y-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Building className="text-blue-600" size={20} />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Company Name</p>
                      <p className="font-semibold text-gray-800">{viewModal.data.compName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">MC/DOT Number</p>
                      <p className="font-semibold text-gray-800">{viewModal.data.mc_dot_no || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">User Type</p>
                      <p className="font-semibold text-gray-800 capitalize">{viewModal.data.userType || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-semibold text-gray-800 flex items-center gap-1">
                        <Mail size={14} className="text-gray-400" />
                        {viewModal.data.email || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone Number</p>
                      <p className="font-semibold text-gray-800 flex items-center gap-1">
                        <Phone size={14} className="text-gray-400" />
                        {viewModal.data.phoneNo || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Credit Limit</p>
                      <p className="font-semibold text-blue-600 flex items-center gap-1">
                        <CreditCard size={14} />$
                        {viewModal.data.creditLimit
                          ? parseFloat(viewModal.data.creditLimit).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })
                          : '0.00'}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Onboard Company</p>
                          <p className="font-semibold text-gray-800">{viewModal.data.onboardCompany || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Type</p>
                          <p className="font-semibold text-gray-800 capitalize">
                            {viewModal.data.type || viewModal.data.userType || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <MapPin className="text-green-600" size={20} />
                    Address Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600">Company Address</p>
                      <p className="font-semibold text-gray-800">{viewModal.data.compAdd || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Country</p>
                      <p className="font-semibold text-gray-800">{viewModal.data.country || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">State</p>
                      <p className="font-semibold text-gray-800">{viewModal.data.state || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">City</p>
                      <p className="font-semibold text-gray-800">{viewModal.data.city || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Zipcode</p>
                      <p className="font-semibold text-gray-800">{viewModal.data.zipcode || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-slate-50 to-violet-50 rounded-2xl p-6 border border-violet-100">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Truck className="text-violet-600" size={20} />
                    Lane Details
                  </h3>
                  {customerHasLaneDetails(viewModal.data) ? (
                    <div className="space-y-4">
                      {getLaneDetailsList(viewModal.data).map((lane, laneIdx) => (
                        <div key={lane._id || laneIdx} className="bg-white rounded-xl p-4 border border-violet-200 shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-violet-100">
                            <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide">
                              Lane #{laneIdx + 1}
                            </span>
                            {lane.createdAt && (
                              <span className="text-xs text-gray-500">
                                <Clock size={12} className="inline mr-1" />
                                {new Date(lane.createdAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                          {lane.addedBy && (
                            <div className="mb-4 p-3 rounded-lg bg-violet-50/80 border border-violet-100">
                              <p className="text-xs text-gray-500 mb-1">Added by</p>
                              <p className="text-sm font-semibold text-gray-800">
                                {lane.addedBy.employeeName || 'N/A'}
                                {lane.addedBy.empId ? (
                                  <span className="text-gray-600 font-normal"> ({lane.addedBy.empId})</span>
                                ) : null}
                              </p>
                              {lane.addedBy.department && (
                                <p className="text-xs text-gray-600 mt-0.5">{lane.addedBy.department}</p>
                              )}
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                              <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
                                <MapPin size={14} /> Pickup
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                <div className="md:col-span-2">
                                  <p className="text-gray-500">Address</p>
                                  <p className="font-medium text-gray-800">{lane.pickupAddress || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">City / State / ZIP</p>
                                  <p className="font-medium text-gray-800">
                                    {[lane.pickupCity, lane.pickupState, lane.pickupZip].filter(Boolean).join(', ') ||
                                      'N/A'}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="md:col-span-2">
                              <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1">
                                <MapPin size={14} /> Drop
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                <div className="md:col-span-2">
                                  <p className="text-gray-500">Address</p>
                                  <p className="font-medium text-gray-800">{lane.dropAddress || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">City / State / ZIP</p>
                                  <p className="font-medium text-gray-800">
                                    {[lane.dropCity, lane.dropState, lane.dropZip].filter(Boolean).join(', ') || 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Equipment type</p>
                              <p className="font-semibold text-gray-800">{lane.equipmentType || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Weight</p>
                              <p className="font-semibold text-gray-800">{lane.weight || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Target rate</p>
                              <p className="font-semibold text-gray-800">
                                {lane.targetRate != null && lane.targetRate !== '' ? `$${lane.targetRate}` : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Hazmat</p>
                              <p className="font-semibold text-gray-800">
                                {lane.hazmat === true ? 'Yes' : lane.hazmat === false ? 'No' : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 rounded-xl bg-white/60 border border-dashed border-violet-200">
                      <Truck className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No lane details recorded for this customer</p>
                    </div>
                  )}
                </div>

                {(viewModal.data.type === 'prospect' ||
                  viewModal.data.userType === 'prospect' ||
                  viewModal.data.type === 'final_customer' ||
                  viewModal.data.userType === 'final_customer') && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <FileText className="text-amber-600" size={20} />
                      Prospect Information
                    </h3>

                    {viewModal.data.prospectDetails &&
                      Array.isArray(viewModal.data.prospectDetails) &&
                      viewModal.data.prospectDetails.length > 0 && (
                        <div className="mb-6 space-y-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">
                            Prospect History ({viewModal.data.prospectDetails.length} entries)
                          </h4>
                          {viewModal.data.prospectDetails.map((prospect, prospectIdx) => (
                            <div key={prospect._id || prospectIdx} className="bg-white rounded-lg p-4 border border-amber-200">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-gray-500">Entry #{prospectIdx + 1}</span>
                                  {prospect.prospectStatus && (
                                    <span
                                      className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                                        prospect.prospectStatus === 'Hot'
                                          ? 'bg-red-100 text-red-800'
                                          : prospect.prospectStatus === 'Warm'
                                            ? 'bg-orange-100 text-orange-800'
                                            : 'bg-blue-100 text-blue-800'
                                      }`}
                                    >
                                      {prospect.prospectStatus}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {prospect.prospectDate
                                    ? new Date(prospect.prospectDate).toLocaleString()
                                    : prospect.createdAt
                                      ? new Date(prospect.createdAt).toLocaleString()
                                      : 'N/A'}
                                </div>
                              </div>
                              {prospect.remark && (
                                <div className="mb-3">
                                  <p className="text-xs text-gray-600 mb-1">Remark:</p>
                                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{prospect.remark}</p>
                                </div>
                              )}
                              {prospect.attachments &&
                                Array.isArray(prospect.attachments) &&
                                prospect.attachments.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-amber-100">
                                    <p className="text-xs text-gray-600 mb-2">
                                      Attachments ({prospect.attachments.length}):
                                    </p>
                                    <div className="space-y-2">
                                      {prospect.attachments.map((attachment, attachIdx) => {
                                        const attachmentUrl = attachment.filename
                                          ? `https://vpl-freight-images.s3.eu-north-1.amazonaws.com/${attachment.filename}`
                                          : attachment.path;
                                        return (
                                          <div key={attachment._id || attachIdx} className="flex items-center gap-2">
                                            <a
                                              href={attachmentUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                            >
                                              <FileText size={14} />
                                              {attachment.originalName || attachment.filename || 'View Attachment'}
                                            </a>
                                            {attachment.size && (
                                              <span className="text-xs text-gray-500">
                                                ({(attachment.size / 1024).toFixed(2)} KB)
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                            </div>
                          ))}
                        </div>
                      )}

                    {(() => {
                      const isFinalCustomer =
                        viewModal.data.type === 'final_customer' ||
                        viewModal.data.userType === 'final_customer';
                      return (
                        <form onSubmit={handleProspectSubmit} className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Remarks <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              name="remark"
                              value={prospectForm.remark}
                              onChange={handleProspectInput}
                              placeholder="Enter prospect remarks..."
                              rows={4}
                              disabled={isFinalCustomer}
                              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all resize-none ${
                                prospectErrors.remark ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200'
                              } ${isFinalCustomer ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                            />
                            {prospectErrors.remark && (
                              <p className="text-red-500 text-xs mt-1">{prospectErrors.remark}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Prospect Status <span className="text-red-500">*</span>
                            </label>
                            <select
                              name="prospectStatus"
                              value={prospectForm.prospectStatus}
                              onChange={handleProspectInput}
                              disabled={isFinalCustomer}
                              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all appearance-none bg-white ${
                                prospectErrors.prospectStatus
                                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                                  : 'border-gray-200'
                              } ${isFinalCustomer ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                            >
                              <option value="Warm">Warm</option>
                              <option value="Hot">Hot</option>
                              <option value="Cold">Cold</option>
                            </select>
                            {prospectErrors.prospectStatus && (
                              <p className="text-red-500 text-xs mt-1">{prospectErrors.prospectStatus}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Attachment (Optional)</label>
                            <input
                              type="file"
                              name="attachment"
                              onChange={handleProspectInput}
                              accept=".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx"
                              disabled={isFinalCustomer}
                              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all ${
                                prospectErrors.attachment ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200'
                              } ${isFinalCustomer ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                            />
                            {prospectForm.attachment && (
                              <p className="text-xs text-gray-600 mt-1">Selected: {prospectForm.attachment.name}</p>
                            )}
                            {prospectErrors.attachment && (
                              <p className="text-red-500 text-xs mt-1">{prospectErrors.attachment}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">Images/PDF/DOC/DOCX up to 10MB</p>
                          </div>
                          <div className="flex justify-end pt-4 border-t border-amber-200">
                            <button
                              type="submit"
                              disabled={prospectSubmitting || isFinalCustomer}
                              className={`px-6 py-3 rounded-xl font-semibold text-white transition-all flex items-center gap-2 ${
                                prospectSubmitting || isFinalCustomer
                                  ? 'bg-gray-400 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700'
                              }`}
                            >
                              {prospectSubmitting ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                  Submitting...
                                </>
                              ) : (
                                <>
                                  <FileText size={18} />
                                  Update Prospect Information
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      );
                    })()}
                  </div>
                )}

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <MessageSquare className="text-purple-600" size={20} />
                    Follow Up History
                    {followUpHistory.data && (
                      <span className="text-sm font-normal text-gray-600">
                        ({followUpHistory.data.totalFollowUps || 0} total)
                      </span>
                    )}
                  </h3>
                  {followUpHistory.loading ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
                    </div>
                  ) : followUpHistory.data &&
                    followUpHistory.data.followUpHistory &&
                    followUpHistory.data.followUpHistory.length > 0 ? (
                    <div className="space-y-4">
                      {followUpHistory.data.followUpHistory.map((followUp, idx) => (
                        <div key={followUp._id || idx} className="bg-white rounded-lg p-4 border border-purple-200">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${
                                  followUp.followUpMethod === 'call'
                                    ? 'bg-blue-100 text-blue-800'
                                    : followUp.followUpMethod === 'email'
                                      ? 'bg-green-100 text-green-800'
                                      : followUp.followUpMethod === 'meeting'
                                        ? 'bg-purple-100 text-purple-800'
                                        : followUp.followUpMethod === 'whatsapp'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : followUp.followUpMethod === 'visit'
                                            ? 'bg-orange-100 text-orange-800'
                                            : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {followUp.followUpMethod || 'N/A'}
                              </span>
                              {followUp.nextFollowUpDate && (
                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                                  Next: {new Date(followUp.nextFollowUpDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {followUp.followUpDate
                                ? new Date(followUp.followUpDate).toLocaleString()
                                : followUp.createdAt
                                  ? new Date(followUp.createdAt).toLocaleString()
                                  : 'N/A'}
                            </span>
                          </div>
                          <div className="mb-2">
                            <p className="text-sm text-gray-600 mb-1">Notes:</p>
                            <p className="text-gray-800 whitespace-pre-wrap">{followUp.followUpNotes || 'No notes'}</p>
                          </div>
                          {followUp.performedBy && (
                            <div className="mt-3 pt-3 border-t border-purple-100">
                              <p className="text-xs text-gray-500">
                                Performed by:{' '}
                                <span className="font-semibold text-gray-700">
                                  {followUp.performedBy.employeeName || 'N/A'} ({followUp.performedBy.empId || 'N/A'})
                                </span>
                                {followUp.performedBy.department && (
                                  <span className="text-gray-500"> - {followUp.performedBy.department}</span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">No follow-up history available</p>
                    </div>
                  )}
                </div>

                {viewModal.data.reassignmentHistory && viewModal.data.reassignmentHistory.length > 0 && (
                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <User className="text-teal-600" size={20} />
                      Reassignment History
                    </h3>
                    <div className="space-y-3">
                      {viewModal.data.reassignmentHistory.map((reassign, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-4 border border-teal-200">
                          <p className="text-sm text-gray-600">Reassignment #{idx + 1}</p>
                          <p className="font-semibold text-gray-800 text-sm break-all">
                            {JSON.stringify(reassign, null, 2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <p>No data available</p>
              </div>
            )}
          </div>
        </div>
      )}

      {followUpModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={closeFollowUpModal}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-t-3xl flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <MessageSquare className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Add Follow Up</h2>
                  <p className="text-green-100 text-sm">{followUpModal.customer?.compName || 'Customer'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeFollowUpModal}
                className="text-white hover:text-gray-200 text-2xl font-bold transition-colors"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleFollowUpSubmit} className="p-6 space-y-6">
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Company Name</p>
                    <p className="font-semibold text-gray-800">{followUpModal.customer?.compName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Email</p>
                    <p className="font-semibold text-gray-800">{followUpModal.customer?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Phone</p>
                    <p className="font-semibold text-gray-800">{followUpModal.customer?.phoneNo || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">MC/DOT</p>
                    <p className="font-semibold text-gray-800">{followUpModal.customer?.mc_dot_no || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Follow Up Method <span className="text-red-500">*</span>
                </label>
                <select
                  value={followUpForm.followUpMethod}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, followUpMethod: e.target.value })}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all ${
                    followUpErrors.followUpMethod ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200'
                  }`}
                >
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="meeting">Meeting</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="visit">Visit</option>
                  <option value="other">Other</option>
                </select>
                {followUpErrors.followUpMethod && (
                  <p className="text-red-500 text-xs mt-1">{followUpErrors.followUpMethod}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Follow Up Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={followUpForm.followUpNotes}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, followUpNotes: e.target.value })}
                  placeholder="Enter follow-up notes..."
                  rows={5}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all resize-none ${
                    followUpErrors.followUpNotes ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200'
                  }`}
                />
                {followUpErrors.followUpNotes && (
                  <p className="text-red-500 text-xs mt-1">{followUpErrors.followUpNotes}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Follow Up Date</label>
                <input
                  type="datetime-local"
                  value={followUpForm.followUpDate}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, followUpDate: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to use current date/time</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Next Follow Up Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={followUpForm.nextFollowUpDate}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, nextFollowUpDate: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">Schedule the next follow-up date</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeFollowUpModal}
                  disabled={followUpSubmitting}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={followUpSubmitting}
                  className={`px-6 py-3 rounded-xl font-semibold text-white transition-all flex items-center gap-2 ${
                    followUpSubmitting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                  }`}
                >
                  {followUpSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <MessageSquare size={18} />
                      Add Follow Up
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {actionOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-sm bg-black/20 p-4"
          onClick={closeAction}
        >
          <div className="bg-white rounded-2xl w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-red-500 to-purple-600 text-white p-4 rounded-t-2xl flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                {actionType === 'blacklist' ? 'Blacklist Customer' : 'Remove From Blacklist'}
              </h3>
              <button type="button" onClick={closeAction} className="text-2xl leading-none">
                ×
              </button>
            </div>

            <div className="p-5 space-y-4" onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}>
              <div className="text-sm text-gray-600">
                <span className="font-semibold">{actionTarget?.compName}</span> — {actionTarget?.email}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  {actionType === 'blacklist' ? 'Blacklist Reason' : 'Removal Reason'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  name="reason"
                  value={actionForm.reason}
                  onChange={onActionInput}
                  placeholder={actionType === 'blacklist' ? 'Payment Issues' : 'Payment Issues Resolved'}
                  className={`w-full mt-1 px-3 py-2 border rounded-lg ${actionErr.reason ? 'border-red-400' : 'border-gray-300'}`}
                />
                {actionErr.reason && <p className="text-xs text-red-600 mt-1">Please enter the reason.</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Remarks</label>
                <textarea
                  name="remarks"
                  rows={3}
                  value={actionForm.remarks}
                  onChange={onActionInput}
                  placeholder={
                    actionType === 'blacklist'
                      ? 'Customer has not paid for 3 consecutive loads'
                      : 'Customer has cleared all outstanding payments and provided bank statements'
                  }
                  className="w-full mt-1 px-3 py-2 border rounded-lg border-gray-300"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Attachment (optional)</label>
                <input
                  type="file"
                  name="attachment"
                  onChange={onActionInput}
                  accept=".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx"
                  className={`w-full mt-1 px-3 py-2 border rounded-lg ${actionErr.attachment ? 'border-red-400' : 'border-gray-300'}`}
                />
                {actionErr.attachment && <p className="text-xs text-red-600 mt-1">{actionErr.attachment}</p>}
                <p className="text-xs text-gray-500 mt-1">Images/PDF/DOC/DOCX up to 10MB</p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeAction} className="px-4 py-2 rounded-lg border">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitAction}
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-lg text-white ${
                    actionLoading
                      ? 'bg-gray-400'
                      : actionType === 'blacklist'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {actionLoading ? 'Submitting…' : actionType === 'blacklist' ? 'Blacklist' : 'Remove'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
