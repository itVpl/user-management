import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaArrowLeft, FaDownload } from 'react-icons/fa';
import { User, Mail, Phone, Building, FileText, CheckCircle, XCircle, Clock, PlusCircle, MapPin, Truck, Calendar, DollarSign, Search } from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

export default function RateApproved() {
  const [approvedRates, setApprovedRates] = useState([]);
  const [viewDoc, setViewDoc] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [selectedRate, setSelectedRate] = useState(null);
  const [reason, setReason] = useState('');
  const [showAddRateForm, setShowAddRateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showRateModal, setShowRateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [approvalModal, setApprovalModal] = useState({
  visible: false,
  type: null, // 'manual' or 'auto'
  rate: null, // the selected rate object
});

  // Form state for Add Rate Approved
  const [formData, setFormData] = useState({
    shipmentNumber: '',
    origin: '',
    destination: '',
    rate: '',
    truckerName: '',
    remarks: '',
    docs: null
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Fetch data from API
  const fetchApprovedRates = async () => {
    try {
      setLoading(true);
      console.log('Fetching approved rates from:', `${API_CONFIG.BASE_URL}/api/v1/bid/approved/`);

      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/bid/approved/`, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('API Response:', response);

      if (response.data && response.data.success) {
        // Transform API data to match our component structure
        const transformedRates = response.data.data.map(rate => ({
          id: `RA-${rate._id.slice(-6)}`,
          rateNum: rate._id,
          shipmentNumber: rate.shipmentNumber || 'N/A',
          origin: rate.origin || 'N/A',
          destination: rate.destination || 'N/A',
          rate: rate.approvedRate || rate.rate || 0,
          truckerName: rate.truckerName || rate.trucker || 'N/A',
          status: 'approved',
          createdAt: new Date(rate.approvedDate || rate.createdAt).toISOString().split('T')[0],
          createdBy: `Employee ${rate.empId || '1234'}`,
          docUpload: rate.supportingDocs || 'sample-doc.jpg',
          remarks: rate.remarks || ''
        }));

        console.log('Transformed rates:', transformedRates);
        setApprovedRates(transformedRates);
      } else {
        console.error('API response format error:', response.data);
      }
    } catch (error) {
      console.error('Error fetching approved rates:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      });
    } finally {
      setLoading(false);
    }
  };

  

  useEffect(() => {
    fetchApprovedRates();
  }, []);

  const handleStatusUpdate = async (status) => {
    try {
      const { id } = selectedRate;
      // Simulate API call
      setTimeout(() => {
        setApprovedRates(approvedRates.map(rate =>
          rate.id === id ? { ...rate, status } : rate
        ));
        setModalType(null);
        setReason('');
        setSelectedRate(null);
        setViewDoc(false);
      }, 1000);
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

  // Filter rates based on search term
  const filteredRates = approvedRates.filter(rate =>
    rate.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rate.shipmentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rate.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rate.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rate.truckerName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  // Add after fetchApprovedRates function
  const fetchPendingApprovals = async () => {
    try {
      console.log('Fetching pending approvals from:', `${API_CONFIG.BASE_URL}/api/v1/bid/pending-intermediate-approval`);

      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/bid/pending-intermediate-approval`, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.data && response.data.success) {
        const transformedRates = response.data.bids.map(bid => ({
          id: `RA-${bid._id.slice(-6)}`,
          rateNum: bid._id,
          shipmentNumber: bid.load.shipmentNumber || 'N/A',
          origin: `${bid.load.origin.city}, ${bid.load.origin.state}`,
          destination: `${bid.load.destination.city}, ${bid.load.destination.state}`,
          rate: bid.rate,
          truckerName: bid.carrier.compName,
          status: 'pending',
          createdAt: new Date(bid.createdAt).toISOString().split('T')[0],
          createdBy: `Employee ${bid.placedByInhouseUser}`,
          docUpload: bid.doDocument || 'sample-doc.jpg',
          remarks: bid.message || ''
        }));

        return transformedRates;
      }
      return [];
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      return [];
    }
  };
// Define fetchAllData at the component level
const fetchAllData = async () => {
  setLoading(true);
  try {
    const [approvedData, pendingData] = await Promise.all([
      fetchApprovedRates(),
      fetchPendingApprovals()
    ]);
    
    // Combine both datasets
    const combinedRates = [...(approvedData || []), ...(pendingData || [])];
    setApprovedRates(combinedRates);
  } catch (error) {
    console.error('Error fetching data:', error);
    alertify.error('Error refreshing data');
  } finally {
    setLoading(false);
  }
};

// Then update the handleManualApprove and handleAutoApprove functions
const handleManualApprove = async (bidId, customRate) => {
  setActionLoading(prev => ({ ...prev, [bidId]: 'manual' }));
  try {
    const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/bid/intermediate/${bidId}/approve`, {
      rate: customRate
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.data.success) {
      alertify.success('Bid manually approved successfully');
      await fetchAllData();
    } else {
      alertify.error(response.data.message || 'Failed to approve bid manually');
    }
  } catch (error) {
    console.error('Manual approve error:', error);
    alertify.error(error.response?.data?.message || 'Error in manual approval. Please try again.');
  } finally {
    setActionLoading(prev => ({ ...prev, [bidId]: null }));
  }
};


const handleAutoApprove = async (bidId) => {
  setActionLoading(prev => ({ ...prev, [bidId]: 'auto' }));
  try {
    const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/bid/intermediate/${bidId}/auto-approve`, {}, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.data.success) {
      alertify.success('Bid auto-approved successfully');
      await fetchAllData(); // Now this will work
    } else {
      alertify.error(response.data.message || 'Failed to auto-approve bid');
    }
  } catch (error) {
    console.error('Auto approve error:', error);
    alertify.error(error.response?.data?.message || 'Error in auto approval. Please try again.');
  } finally {
    setActionLoading(prev => ({ ...prev, [bidId]: null }));
  }
};
  // Pagination calculations
  const totalPages = Math.ceil(filteredRates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRates = filteredRates.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);
  // Replace the existing useEffect
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      const [approvedData, pendingData] = await Promise.all([
        fetchApprovedRates(),
        fetchPendingApprovals()
      ]);

      // Combine both datasets
      const combinedRates = [...(approvedData || []), ...(pendingData || [])];
      setApprovedRates(combinedRates);
      setLoading(false);
    };

    fetchAllData();
  }, []);
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle file upload
  const handleFileChange = (e) => {
    setFormData(prev => ({
      ...prev,
      docs: e.target.files[0]
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      // Prepare the data for API submission
      const submitData = {
        empId: "1234", // You can make this dynamic based on logged-in user
        date: new Date().toISOString().split('T')[0], // Current date
        shipmentNumber: formData.shipmentNumber,
        origin: formData.origin,
        destination: formData.destination,
        rate: parseInt(formData.rate),
        truckerName: formData.truckerName,
        remarks: formData.remarks,
        supportingDocs: formData.docs ? formData.docs.name : ""
      };

      // Submit to API
      const response = await axios.post(`${API_CONFIG.BASE_URL}/api/v1/bid/approved/`, submitData, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.data.success) {
        // Add the new rate to the existing rates list
        const newRate = {
          id: `RA-${response.data.data._id.slice(-6)}`,
          rateNum: response.data.data._id,
          shipmentNumber: response.data.data.shipmentNumber,
          origin: response.data.data.origin,
          destination: response.data.data.destination,
          rate: response.data.data.rate,
          truckerName: response.data.data.truckerName,
          status: 'approved',
          createdAt: new Date(response.data.data.date).toISOString().split('T')[0],
          createdBy: `Employee ${response.data.data.empId}`,
          docUpload: response.data.data.supportingDocs || 'sample-doc.jpg',
          remarks: response.data.data.remarks
        };

        setApprovedRates(prevRates => [newRate, ...prevRates]);

        // Close modal and reset form
        setShowAddRateForm(false);
        setFormData({
          shipmentNumber: '',
          origin: '',
          destination: '',
          rate: '',
          truckerName: '',
          remarks: '',
          docs: null
        });

        // Show success message
        alertify.success('✅ Rate approved successfully!');
      } else {
        alertify.error('Failed to approve rate. Please try again.');
      }
    } catch (error) {
      console.error('Error approving rate:', error);
      alertify.error('Error approving rate. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form when modal closes
  const handleCloseModal = () => {
    setShowAddRateForm(false);
    setFormData({
      shipmentNumber: '',
      origin: '',
      destination: '',
      rate: '',
      truckerName: '',
      remarks: '',
      docs: null
    });
  };

  // Handle view rate details
  const handleViewRate = (rate) => {
    setSelectedRate(rate);
    setShowRateModal(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading approved rates...</p>
          </div>
        </div>
      </div>
    );
  }

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
      <div className="fixed inset-0 z-50 backdrop-blue-sm bg-black/30 flex items-center justify-center">
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
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Truck className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Approved Rates</p>
                <p className="text-xl font-bold text-gray-800">{approvedRates.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-xl font-bold text-blue-600">{approvedRates.filter(rate => rate.status === 'approved').length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock className="text-yellow-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-xl font-bold text-yellow-600">{approvedRates.filter(rate => rate.status === 'pending').length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Calendar className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Today</p>
                <p className="text-xl font-bold text-purple-600">{approvedRates.filter(rate => rate.createdAt === new Date().toISOString().split('T')[0]).length}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search rates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

        </div>
      </div>

      {viewDoc && selectedRate ? (
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
              href={`${API_CONFIG.BASE_URL}/${selectedRate.docUpload}`}
              target="_blank"
              rel="noreferrer"
              className="hover:scale-110 transition-transform"
            >
              <FaDownload className="text-blue-500 text-2xl cursor-pointer" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            // Replace the existing rate info section in the viewDoc condition with:
            <div className="border rounded-2xl p-6 bg-gradient-to-br from-green-50 to-white shadow flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-2">
                <Building className="text-green-500" size={20} />
                <h3 className="text-lg font-bold text-green-700">Rate Info</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <User size={16} />
                  <span className="font-medium">Trucker:</span> {selectedRate.truckerName}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <FileText size={16} />
                  <span className="font-medium">MC/DOT:</span> {selectedRate.carrierInfo?.mcDotNo || 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail size={16} />
                  <span className="font-medium">Email:</span> {selectedRate.carrierInfo?.email || 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone size={16} />
                  <span className="font-medium">Phone:</span> {selectedRate.carrierInfo?.phone || 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Truck size={16} />
                  <span className="font-medium">Fleet Size:</span> {selectedRate.carrierInfo?.fleetSize || 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin size={16} />
                  <span className="font-medium">Origin:</span> {selectedRate.origin}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin size={16} />
                  <span className="font-medium">Destination:</span> {selectedRate.destination}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <DollarSign size={16} />
                  <span className="font-medium">Rate:</span> ${selectedRate.rate.toLocaleString()}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar size={16} />
                  <span className="font-medium">Est. Pickup:</span> {selectedRate.estimatedPickup || 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar size={16} />
                  <span className="font-medium">Est. Delivery:</span> {selectedRate.estimatedDelivery || 'N/A'}
                </div>
                {selectedRate.remarks && (
                  <div className="col-span-2 flex items-start gap-2 text-gray-700">
                    <FileText size={16} className="mt-1" />
                    <div>
                      <span className="font-medium">Remarks:</span>
                      <p className="mt-1">{selectedRate.remarks}</p>
                    </div>
                  </div>
                )}
                <div className="col-span-2">
                  <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mt-2 ${statusColor(selectedRate.status)}`}>
                    {selectedRate.status === 'approved' && <CheckCircle size={14} />}
                    {selectedRate.status === 'rejected' && <XCircle size={14} />}
                    {selectedRate.status === 'pending' && <Clock size={14} />}
                    {selectedRate.status || 'Pending'}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center">
              <img
                src={`${API_CONFIG.BASE_URL}/${selectedRate.docUpload}`}
                alt="Uploaded Doc"
                className="rounded-xl shadow-lg max-h-[250px] w-full object-contain border border-green-100 cursor-pointer hover:scale-105 transition"
                onClick={() => setPreviewImg(`${API_CONFIG.BASE_URL}/${selectedRate.docUpload}`)}
              />
              <div className="text-xs text-gray-400 mt-2">Click image to preview</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                <tr>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Rate ID</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Rate Num</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Shipment</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Origin</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Destination</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Rate</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Trucker</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Created</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody>
                {currentRates.map((rate, index) => (
                  <tr key={rate.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{rate.id}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-mono text-sm text-gray-600">{rate.rateNum}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{rate.shipmentNumber}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{rate.origin}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{rate.destination}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-bold text-green-600">${rate.rate.toLocaleString()}</span>
                    </td>
                    <td className="py-2 px-3">
                      <div>
                        <p className="font-medium text-gray-700">{rate.truckerName}</p>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div>
                        <p className="text-sm text-gray-800">{rate.createdAt}</p>
                        <p className="text-xs text-gray-500">by {rate.createdBy}</p>
                      </div>
                    </td>
                    <td className="py-2 px-3">
  <div className="flex gap-2">
    <button
      onClick={() => setApprovalModal({ visible: true, type: 'manual', rate })}
      disabled={actionLoading[rate.rateNum]}
      className={`px-3 py-1 text-xs font-semibold text-white rounded-full transition-colors ${
        actionLoading[rate.rateNum] === 'manual'
          ? 'bg-green-300 cursor-not-allowed'
          : 'bg-green-500 hover:bg-green-600'
      }`}
    >
      {actionLoading[rate.rateNum] === 'manual' ? (
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          Approving...
        </span>
      ) : (
        'Manual Approve'
      )}
    </button>
    <button
      onClick={() => setApprovalModal({ visible: true, type: 'auto', rate })}
      disabled={actionLoading[rate.rateNum]}
      className={`px-3 py-1 text-xs font-semibold text-white rounded-full transition-colors ${
        actionLoading[rate.rateNum] === 'auto'
          ? 'bg-blue-300 cursor-not-allowed'
          : 'bg-blue-500 hover:bg-blue-600'
      }`}
    >
      {actionLoading[rate.rateNum] === 'auto' ? (
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          Auto...
        </span>
      ) : (
        'Auto Approve'
      )}
    </button>
  </div>
</td>
                    
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredRates.length === 0 && (
            <div className="text-center py-12">
              <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {searchTerm ? 'No approved rates found matching your search' : 'No approved rates found'}
              </p>
              <p className="text-gray-400 text-sm">
                {searchTerm ? 'Try adjusting your search terms' : 'Create your first approved rate to get started'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && filteredRates.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredRates.length)} of {filteredRates.length} rates
            {searchTerm && ` (filtered from ${approvedRates.length} total)`}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-2 border rounded-lg transition-colors ${currentPage === page
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'border-gray-300 hover:bg-gray-50'
                  }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add Rate Approved Modal */}
      {showAddRateForm && (
        <div className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex justify-center items-center p-4">
          {/* Hide scrollbar for modal content */}
          <style>{`
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
          `}</style>
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto hide-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <PlusCircle className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Add Rate Approved</h2>
                    <p className="text-blue-100">Create a new approved rate</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* First Row - Shipment Number & Trucker Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Shipment Number */}
                <div>
                  <input
                    type="text"
                    name="shipmentNumber"
                    value={formData.shipmentNumber}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Shipment Number *"
                  />
                </div>

                {/* Trucker Name */}
                <div>
                  <input
                    type="text"
                    name="truckerName"
                    value={formData.truckerName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Trucker Name *"
                  />
                </div>
              </div>

              {/* Second Row - Origin & Destination */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Origin */}
                <div>
                  <input
                    type="text"
                    name="origin"
                    value={formData.origin}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Origin *"
                  />
                </div>

                {/* Destination */}
                <div>
                  <input
                    type="text"
                    name="destination"
                    value={formData.destination}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Destination *"
                  />
                </div>
              </div>

              {/* Rate */}
              <div>
                <input
                  type="number"
                  name="rate"
                  value={formData.rate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Rate Amount *"
                />
              </div>

              {/* Remarks */}
              <div>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Remarks (optional)"
                />
              </div>

              {/* Documents */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Documents
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    name="docs"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">
                      {formData.docs ? formData.docs.name : 'Click to upload documents'}
                    </p>
                    <p className="text-sm text-gray-500">
                      PDF, DOC, DOCX, JPG, JPEG, PNG (Max 10MB)
                    </p>
                  </label>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className={`px-6 py-3 border border-gray-300 rounded-lg transition-colors ${submitting
                      ? 'opacity-50 cursor-not-allowed text-gray-400'
                      : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold transition-colors ${submitting
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:from-blue-600 hover:to-blue-700'
                    }`}
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </div>
                  ) : (
                    'Create Rate Approved'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {approvalModal.visible && (
  <div className="fixed inset-0 z-50 bg-black bg-opacity-10 flex items-center justify-center">
    <div className="bg-white rounded-2xl p-6 shadow-2xl w-[450px] relative">
      <button
        className="absolute top-3 right-4 text-gray-500 text-2xl hover:text-red-500"
        onClick={() => setApprovalModal({ visible: false, type: null, rate: null })}
      >
        ×
      </button>

      <h2 className="text-lg font-bold text-gray-800 mb-4">
        {approvalModal.type === 'manual' ? 'Manual Approval' : 'Auto Approval'}
      </h2>

      <div className="space-y-2 text-sm text-gray-700">
        <p><strong>Shipment:</strong> {approvalModal.rate.shipmentNumber}</p>
        <p><strong>Trucker:</strong> {approvalModal.rate.truckerName}</p>
        <p><strong>Origin:</strong> {approvalModal.rate.origin}</p>
        <p><strong>Destination:</strong> {approvalModal.rate.destination}</p>
      </div>

      <div className="mt-4">
        <label className="text-sm font-medium text-gray-700">Rate</label>
        <input
          type="number"
          className="w-full px-4 py-2 mt-1 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
          value={approvalModal.rate.rate}
          readOnly={approvalModal.type === 'auto'}
          onChange={(e) => {
            if (approvalModal.type === 'manual') {
              setApprovalModal(prev => ({
                ...prev,
                rate: { ...prev.rate, rate: e.target.value }
              }));
            }
          }}
        />
      </div>

      <div className="mt-6 flex justify-end gap-4">
        <button
          onClick={() => setApprovalModal({ visible: false, type: null, rate: null })}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={async () => {
            if (approvalModal.type === 'manual') {
              await handleManualApprove(approvalModal.rate.rateNum, approvalModal.rate.rate);
            } else {
              await handleAutoApprove(approvalModal.rate.rateNum);
            }
            setApprovalModal({ visible: false, type: null, rate: null });
          }}
          className={`px-5 py-2 rounded-lg text-white ${approvalModal.type === 'manual' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
} 