import React, { useEffect, useState } from 'react';
import { FaArrowLeft, FaDownload, FaEye, FaFileAlt, FaEdit } from 'react-icons/fa';
import { User, Mail, Phone, Building, FileText, CheckCircle, XCircle, Clock, PlusCircle, MapPin, Truck, Calendar, Eye, Edit, Upload } from 'lucide-react';
import AddTruckerForm from './AddTruckerform';
import axios from 'axios';
import API_CONFIG from '../../config/api.js';
// === Helpers: validations + utils ===
const formatDDMMYYYY = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return '—';
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yy = dt.getFullYear();
  return `${dd}/${mm}/${yy}`;
};

const isValidEmail = (val = '') =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(val).trim());

const isValidPhone = (val) =>
  /^[6-9]\d{9}$/.test(String(val || '').trim());

// INDIA PIN code: exactly 6 digits, first not 0
const isValidZip = (val) =>
  /^[1-9]\d{5}$/.test(String(val || '').trim());

const ALLOWED_DOC_EXT = ['PDF', 'DOC', 'DOCX'];
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const getExt = (nameOrUrl = '') => (nameOrUrl.split('?')[0].split('.').pop() || '').toUpperCase();
const fileIsAllowed = (file) => !!file && ALLOWED_DOC_EXT.includes(getExt(file.name)) && file.size <= MAX_FILE_BYTES;

const IMG_EXTS = ['PNG', 'JPG', 'JPEG', 'GIF', 'WEBP'];
const isImageUrl = (url = '') => IMG_EXTS.includes(getExt(url));
const absUrl = (u) => (u?.startsWith('http') ? u : `${API_CONFIG.BASE_URL}/${u}`);



export default function TruckerDocuments() {
  const [editErrors, setEditErrors] = useState({});
  const [docErrors, setDocErrors] = useState({});
  const [truckers, setTruckers] = useState([]);
  const [viewDoc, setViewDoc] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [selectedTrucker, setSelectedTrucker] = useState(null);
  const [reason, setReason] = useState('');
  const [showAddTruckerForm, setShowAddTruckerForm] = useState(false);
  const [Loading, setLoading] = useState(true);
  const [showTruckerModal, setShowTruckerModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [editUploadStatus, setEditUploadStatus] = useState({
    brokeragePacket: false,
    carrierPartnerAgreement: false,
    w9Form: false,
    mcAuthority: false,
    safetyLetter: false,
    bankingInfo: false,
    inspectionLetter: false,
    insurance: false,
  });
  const [error, setError] = useState(null);

  // Document fields configuration
  const documentFields = [
    { key: 'brokeragePacket', label: 'Brokerage Packet', required: true },
    { key: 'carrierPartnerAgreement', label: 'Carrier Partner Agreement' },
    { key: 'w9Form', label: 'W9 Form', required: true },
    { key: 'mcAuthority', label: 'MC Authority', required: true },
    { key: 'safetyLetter', label: 'Safety Letter', required: false },
    { key: 'bankingInfo', label: 'Banking Information', required: true },
    { key: 'inspectionLetter', label: 'Inspection Letter', required: false },
    { key: 'insurance', label: 'Insurance', required: true },
  ];

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTruckers();
  }, []);

  const fetchTruckers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is authenticated
      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      if (!token) {
        setError("Authentication required. Please login again.");
        setLoading(false);
        return;
      }

      // Create axios instance with auth header
      const axiosInstance = axios.create({
        baseURL: `${API_CONFIG.BASE_URL}`,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Try different endpoints based on user role
      let response;
      try {
        // First try the CMT specific endpoint
        response = await axiosInstance.get('/api/v1/shipper_driver/cmt/truckers');
        response = response.data; // Extract data from axios response
      } catch (cmtError) {
        console.log('CMT endpoint failed, trying general truckers endpoint:', cmtError);
        try {
          // Fallback to general truckers endpoint
          response = await axiosInstance.get('/api/v1/truckers');
          response = response.data; // Extract data from axios response
        } catch (generalError) {
          console.log('General endpoint also failed:', generalError);
          // Try one more endpoint
          response = await axiosInstance.get('/api/v1/shipper_driver/truckers');
          response = response.data; // Extract data from axios response
        }
      }

      // Handle different response structures
      if (response.truckers) {
        setTruckers(response.truckers);
      } else if (response.data && response.data.truckers) {
        setTruckers(response.data.truckers);
      } else if (Array.isArray(response)) {
        setTruckers(response);
      } else {
        setTruckers([]);
      }
    } catch (err) {
      console.error('Error fetching truckers:', err);
      if (err.message.includes('403') || err.message.includes('401')) {
        setError("Access denied. Please check your permissions or login again.");
      } else if (err.message.includes('500')) {
        setError("Server error. Please try again later.");
      } else {
        setError("Failed to load truckers. Please try again.");
      }
      setTruckers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status) => {
    try {
      const { userId } = selectedTrucker;

      // Get authentication token
      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");

      // Create axios instance with auth header
      const axiosInstance = axios.create({
        baseURL: `${API_CONFIG.BASE_URL}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      await axiosInstance.patch(`/api/v1/shipper_driver/update-status/${userId}`, {
        status,
        statusReason: reason || null,
      });
      setModalType(null);
      setReason('');
      setSelectedTrucker(null);
      setViewDoc(false);
      fetchTruckers(); // Refresh
    } catch (err) {
      console.error('Status update failed:', err);
      alert('Failed to update status. Please try again.');
    }
  };

  // Handle edit trucker
  const handleEditTrucker = (trucker) => {
    console.log('Trucker data for editing:', trucker);
    console.log('Available ID fields:', {
      _id: trucker._id,
      userId: trucker.userId,
      id: trucker.id
    });

    setEditFormData({
      _id: trucker._id || trucker.userId,
      compName: trucker.compName || '',
      email: trucker.email || trucker.emailId || trucker.contactEmail || '',
      phoneNo: trucker.phoneNo || '',
      mc_dot_no: trucker.mc_dot_no || '',
      carrierType: trucker.carrierType || '',
      fleetsize: trucker.fleetsize || '',
      city: trucker.city || '',
      state: trucker.state || '',
      country: trucker.country || '',
      // address ke common alternate keys:
      address: trucker.address || trucker.companyAddress || trucker.compAddress || '',
      // zip/pin/postal ke common alternate keys:
      zipCode: trucker.zipCode || trucker.pinCode || trucker.pincode || trucker.postalCode || trucker.zip || '',
      status: trucker.status || 'pending',

      // ... (baaki document URLs same rakhna)
      // (yahan tumhare pehle wale absolute URL mapping hi rehne do)
      
      brokeragePacketUrl: (trucker.brokeragePacketUrl || trucker.brokeragePacket || trucker.documents?.brokeragePacket) ? absUrl(trucker.brokeragePacketUrl || trucker.brokeragePacket || trucker.documents?.brokeragePacket) : null,
      brokeragePacketFileName: trucker.brokeragePacketFileName || trucker.brokeragePacketName || null,
      carrierPartnerAgreementUrl: (trucker.carrierPartnerAgreementUrl || trucker.carrierPartnerAgreement || trucker.documents?.carrierPartnerAgreement) ? absUrl(trucker.carrierPartnerAgreementUrl || trucker.carrierPartnerAgreement || trucker.documents?.carrierPartnerAgreement) : null,
      carrierPartnerAgreementFileName: trucker.carrierPartnerAgreementFileName || trucker.carrierPartnerAgreementName || null,
      w9FormUrl: (trucker.w9FormUrl || trucker.w9Form || trucker.documents?.w9Form) ? absUrl(trucker.w9FormUrl || trucker.w9Form || trucker.documents?.w9Form) : null,
      w9FormFileName: trucker.w9FormFileName || trucker.w9FormName || null,
      mcAuthorityUrl: (trucker.mcAuthorityUrl || trucker.mcAuthority || trucker.documents?.mcAuthority) ? absUrl(trucker.mcAuthorityUrl || trucker.mcAuthority || trucker.documents?.mcAuthority) : null,
      mcAuthorityFileName: trucker.mcAuthorityFileName || trucker.mcAuthorityName || null,
      safetyLetterUrl: (trucker.safetyLetterUrl || trucker.safetyLetter || trucker.documents?.safetyLetter) ? absUrl(trucker.safetyLetterUrl || trucker.safetyLetter || trucker.documents?.safetyLetter) : null,
      safetyLetterFileName: trucker.safetyLetterFileName || trucker.safetyLetterName || null,
      bankingInfoUrl: (trucker.bankingInfoUrl || trucker.bankingInfo || trucker.documents?.bankingInfo) ? absUrl(trucker.bankingInfoUrl || trucker.bankingInfo || trucker.documents?.bankingInfo) : null,
      bankingInfoFileName: trucker.bankingInfoFileName || trucker.bankingInfoName || null,
      inspectionLetterUrl: (trucker.inspectionLetterUrl || trucker.inspectionLetter || trucker.documents?.inspectionLetter) ? absUrl(trucker.inspectionLetterUrl || trucker.inspectionLetter || trucker.documents?.inspectionLetter) : null,
      inspectionLetterFileName: trucker.inspectionLetterFileName || trucker.inspectionLetterName || null,
      insuranceUrl: (trucker.insuranceUrl || trucker.insurance || trucker.documents?.insurance) ? absUrl(trucker.insuranceUrl || trucker.insurance || trucker.documents?.insurance) : null,
      insuranceFileName: trucker.insuranceFileName || trucker.insuranceName || null,

      // new file placeholders
      brokeragePacket: null,
      carrierPartnerAgreement: null,
      w9Form: null,
      mcAuthority: null,
      safetyLetter: null,
      bankingInfo: null,
      inspectionLetter: null,
      insurance: null,

    });



    // Reset upload status
    setEditUploadStatus({
      brokeragePacket: false,
      carrierPartnerAgreement: false,
      w9Form: false,
      mcAuthority: false,
      safetyLetter: false,
      bankingInfo: false,
      inspectionLetter: false,
      insurance: false,
    });

    setShowEditModal(true);
  };

  // Handle edit form submission
  const handleEditSubmit = async (e) => {
    e.preventDefault();

    // 1) Field validations
    const errs = {};
    if (!editFormData.compName?.trim()) errs.compName = true;
    // email required + format
    if (!editFormData.email?.trim()) {
      errs.email = 'required';
    } else if (!isValidEmail(editFormData.email)) {
      errs.email = 'invalid';
    }

    if (!editFormData.address?.trim()) errs.address = true;
    if (!editFormData.country?.trim()) errs.country = true;
    if (!editFormData.state?.trim()) errs.state = true;
    if (!editFormData.city?.trim()) errs.city = true;

    if (!editFormData.zipCode?.trim()) errs.zipCode = true;
    else if (!isValidZip(editFormData.zipCode)) errs.zipCode = true;

    if (!isValidPhone(editFormData.phoneNo)) errs.phoneNo = true;
    if (!editFormData.mc_dot_no?.trim()) errs.mc_dot_no = true;
    if (!editFormData.carrierType?.trim()) errs.carrierType = true;
    if (editFormData.fleetsize === '' || editFormData.fleetsize === null || Number(editFormData.fleetsize) <= 0) {
      errs.fleetsize = true;
    }

    setEditErrors(errs);
    if (Object.keys(errs).length) return;

    // 2) Documents validations
    const requiredDocKeys = ['brokeragePacket', 'w9Form', 'mcAuthority', 'bankingInfo', 'insurance'];

    const missingRequired = [];
    const badFiles = [];

    requiredDocKeys.forEach((k) => {
      const existingUrl = editFormData[`${k}Url`];
      const newFile = editFormData[k];

      if (!existingUrl && !newFile) {
        missingRequired.push(k);
      }
      if (newFile && !fileIsAllowed(newFile)) {
        badFiles.push(k);
      }
    });

    if (missingRequired.length) {
      const msgMap = {
        brokeragePacket: 'Please choose the Brokerage Packet file.',
        w9Form: 'Please choose the W9 Form file.',
        mcAuthority: 'Please choose the MC Authority file.',
        bankingInfo: 'Please choose the Banking Information file.',
        insurance: 'Please choose the Insurance file.',
      };
      alert(missingRequired.map(k => msgMap[k]).join('\n'));
      return;
    }

    if (badFiles.length) {
      alert('Please select the .pdf , .doc and .docx file only and size <= 10 MB.');
      return;
    }

    try {
      // 3) Prepare payloads
      const documentsFormData = new FormData();
      documentFields.forEach(doc => {
        if (editFormData[doc.key]) {
          documentsFormData.append(doc.key, editFormData[doc.key]);
        }
      });

      const jsonData = {
        compName: editFormData.compName,
        email: editFormData.email,
        phoneNo: editFormData.phoneNo,
        mc_dot_no: editFormData.mc_dot_no,
        carrierType: editFormData.carrierType,
        fleetsize: editFormData.fleetsize,
        city: editFormData.city,
        state: editFormData.state,
        country: editFormData.country,
        address: editFormData.address,
        zipCode: editFormData.zipCode
      };

      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const axiosInstance = axios.create({
        baseURL: `${API_CONFIG.BASE_URL}`,
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // 4) API calls
      const hasFileUploads = documentFields.some(doc => editFormData[doc.key]);
      if (hasFileUploads) {
        await axiosInstance.put(
          `/api/v1/shipper_driver/update/${editFormData._id}/documents`,
          documentsFormData
        );
      }

      await axiosInstance.put(
        `/api/v1/shipper_driver/update/${editFormData._id}`,
        jsonData,
        { headers: { 'Content-Type': 'application/json' } }
      );

      // 5) Reset + refresh
      setShowEditModal(false);
      setEditFormData({});
      setEditUploadStatus({
        brokeragePacket: false,
        carrierPartnerAgreement: false,
        w9Form: false,
        mcAuthority: false,
        safetyLetter: false,
        bankingInfo: false,
        inspectionLetter: false,
        insurance: false,
      });
      await fetchTruckers();
      alert('Trucker Update successfully.');

    } catch (err) {
      console.error('Error updating trucker:', err);
      alert('Failed to update trucker. Please try again.');
    }
  };


  // Handle input change for edit form
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle file change for edit form
  // Handle file change for edit form (with inline validation)
  const handleEditFileChange = (e) => {
    const { name, files } = e.target;
    if (!(files && files[0])) {
      // clear chosen file + error (user cleared)
      setEditFormData(prev => ({ ...prev, [name]: null }));
      setEditUploadStatus(prev => ({ ...prev, [name]: false }));
      setDocErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
      return;
    }

    const file = files[0];
    const ext = (file.name.split('.').pop() || '').toUpperCase();

    let errMsg = '';
    if (!['PDF', 'DOC', 'DOCX'].includes(ext)) {
      errMsg = 'Please select the .pdf, .doc and .docx file only.';
    } else if (file.size > 10 * 1024 * 1024) {
      errMsg = 'Please choose the file less than 10 MB.';
    }

    if (errMsg) {
      // set error and DO NOT attach invalid file
      setDocErrors(prev => ({ ...prev, [name]: errMsg }));
      setEditFormData(prev => ({ ...prev, [name]: null }));
      setEditUploadStatus(prev => ({ ...prev, [name]: false }));
    } else {
      // valid
      setDocErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
      setEditFormData(prev => ({ ...prev, [name]: file }));
      setEditUploadStatus(prev => ({ ...prev, [name]: true }));
    }
  };


  // Get upload icon for edit form
  const getEditUploadIcon = (fieldName) => {
    if (editUploadStatus[fieldName]) {
      return <CheckCircle className="text-green-500" size={20} />;
    }
    return <Upload className="text-gray-400" size={20} />;
  };

  // Debug function to test different endpoints
  const testEndpoints = async () => {
    const endpoints = [
      '/api/v1/shipper_driver/cmt/truckers',
      '/api/v1/truckers',
      '/api/v1/shipper_driver/truckers',
      '/api/v1/inhouseUser/department/CMT'
    ];

    // Get authentication token
    const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");

    // Create axios instance with auth header
    const axiosInstance = axios.create({
      baseURL: `${API_CONFIG.BASE_URL}`,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    for (const endpoint of endpoints) {
      try {
        console.log(`Testing endpoint: ${endpoint}`);
        const response = await axiosInstance.get(endpoint);
        console.log(`✅ Success for ${endpoint}:`, response.data);
        return response.data;
      } catch (error) {
        console.log(`❌ Failed for ${endpoint}:`, error.message);
      }
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

  // Search and filter functionality
  const filteredTruckers = truckers.filter(trucker => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      trucker.compName?.toLowerCase().includes(searchLower) ||
      trucker.email?.toLowerCase().includes(searchLower) ||
      trucker.mc_dot_no?.toLowerCase().includes(searchLower) ||
      trucker.phoneNo?.toLowerCase().includes(searchLower)
    );
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredTruckers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTruckers = filteredTruckers.slice(startIndex, endIndex);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Handle view trucker details
  const handleViewTrucker = (trucker) => {
    setSelectedTrucker(trucker);
    setShowTruckerModal(true);
  };

  // Handle document preview
  const handleDocumentPreview = (documentUrl, documentName) => {
    setSelectedDocument({ url: documentUrl, name: documentName });
  };

  // Get document display name
  const getDocumentDisplayName = (docKey) => {
    const displayNames = {
      brokeragePacket: 'Brokerage Packet',
      carrierPartnerAgreement: 'Carrier Partner Agreement',
      w9Form: 'W9 Form',
      mcAuthority: 'MC Authority',
      safetyLetter: 'Safety Letter',
      bankingInfo: 'Banking Information',
      inspectionLetter: 'Inspection Letter',
      insurance: 'Insurance'
    };
    return displayNames[docKey] || docKey;
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

  if (selectedDocument) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full max-h-[90vh]">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 flex justify-between items-center">
            <h3 className="text-lg font-semibold">{selectedDocument.name}</h3>
            <button
              onClick={() => setSelectedDocument(null)}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
          <div className="p-4">
            {isImageUrl(selectedDocument.url) ? (
              <img
                src={selectedDocument.url}
                alt={selectedDocument.name}
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                <div className="text-center">
                  <FaFileAlt className="text-6xl text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Document preview not available</p>
                  <a
                    href={selectedDocument.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                  >
                    Download Document
                  </a>
                </div>
              </div>
            )}

          </div>
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

  if (showEditModal) {
    return (
      <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4">
        <div className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-auto max-h-[90vh] p-4 bg-gradient-to-br from-blue-200 via-white to-blue-300" style={{
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE 10+
        }}>
          <style>{`
             .hide-scrollbar::-webkit-scrollbar { display: none; }
           `}</style>
          <button
            onClick={() => setShowEditModal(false)}
            className="absolute top-3 right-3 text-gray-500 hover:text-black text-2xl"
          >
            ×
          </button>
          <div className="hide-scrollbar">
            <form noValidate onSubmit={handleEditSubmit} className="w-full max-w-2xl flex flex-col gap-4">
              {/* Basic Details Card */}
              <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl mb-1 p-8 flex flex-col items-center">
                <h4 className="text-2xl font-bold mb-4 text-center">Basic Details</h4>
                <div className="w-full flex flex-col gap-4">
                  {/* Company Name full width */}
                  <label className="text-sm font-medium text-gray-700">Company Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="compName"
                    placeholder="Company Name"
                    value={editFormData.compName}
                    onChange={handleEditInputChange}
                    className={`w-full border px-4 py-2 rounded-lg ${editErrors.compName ? 'border-red-500' : 'border-gray-400'}`}

                  />
                  {editErrors.compName && <p className="text-xs text-red-600 mt-1">Please enter the company name.</p>}

                  {/* Company Address */}
                  <label className="text-sm font-medium text-gray-700 mt-3">Company Address <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="address"
                    placeholder="Company Address"
                    value={editFormData.address}
                    onChange={handleEditInputChange}
                    className={`w-full border px-4 py-2 rounded-lg ${editErrors.address ? 'border-red-500' : 'border-gray-400'}`}

                  />
                  {editErrors.address && <p className="text-xs text-red-600 mt-1">Please enter the company address.</p>}

                  {/* Email */}
                  <label className="text-sm font-medium text-gray-700 mt-3">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email Address"
                    value={editFormData.email}
                    onChange={handleEditInputChange}
                    className={`w-full border px-4 py-2 rounded-lg ${editErrors.email ? 'border-red-500' : 'border-gray-400'}`}
                    aria-invalid={!!editErrors.email}
                    aria-describedby={editErrors.email ? 'email-err' : undefined}
                  />
                  {editErrors.email && (
                    <p id="email-err" className="text-xs text-red-600 mt-1">
                      {editErrors.email === 'invalid'
                        ? 'Please enter a valid email address.'
                        : 'Please enter the email address.'}
                    </p>
                  )}


                  {/* Phone | MC/DOT */}
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Phone <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="phoneNo"
                        placeholder="10-digit Mobile (starts 6-9)"
                        value={editFormData.phoneNo}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setEditFormData(prev => ({ ...prev, phoneNo: v }));
                        }}
                        onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
                        inputMode="numeric"
                        className={`w-full border px-4 py-2 rounded-lg ${editErrors.phoneNo ? 'border-red-500' : 'border-gray-400'}`}

                      />
                      {editErrors.phoneNo && <p className="text-xs text-red-600 mt-1">Please enter the valid mobile number.</p>}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">MC/DOT No <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="mc_dot_no"
                        placeholder="MC/DOT Number"
                        value={editFormData.mc_dot_no}
                        onChange={handleEditInputChange}
                        className={`w-full border px-4 py-2 rounded-lg ${editErrors.mc_dot_no ? 'border-red-500' : 'border-gray-400'}`}

                      />
                      {editErrors.mc_dot_no && <p className="text-xs text-red-600 mt-1">Please enter the mc/dot no.</p>}
                    </div>
                  </div>

                  {/* City | State */}
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">City <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="city"
                        placeholder="City"
                        value={editFormData.city}
                        onChange={handleEditInputChange}
                        className={`w-full border px-4 py-2 rounded-lg ${editErrors.city ? 'border-red-500' : 'border-gray-400'}`}

                      />
                      {editErrors.city && <p className="text-xs text-red-600 mt-1">Please enter the city.</p>}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">State <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="state"
                        placeholder="State"
                        value={editFormData.state}
                        onChange={handleEditInputChange}
                        className={`w-full border px-4 py-2 rounded-lg ${editErrors.state ? 'border-red-500' : 'border-gray-400'}`}

                      />
                      {editErrors.state && <p className="text-xs text-red-600 mt-1">Please enter the state.</p>}
                    </div>
                  </div>

                  {/* Country | Zip */}
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Country <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="country"
                        placeholder="Country"
                        value={editFormData.country}
                        onChange={handleEditInputChange}
                        className={`w-full border px-4 py-2 rounded-lg ${editErrors.country ? 'border-red-500' : 'border-gray-400'}`}

                      />
                      {editErrors.country && <p className="text-xs text-red-600 mt-1">Please enter the county.</p>}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Zip Code <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="zipCode"
                        placeholder="Zip Code"
                        value={editFormData.zipCode}
                        onChange={(e) => {
                          const v = e.target.value.toUpperCase().replace(/[^0-9-]/g, '').slice(0, 10);
                          setEditFormData(prev => ({ ...prev, zipCode: v }));
                        }}
                        className={`w-full border px-4 py-2 rounded-lg ${editErrors.zipCode ? 'border-red-500' : 'border-gray-400'}`}

                      />
                      {editErrors.zipCode && (
                        <p className="text-xs text-red-600 mt-1">
                          {editFormData.zipCode?.trim() ? 'Please enter the valid zip code.' : 'Please enter the zip code.'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Fleet Details Card */}
              <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl mb-1 p-8 flex flex-col items-center">
                <h4 className="text-2xl font-bold mb-4 text-center">Fleet Details</h4>
                <div className="w-full grid grid-cols-2 gap-4">
                  {/* Carrier Type */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Carrier Type <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="carrierType"
                      placeholder="Carrier Type"
                      value={editFormData.carrierType}
                      onChange={handleEditInputChange}
                      className={`border px-4 py-2 rounded-lg ${editErrors.carrierType ? 'border-red-500' : 'border-gray-400'}`}
                    />
                    {editErrors.carrierType && <p className="text-xs text-red-600 mt-1">Please enter the Carrier Type.</p>}
                  </div>
                  {/* Fleet Size */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Fleet Size <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      name="fleetsize"
                      placeholder="Fleet Size"
                      value={editFormData.fleetsize}
                      onChange={handleEditInputChange}
                      className={`border px-4 py-2 rounded-lg ${editErrors.fleetsize ? 'border-red-500' : 'border-gray-400'}`}
                    />
                    {editErrors.fleetsize && <p className="text-xs text-red-600 mt-1">Please enter the Fleet Size.</p>}
                  </div>
                </div>
              </div>

              {/* Current Documents Display Card */}
              {/* Only show Current Documents section if there are existing documents */}
              {Object.keys(editFormData).some(key => key.endsWith('Url') && editFormData[key]) && (
                <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl mb-1 p-8 flex flex-col items-center">
                  <h4 className="text-2xl font-bold mb-4 text-center">Current Documents</h4>
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documentFields.map((doc) => {
                      const docUrl = editFormData[`${doc.key}Url`];
                      const docFileName = editFormData[`${doc.key}FileName`];

                      if (!docUrl) return null;

                      return (
                        <div key={doc.key} className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 shadow-sm border border-green-100 hover:shadow-md transition">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <FileText className="text-green-600" size={16} />
                              <span className="font-medium text-sm text-gray-800">
                                {doc.label}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 bg-green-100 px-2 py-1 rounded">
                              Current
                            </span>
                          </div>

                          <div className="space-y-2">
                            <div className="text-xs text-gray-600 truncate">
                              {docFileName || 'Document uploaded'}
                            </div>

                            <div className="flex gap-2">
                              {/* // Current Documents card (inside map) */}
                              <button
                                onClick={() => handleDocumentPreview(absUrl(docUrl), doc.label)}
                                className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-blue-600 transition"
                              >
                                <Eye size={12} />
                                Preview
                              </button>
                              <a
                                href={absUrl(docUrl)}
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
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Required Documents Upload Card */}
              <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl mb-1 p-8 flex flex-col items-center">
                <h4 className="text-2xl font-bold mb-4 text-center">Upload New Documents</h4>
                <div className="w-full grid grid-cols-2 gap-4">
                  {documentFields.map((doc) => (
                    <div key={doc.key} className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FileText size={16} />
                        {doc.label}
                        {doc.required && <span className="text-red-500">*</span>}
                      </label>

                      <div className="relative">
                        <input
                          type="file"
                          name={doc.key}
                          onChange={handleEditFileChange}
                          className="w-full border border-gray-400 px-4 py-2 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          accept=".pdf,.doc,.docx"
                        />
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                          {getEditUploadIcon(doc.key)}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        {editFormData[`${doc.key}Url`] ? 'Upload new file to replace current document' : 'Upload document'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons Card */}
              <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl mb-1 p-8 flex flex-col items-center">
                <div className="w-full flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 py-3 rounded-full text-lg font-bold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-full text-lg font-bold bg-black text-white hover:opacity-90 transition"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Search and Add Trucker Section */}
      <div className="flex justify-between items-center gap-4 mb-6">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search truckers by name, email, MC/DOT number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500 transition-all duration-200 hover:border-gray-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Add Trucker Button */}
        <button
          onClick={() => setShowAddTruckerForm(true)}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 whitespace-nowrap"
        >
          <PlusCircle size={20} /> Add Trucker
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="text-red-600" size={16} />
              </div>
              <div>
                <h3 className="text-red-800 font-semibold">Error Loading Data</h3>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchTruckers}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
              >
                Retry
              </button>
              <button
                onClick={testEndpoints}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Debug API
              </button>
            </div>
          </div>
        </div>
      )}

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
              href={absUrl(selectedTrucker.docUpload)}
              target="_blank"
              rel="noreferrer"
              className="hover:scale-110 transition-transform"
            >
              <FaDownload className="text-blue-500 text-2xl cursor-pointer" />
            </a>

            <img
              src={absUrl(selectedTrucker.docUpload)}
              alt="Uploaded Doc"
              className="rounded-xl shadow-lg max-h-[250px] w/full object-contain border border-blue-100 cursor-pointer hover:scale-105 transition"
              onClick={() => setPreviewImg(absUrl(selectedTrucker.docUpload))}
            />

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
                src={`${API_CONFIG.BASE_URL}/${selectedTrucker.docUpload}`}
                alt="Uploaded Doc"
                className="rounded-xl shadow-lg max-h-[250px] w-full object-contain border border-blue-100 cursor-pointer hover:scale-105 transition"
                onClick={() => setPreviewImg(`${API_CONFIG.BASE_URL}/${selectedTrucker.docUpload}`)}
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
                  <th className="p-4 text-left font-semibold text-blue-700">MC/DOT No</th>
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
                ) : currentTruckers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <Truck className="text-gray-400" size={24} />
                        </div>
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Truckers Found</h3>
                          <p className="text-gray-500 text-sm">
                            {searchTerm ? 'No truckers match your search criteria.' : 'No truckers have been added yet.'}
                          </p>
                          {searchTerm && (
                            <button
                              onClick={() => setSearchTerm('')}
                              className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              Clear search
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {currentTruckers.map((t, idx) => (
                      <tr key={t.userId || idx} className="border-t text-sm hover:bg-blue-50 transition">
                        <td className="p-4">{formatDDMMYYYY(t.addedAt)}</td>
                        <td className="p-4">{t.compName}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-700">
                              {t.mc_dot_no || 'N/A'}
                            </span>
                          </div>
                        </td>
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
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewTrucker(t)}
                              className="flex items-center gap-1 bg-transparent text-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-500/30 transition border border-blue-200"
                            >
                              <Eye size={14} />
                              View
                            </button>
                            <button
                              onClick={() => handleEditTrucker(t)}
                              className="flex items-center gap-1 bg-transparent text-green-600 px-3 py-1 rounded text-sm hover:bg-green-500/30 transition border border-green-200"
                            >
                              <Edit size={14} />
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Enhanced Pagination */}
          {!Loading && filteredTruckers.length > 0 && (
            <div className="mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredTruckers.length)} of {filteredTruckers.length} results
                  {searchTerm && ` (filtered from ${truckers.length} total)`}
                </div>

                <div className="flex items-center gap-2">
                  {/* Previous Button */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>

                  {/* Page Numbers */}
                  <div className="flex gap-1">
                    {/* First Page */}
                    {currentPage > 3 && (
                      <button
                        onClick={() => handlePageChange(1)}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        1
                      </button>
                    )}

                    {/* Ellipsis after first page */}
                    {currentPage > 4 && (
                      <span className="px-2 py-2 text-gray-500">...</span>
                    )}

                    {/* Pages around current page */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        if (totalPages <= 7) return true;
                        return page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1);
                      })
                      .map((page) => (
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

                    {/* Ellipsis before last page */}
                    {currentPage < totalPages - 3 && (
                      <span className="px-2 py-2 text-gray-500">...</span>
                    )}

                    {/* Last Page */}
                    {currentPage < totalPages - 2 && totalPages > 1 && (
                      <button
                        onClick={() => handlePageChange(totalPages)}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {totalPages}
                      </button>
                    )}
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-1"
                  >
                    Next
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Trucker Details Modal */}
      {showTruckerModal && selectedTrucker && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" style={{
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
                      <p className="text-sm text-gray-600">Country</p>
                      <p className="font-semibold text-gray-800">{selectedTrucker.country}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents Section */}
              {selectedTrucker.documentPreview && Object.keys(selectedTrucker.documentPreview).length > 0 && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="text-green-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Uploaded Documents</h3>
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {selectedTrucker.documentCount || Object.keys(selectedTrucker.documentPreview).length} documents
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(selectedTrucker.documentPreview).map(([docKey, docInfo]) => (
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
                            {/* // Uploaded Documents (selectedTrucker.documentPreview) card (inside map) */}
                            <button
                              onClick={() => handleDocumentPreview(absUrl(docInfo.url), getDocumentDisplayName(docKey))}
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
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${statusColor(selectedTrucker.status)}`}>
                      {selectedTrucker.status === 'approved' && <CheckCircle size={14} />}
                      {selectedTrucker.status === 'rejected' && <XCircle size={14} />}
                      {selectedTrucker.status === 'pending' && <Clock size={14} />}
                      {selectedTrucker.status || 'Pending'}
                    </span>
                  </div>
                  {selectedTrucker.statusReason && (
                    <div className="bg-white p-3 rounded-lg border">
                      <p className="text-sm text-gray-600 mb-1">Status Reason:</p>
                      <p className="text-sm text-gray-800">{selectedTrucker.statusReason}</p>
                    </div>
                  )}
                  {selectedTrucker.statusUpdatedAt && (
                    <div className="text-xs text-gray-500">
                      Last updated: {new Date(selectedTrucker.statusUpdatedAt).toLocaleString()}
                    </div>
                  )}
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
