import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaArrowLeft, FaDownload } from 'react-icons/fa';
import { User, Mail, Phone, Building, FileText, CheckCircle, XCircle, Clock, PlusCircle, MapPin, Truck, Calendar } from 'lucide-react';
import AddTruckerForm from './AddTruckerform';

export default function TruckerDocuments() {
  const [truckers, setTruckers] = useState([]);
  const [viewDoc, setViewDoc] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [selectedTrucker, setSelectedTrucker] = useState(null);
  const [reason, setReason] = useState('');
  const [showAddTruckerForm, setShowAddTruckerForm] = useState(false);
  const [Loading, setLoading] = useState(true);
  const [showTruckerModal, setShowTruckerModal] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchTruckers();
  }, []);

  const fetchTruckers = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const res = await axios.get('https://vpl-liveproject-1.onrender.com/api/v1/shipper_driver/cmt/truckers', {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      setTruckers(res.data.truckers || []);
    } catch (err) {
      console.error('Error fetching truckers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status) => {
    try {
      const { userId } = selectedTrucker;
      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      await axios.patch(`https://vpl-liveproject-1.onrender.com/api/v1/shipper_driver/update-status/${userId}`, {
        status,
        statusReason: reason || null,
      }, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      setModalType(null);
      setReason('');
      setSelectedTrucker(null);
      setViewDoc(false);
      fetchTruckers(); // Refresh
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  // Status color helper
  const statusColor = (status) => {
    if (!status) return 'bg-yellow-100 text-yellow-700';
    if (status === 'approved') return 'bg-green-100 text-green-700';
    if (status === 'rejected') return 'bg-red-100 text-red-700';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
    return 'bg-blue-100 text-blue-700';
  };

  // Pagination calculations
  const totalPages = Math.ceil(truckers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTruckers = truckers.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Handle view trucker details
  const handleViewTrucker = (trucker) => {
    setSelectedTrucker(trucker);
    setShowTruckerModal(true);
  };

  if (previewImg) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center">
        <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden p-4">
          <img src={previewImg} alt="Document Preview" className="max-h-[80vh] rounded-xl shadow-lg" />
          <button
            onClick={() => setPreviewImg(null)}
            className="absolute left-4 top-4 bg-white p-2 rounded-full shadow hover:bg-blue-100"
          >
            <FaArrowLeft />
          </button>
        </div>
      </div>
    );
  }

  if (modalType) {
    return (
      <div className="fixed inset-0 z-50 backdrop-blur-sm bg-black/30 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-[400px] relative flex flex-col items-center">
          <button className="absolute right-4 top-2 text-xl hover:text-red-500" onClick={() => setModalType(null)}>×</button>
          <textarea
            className="w-full border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-3 rounded-lg mb-4"
            rows={5}
            placeholder={`Type reason of ${modalType}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full font-semibold shadow hover:from-blue-700 hover:to-purple-700 transition"
            onClick={() => handleStatusUpdate(modalType === 'approval' ? 'approved' : modalType === 'rejection' ? 'rejected' : 'resubmit')}
          >
            Submit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setShowAddTruckerForm(true)}
          className="flex items-center gap-2 px-5 py-2 bg-blue-500 text-white rounded-full font-semibold shadow hover:from-blue-700 hover:to-purple-700 transition"
        >
          <PlusCircle size={20} /> Add Trucker
        </button>
      </div>

      {viewDoc && selectedTrucker ? (
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="flex gap-4">
              <button
                onClick={() => setModalType('approval')}
                className="flex items-center gap-1 bg-gradient-to-r from-green-500 to-green-700 text-white px-5 py-2 rounded-full shadow hover:from-green-600 hover:to-green-800 transition"
              >
                <CheckCircle size={18} /> Approve
              </button>
              <button
                onClick={() => setModalType('rejection')}
                className="flex items-center gap-1 bg-gradient-to-r from-red-500 to-red-700 text-white px-5 py-2 rounded-full shadow hover:from-red-600 hover:to-red-800 transition"
              >
                <XCircle size={18} /> Reject
              </button>
              <button
                onClick={() => setModalType('resubmit')}
                className="flex items-center gap-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-5 py-2 rounded-full shadow hover:from-blue-600 hover:to-purple-700 transition"
              >
                <Clock size={18} /> Re-submission
              </button>
            </div>
            <a
              href={`https://vpl-liveproject-1.onrender.com/${selectedTrucker.docUpload}`}
              target="_blank"
              rel="noreferrer"
              className="hover:scale-110 transition-transform"
            >
              <FaDownload className="text-blue-500 text-2xl cursor-pointer" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border rounded-2xl p-6 bg-gradient-to-br from-blue-50 to-white shadow flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-2">
                <Building className="text-blue-500" size={20} />
                <h3 className="text-lg font-bold text-blue-700">Company Info</h3>
              </div>
              <div className="flex items-center gap-2 text-gray-700"><User size={16} /> <span className="font-medium">Company:</span> {selectedTrucker.compName}</div>
              <div className="flex items-center gap-2 text-gray-700"><FileText size={16} /> <span className="font-medium">MC/DOT No:</span> {selectedTrucker.mc_dot_no}</div>
              <div className="flex items-center gap-2 text-gray-700"><Mail size={16} /> <span className="font-medium">Email:</span> {selectedTrucker.email}</div>
              <div className="flex items-center gap-2 text-gray-700"><Phone size={16} /> <span className="font-medium">Phone:</span> {selectedTrucker.phoneNo}</div>
              <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mt-2 ${statusColor(selectedTrucker.status)}`}>
                {selectedTrucker.status === 'approved' && <CheckCircle size={14} />}
                {selectedTrucker.status === 'rejected' && <XCircle size={14} />}
                {selectedTrucker.status === 'pending' && <Clock size={14} />}
                {selectedTrucker.status || 'Pending'}
              </div>
            </div>
            <div className="flex flex-col items-center justify-center">
              <img
                src={`https://vpl-liveproject-1.onrender.com/${selectedTrucker.docUpload}`}
                alt="Uploaded Doc"
                className="rounded-xl shadow-lg max-h-[250px] w-full object-contain border border-blue-100 cursor-pointer hover:scale-105 transition"
                onClick={() => setPreviewImg(`https://vpl-liveproject-1.onrender.com/${selectedTrucker.docUpload}`)}
              />
              <div className="text-xs text-gray-400 mt-2">Click image to preview</div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <table className="w-full table-auto">
              <thead className="bg-gradient-to-r from-blue-50 to-purple-100">
                <tr>
                  <th className="p-4 text-left font-semibold text-blue-700">Date</th>
                  <th className="p-4 text-left font-semibold text-blue-700">Trucker Name</th>
                  <th className="p-4 text-left font-semibold text-blue-700">Email</th>
                  <th className="p-4 text-left font-semibold text-blue-700">Status</th>
                  <th className="p-4 text-left font-semibold text-blue-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {Loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8">
                      <div className="w-10 h-10 border-b-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {currentTruckers.map((t, idx) => (
                      <tr key={t.userId || idx} className="border-t text-sm hover:bg-blue-50 transition">
                        <td className="p-4">{new Date(t.addedAt).toLocaleDateString()}</td>
                        <td className="p-4">{t.compName}</td>
                        <td className="p-4">{t.email}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${statusColor(t.status)}`}>
                            {t.status === 'approved' && <CheckCircle size={14} />}
                            {t.status === 'rejected' && <XCircle size={14} />}
                            {t.status === 'pending' && <Clock size={14} />}
                            {t.status || 'Pending'}
                          </span>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleViewTrucker(t)}
                            className="bg-transparent text-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-500/30 transition border border-blue-200"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Simple Pagination */}
          {!Loading && truckers.length > 0 && (
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1}-{Math.min(endIndex, truckers.length)} of {truckers.length} results
              </div>

              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 rounded text-sm font-medium transition ${page === currentPage
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Trucker Details Modal */}
      {showTruckerModal && selectedTrucker && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none', // IE 10+
          }}>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Truck className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedTrucker.compName}</h2>
                    <p className="text-blue-100">Trucker Details</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTruckerModal(false)}
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
                      <p className="font-semibold text-gray-800">{selectedTrucker.compName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <FileText className="text-green-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">MC/DOT Number</p>
                      <p className="font-semibold text-gray-800">{selectedTrucker.mc_dot_no}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Mail className="text-green-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email Address</p>
                      <p className="font-semibold text-gray-800">{selectedTrucker.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Phone className="text-green-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone Number</p>
                      <p className="font-semibold text-gray-800">{selectedTrucker.phoneNo}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <Truck className="text-orange-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Carrier Type</p>
                      <p className="font-semibold text-gray-800">{selectedTrucker.carrierType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <Truck className="text-orange-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Fleet Size</p>
                      <p className="font-semibold text-gray-800">{selectedTrucker.fleetsize} trucks</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <Calendar className="text-gray-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Registration Date</p>
                      <p className="font-semibold text-gray-800">
                        {new Date(selectedTrucker.addedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
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
                      <p className="text-sm text-gray-600">Company Address</p>
                      <p className="font-semibold text-gray-800">{selectedTrucker.compAdd}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <MapPin className="text-purple-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">City</p>
                      <p className="font-semibold text-gray-800">{selectedTrucker.city}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <MapPin className="text-purple-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">State</p>
                      <p className="font-semibold text-gray-800">{selectedTrucker.state}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <MapPin className="text-purple-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Zip Code</p>
                      <p className="font-semibold text-gray-800">{selectedTrucker.zipcode}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <MapPin className="text-purple-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Country</p>
                      <p className="font-semibold text-gray-800">{selectedTrucker.country}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddTruckerForm && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center">
          <div
            className="relative w-full max-w-3xl rounded-2xl shadow-2xl overflow-auto max-h-[90vh] p-4 bg-gradient-to-br from-blue-200 via-white to-blue-300"
            style={{
              scrollbarWidth: 'none', // Firefox
              msOverflowStyle: 'none', // IE 10+
            }}
          >
            <style>{`
              .hide-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>
            <button
              onClick={() => setShowAddTruckerForm(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-black text-2xl"
            >
              ×
            </button>
            <div className="hide-scrollbar">
              <AddTruckerForm onSuccess={() => {
                setShowAddTruckerForm(false);
                fetchTruckers(); // Refresh table after successful addition
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
