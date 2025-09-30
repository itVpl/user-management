import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaArrowLeft, FaDownload } from 'react-icons/fa';
import { User, Mail, Phone, Building, FileText, CheckCircle, XCircle, Clock, PlusCircle, MapPin, Truck, Calendar, DollarSign, Search } from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import PendingBids from './PendingBids.jsx';
const alphaOnly = /^[A-Za-z\s]+$/;            // alphabets + space
const alphaNum = /^[A-Za-z0-9\s-]+$/;        // letters, numbers, space, dash
// Sanitizers
const sanitizeAlphaNum = (v) => (v || '').replace(/[^a-zA-Z0-9]/g, ''); // A-Z a-z 0-9 only
const sanitizeAlpha = (v) => (v || '').replace(/[^a-zA-Z\s]/g, '').replace(/\s{2,}/g, ' '); // alphabets + single spaces

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
  const [approvalError, setApprovalError] = useState('');
  const [approvalModal, setApprovalModal] = useState({
    visible: false,
    type: null, // 'manual' or 'auto'
    rate: null, // the selected rate object
  });

  // Accept Bid Modal State
  const [acceptBidModal, setAcceptBidModal] = useState({
    visible: false,
    rate: null
  });
  const setFormFieldSanitized = (field, value, mode) => {
    const cleaned = mode === 'alnum' ? sanitizeAlphaNum(value) : sanitizeAlpha(value);
    setAcceptBidForm(prev => ({ ...prev, [field]: cleaned }));
  };

  // Accept Bid Form Data
  const [acceptBidForm, setAcceptBidForm] = useState({
    customerName: '',
    fullAddress: '',
    status: 'Accepted', // Automatic
    shipmentNumber: '',
    poNumber: '',
    bolNumber: '',
    message: ''
  });
  const [acceptSubmitting, setAcceptSubmitting] = useState(false);
  const [acceptErrors, setAcceptErrors] = useState({
    customerName: '',
    fullAddress: '',
    status: '',
    shipmentNumber: '',
    poNumber: '',
    bolNumber: ''
  });
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [salesUserId, setSalesUserId] = useState('1234'); // Default sales user ID
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'completed', or 'accepted'

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

  // Fetch data from API - REMOVED DEFAULT API CALL
  const fetchApprovedRates = async () => {
    // This function is no longer used for the default API call
    // Keeping it for potential future use but not calling the default API
    console.log('fetchApprovedRates function called but default API call removed');
    return [];
  };

  // Fetch completed rates from new API endpoint
  const fetchCustomers = async () => {
    try {
      setCustomersLoading(true);
      console.log('Fetching customers from:', `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/department/customers/1234`);

      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/shipper_driver/department/customers/1234`, {
        timeout: 10000,
        headers: API_CONFIG.getAuthHeaders()
      });

      console.log('Customers API Response:', response);

      if (response.data && response.data.success) {
        const customerOptions = response.data.customers.map(customer => ({
          value: customer._id,
          label: `${customer.compName} (${customer.mc_dot_no})`,
          customer: customer
        }));
        setCustomers(customerOptions);
        console.log('Customer options:', customerOptions);
      } else {
        console.error('Customers API response format error:', response.data);
        setCustomers([]);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  };

  const fetchCompletedRates = async () => {
    try {
      setLoading(true);
      console.log('Fetching completed rates from:', `${API_CONFIG.BASE_URL}/api/v1/bid/pending/emp/1234`);

      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/bid/pending/emp/1234`, {
        timeout: 10000,
        headers: API_CONFIG.getAuthHeaders()
      });

      console.log('Completed Rates API Response:', response);

      if (response.data && response.data.success) {
        // Transform API data to match our component structure
        const transformedRates = response.data.bids.map(bid => ({
          id: `BID-${bid._id.slice(-6)}`,
          rateNum: bid._id,
          shipmentNumber: bid.load?.shipmentNumber || 'N/A',
          origin: bid.load ? `${bid.load.origin?.city || 'N/A'}, ${bid.load.origin?.state || 'N/A'}` : 'N/A, N/A',
          destination: bid.load ? `${bid.load.destination?.city || 'N/A'}, ${bid.load.destination?.state || 'N/A'}` : 'N/A, N/A',
          originalRate: bid.originalRate || bid.load?.rate || 0,
          intermediateRate: bid.intermediateRate || 0,
          rate: bid.intermediateRate || bid.originalRate || 0,
          truckerName: bid.carrier?.compName || 'N/A',
          status: bid.status || 'pending',
          createdAt: new Date(bid.createdAt).toISOString().split('T')[0],
          createdBy: `Employee ${bid.approvedByinhouseUser?.empId || '1234'}`,
          docUpload: bid.doDocument || 'sample-doc.jpg',
          remarks: bid.message || '',
          // Additional fields from the new API
          carrierInfo: {
            mcDotNo: bid.carrier?.mc_dot_no || 'N/A',
            email: bid.carrier?.email || 'N/A',
            phone: bid.carrier?.phoneNo || 'N/A',
            state: bid.carrier?.state || 'N/A',
            city: bid.carrier?.city || 'N/A'
          },
          loadInfo: {
            weight: bid.load?.weight || 0,
            commodity: bid.load?.commodity || 'N/A',
            vehicleType: bid.load?.vehicleType || 'N/A',
            pickupDate: bid.load?.pickupDate || 'N/A',
            deliveryDate: bid.load?.deliveryDate || 'N/A',
            originalRate: bid.load?.rate || 0
          },
          estimatedPickup: new Date(bid.estimatedPickupDate).toLocaleDateString(),
          estimatedDelivery: new Date(bid.estimatedDeliveryDate).toLocaleDateString(),
          placedByInhouseUser: bid.placedByInhouseUser,
          approvedByInhouseUser: bid.approvedByInhouseUser,
          approvalStatus: bid.approvalStatus,
          intermediateApprovedAt: bid.intermediateApprovedAt
        }));

        console.log('Transformed completed rates:', transformedRates);
        console.log('Setting approvedRates with length:', transformedRates.length);
        setApprovedRates(transformedRates);

        // Force a re-render by updating the search term
        setSearchTerm('');
      } else {
        console.error('Completed rates API response format error:', response.data);
        setApprovedRates([]);
      }
    } catch (error) {
      console.error('Error fetching completed rates:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      });
      setApprovedRates([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch accepted bids
  const fetchAcceptedBids = async () => {
    try {
      setLoading(true);
      console.log('Fetching accepted bids from:', `${API_CONFIG.BASE_URL}/api/v1/bid/accepted-by-inhouse?empId=1234`);

      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/bid/accepted-by-inhouse?empId=1234`, {
        timeout: 10000,
        headers: API_CONFIG.getAuthHeaders()
      });

      console.log('Accepted Bids API Response:', response);

      if (response.data && response.data.success) {
        // Transform API data to match our component structure
        const transformedBids = response.data.bids.map(bid => ({
          id: `BID-${bid._id.slice(-6)}`,
          rateNum: bid._id,
          shipmentNumber: bid.load?.shipmentNumber || 'N/A',
          origin: bid.load ? `${bid.load.origin?.city || 'N/A'}, ${bid.load.origin?.state || 'N/A'}` : 'N/A, N/A',
          destination: bid.load ? `${bid.load.destination?.city || 'N/A'}, ${bid.load.destination?.state || 'N/A'}` : 'N/A, N/A',
          originalRate: bid.originalRate || bid.load?.rate || 0,
          intermediateRate: bid.intermediateRate || 0,
          rate: bid.intermediateRate || bid.originalRate || 0,
          truckerName: bid.carrier?.compName || 'N/A',
          status: 'accepted',
          createdAt: new Date(bid.createdAt).toISOString().split('T')[0],
          acceptedAt: bid.acceptedAt ? new Date(bid.acceptedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          createdBy: `${bid.acceptedByInhouseUser?.empName || 'Unknown'} (${bid.acceptedByInhouseUser?.empId || '1234'})`,
          docUpload: bid.doDocument || 'sample-doc.jpg',
          remarks: bid.message || '',
          // Additional fields from the new API
          carrierInfo: {
            mcDotNo: bid.carrier?.mc_dot_no || 'N/A',
            email: bid.carrier?.email || 'N/A',
            phone: bid.carrier?.phoneNo || 'N/A',
            state: bid.carrier?.state || 'N/A',
            city: bid.carrier?.city || 'N/A'
          },
          loadInfo: {
            weight: bid.load?.weight || 0,
            commodity: bid.load?.commodity || 'N/A',
            vehicleType: bid.load?.vehicleType || 'N/A',
            pickupDate: bid.load?.pickupDate || 'N/A',
            deliveryDate: bid.load?.deliveryDate || 'N/A',
            originalRate: bid.load?.rate || 0
          },
          estimatedPickup: new Date(bid.estimatedPickupDate).toLocaleDateString(),
          estimatedDelivery: new Date(bid.estimatedDeliveryDate).toLocaleDateString(),
          acceptedByInhouseUser: bid.acceptedByInhouseUser,
          rateDifference: bid.rateDifference,
          rateDifferencePercentage: bid.rateDifferencePercentage,
          driverInfo: {
            name: bid.driverName || 'N/A',
            phone: bid.driverPhone || 'N/A',
            vehicleNumber: bid.vehicleNumber || 'N/A',
            vehicleType: bid.vehicleType || 'N/A'
          }
        }));

        console.log('Transformed accepted bids:', transformedBids);
        console.log('Setting approvedRates with length:', transformedBids.length);
        setApprovedRates(transformedBids);

        // Force a re-render by updating the search term
        setSearchTerm('');
      } else {
        console.error('Accepted bids API response format error:', response.data);
        setApprovedRates([]);
      }
    } catch (error) {
      console.error('Error fetching accepted bids:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      });
      setApprovedRates([]);
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
  console.log('Filtering rates. Total approvedRates:', approvedRates.length, 'Search term:', searchTerm);
  const filteredRates = approvedRates.filter(rate => {
    const matches = rate.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rate.shipmentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rate.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rate.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rate.truckerName.toLowerCase().includes(searchTerm.toLowerCase());

    if (searchTerm && matches) {
      console.log('Rate matches search:', rate.id, rate.truckerName);
    }
    return matches;
  });
  console.log('Filtered rates count:', filteredRates.length);
  // Add after fetchApprovedRates function
  const fetchPendingApprovals = async () => {
    try {
      console.log('Fetching pending approvals from:', `${API_CONFIG.BASE_URL}/api/v1/bid/pending-intermediate-approval`);

      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/bid/pending-intermediate-approval`, {
        timeout: 10000,
        headers: API_CONFIG.getAuthHeaders()
      });

      if (response.data && response.data.success) {
        const transformedRates = response.data.bids.map(bid => ({
          id: `RA-${bid._id.slice(-6)}`,
          rateNum: bid._id,
          shipmentNumber: bid.load?.shipmentNumber || 'N/A',
          origin: bid.load ? `${bid.load.origin?.city || 'N/A'}, ${bid.load.origin?.state || 'N/A'}` : 'N/A, N/A',
          destination: bid.load ? `${bid.load.destination?.city || 'N/A'}, ${bid.load.destination?.state || 'N/A'}` : 'N/A, N/A',
          rate: bid.rate,
          truckerName: bid.carrier?.compName || 'N/A',
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

  // Add after fetchPendingApprovals function
  const fetchPendingBidsBySalesUser = async (salesUserId = '1234') => {
    try {
      console.log('Fetching pending bids for sales user:', salesUserId);

      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/bid/pending-by-sales-user/${salesUserId}`, {
        timeout: 10000,
        headers: API_CONFIG.getAuthHeaders()
      });

      if (response.data && response.data.success) {
        const transformedBids = response.data.bids.map(bid => ({
          id: `BID-${bid._id.slice(-6)}`,
          rateNum: bid._id,
          shipmentNumber: bid.load?.shipmentNumber || 'N/A',
          origin: bid.load ? `${bid.load.origin?.city || 'N/A'}, ${bid.load.origin?.state || 'N/A'}` : 'N/A, N/A',
          destination: bid.load ? `${bid.load.destination?.city || 'N/A'}, ${bid.load.destination?.state || 'N/A'}` : 'N/A, N/A',
          rate: bid.rate,
          truckerName: bid.carrier?.compName || 'N/A',
          status: 'pending',
          createdAt: new Date(bid.createdAt).toISOString().split('T')[0],
          createdBy: `Sales User ${bid.load?.createdBySalesUser?.empName || 'Unknown'} (${bid.load?.createdBySalesUser?.empId || 'N/A'})`,
          docUpload: bid.doDocument || 'sample-doc.jpg',
          remarks: bid.message || '',
          // Additional fields from the new API
          carrierInfo: {
            mcDotNo: bid.carrier?.mc_dot_no || 'N/A',
            email: bid.carrier?.email || 'N/A',
            phone: bid.carrier?.phoneNo || 'N/A',
            fleetSize: bid.carrier?.fleetsize || 'N/A',
            state: bid.carrier?.state || 'N/A',
            city: bid.carrier?.city || 'N/A'
          },
          loadInfo: {
            weight: bid.load?.weight || 0,
            commodity: bid.load?.commodity || 'N/A',
            vehicleType: bid.load?.vehicleType || 'N/A',
            pickupDate: bid.load?.pickupDate || 'N/A',
            deliveryDate: bid.load?.deliveryDate || 'N/A',
            originalRate: bid.load?.rate || 0
          },
          estimatedPickup: new Date(bid.estimatedPickupDate).toLocaleDateString(),
          estimatedDelivery: new Date(bid.estimatedDeliveryDate).toLocaleDateString(),
          placedByInhouseUser: bid.placedByInhouseUser,
          salesUserInfo: bid.load?.createdBySalesUser
        }));

        console.log('Transformed pending bids:', transformedBids);
        return transformedBids;
      }
      return [];
    } catch (error) {
      console.error('Error fetching pending bids by sales user:', error);
      return [];
    }
  };
  // Define fetchAllData at the component level
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [approvedData, pendingData, salesUserBids] = await Promise.all([
        fetchApprovedRates(),
        fetchPendingApprovals(),
        fetchPendingBidsBySalesUser(salesUserId) // Use state variable
      ]);

      // Combine all datasets
      const combinedRates = [
        ...(approvedData || []),
        ...(pendingData || []),
        ...(salesUserBids || [])
      ];

      // Remove duplicates based on bid ID (rateNum)
      const uniqueRates = combinedRates.filter((rate, index, self) =>
        index === self.findIndex(r => r.rateNum === rate.rateNum)
      );

      console.log('Combined rates before deduplication:', combinedRates.length);
      console.log('Unique rates after deduplication:', uniqueRates.length);

      setApprovedRates(uniqueRates);
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
      console.log('Approving bid with custom rate:', { bidId, customRate });

      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/bid/intermediate/${bidId}/approve`, {
        intermediateRate: parseInt(customRate)
      }, {
        headers: API_CONFIG.getAuthHeaders()
      });

      console.log('Manual approval response:', response.data);

      if (response.data.success) {
        alertify.success('✅ Bid approved successfully with custom rate!');
        await fetchAllData(); // Refresh the data
      } else {
        alertify.error(response.data.message || 'Failed to approve bid');
      }
    } catch (error) {
      console.error('Manual approve error:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      alertify.error(error.response?.data?.message || 'Error approving bid. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [bidId]: null }));
    }
  };


  const handleAutoApprove = async (bidId) => {
    setActionLoading(prev => ({ ...prev, [bidId]: 'auto' }));
    try {
      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/bid/intermediate/${bidId}/auto-approve`, {}, {
        headers: API_CONFIG.getAuthHeaders()
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
    if (activeTab === 'pending') {
      fetchAllData();
    } else if (activeTab === 'completed') {
      fetchCompletedRates();
    } else if (activeTab === 'accepted') {
      fetchAcceptedBids();
    }
  }, [activeTab]);
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle accept bid form input changes
  const handleAcceptBidInputChange = (e) => {
    const { name, value } = e.target;
    setAcceptBidForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCustomerSelect = (e) => {
    const selectedCustomerId = e.target.value;
    const selectedCustomer = customers.find(c => c.value === selectedCustomerId);

    if (selectedCustomer) {
      const customer = selectedCustomer.customer;
      setAcceptBidForm(prev => ({
        ...prev,
        customerName: selectedCustomerId,
        fullAddress: `${customer.city}, ${customer.state}, ${customer.country}`
      }));
    }
  };

  // Handle file upload
  const handleFileChange = (e) => {
    setFormData(prev => ({
      ...prev,
      docs: e.target.files[0]
    }));
  };

  // Handle accept bid form submission
  const handleAcceptBidSubmit = async (e) => {
    e.preventDefault();

    // --- front-end validation ---
    const errs = {};
    if (!acceptBidForm.customerName) {
      errs.customerName = 'Please select the customer name.';
    }
    if (!acceptBidForm.fullAddress) {
      errs.fullAddress = 'Please enter the full address.';
    } else if (!alphaOnly.test(acceptBidForm.fullAddress.trim())) {
      errs.fullAddress = 'Full address should contain alphabets only.';
    }

    if (acceptBidForm.status && !alphaNum.test(acceptBidForm.status.trim())) {
      errs.status = 'Status should be alphanumeric.';
    }
    if (acceptBidForm.shipmentNumber && !alphaNum.test(acceptBidForm.shipmentNumber.trim())) {
      errs.shipmentNumber = 'Shipment Number should be alphanumeric.';
    }
    if (acceptBidForm.poNumber && !alphaNum.test(acceptBidForm.poNumber.trim())) {
      errs.poNumber = 'PO Number should be alphanumeric.';
    }
    if (acceptBidForm.bolNumber && !alphaNum.test(acceptBidForm.bolNumber.trim())) {
      errs.bolNumber = 'BOL Number should be alphanumeric.';
    }

    setAcceptErrors(errs);
    if (Object.keys(errs).length) {
      // also toast first error
      alertify.error(Object.values(errs)[0]);
      return;
    }

    try {
      setAcceptSubmitting(true);

      const submitData = {
        status: acceptBidForm.status || undefined,  // user-entered; optional
        shipperId: acceptBidForm.customerName,
        shipmentNumber: acceptBidForm.shipmentNumber || undefined,
        poNumber: acceptBidForm.poNumber || undefined,
        bolNumber: acceptBidForm.bolNumber || undefined,
        reason: acceptBidForm.message || undefined
      };
      Object.keys(submitData).forEach(k => submitData[k] === undefined && delete submitData[k]);

      const response = await axios.put(
        `${API_CONFIG.BASE_URL}/api/v1/bid/${acceptBidModal.rate.rateNum}/accept-by-inhouse`,
        submitData,
        { headers: API_CONFIG.getAuthHeaders(), timeout: 10000 }
      );

      if (response.data && response.data.success) {
        alertify.success('Bid accpted successfully.');
        setAcceptBidModal({ visible: false, rate: null });
        setAcceptBidForm({
          customerName: '', fullAddress: '', status: '',
          shipmentNumber: '', poNumber: '', bolNumber: '', message: ''
        });
        await fetchCompletedRates();  // refresh table
      } else {
        alertify.error(response.data?.message || 'Failed to accept bid. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting accept bid:', error);
      alertify.error(error.response?.data?.message || 'Error accepting bid. Please try again.');
    } finally {
      setAcceptSubmitting(false);
    }
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
        headers: API_CONFIG.getAuthHeaders()
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

  // Handle view bid details
  const handleViewBid = (rate) => {
    setSelectedRate(rate);
    setViewDoc(true);
  };

  // Handle accept bid
  const handleAcceptBid = async (rate) => {
    try {
      setAcceptBidModal({ visible: true, rate });
      await fetchCustomers();
      const sn = (rate.shipmentNumber && rate.shipmentNumber !== 'N/A') ? rate.shipmentNumber : '';
      setAcceptBidForm({
        customerName: '',
        fullAddress: '',
        status: '',                 // placeholder should show "Enter the status"
        shipmentNumber: sn,         // no "N/A"
        poNumber: '',
        bolNumber: '',
        message: ''                 // no default text
      });
      setAcceptErrors({ customerName: '', fullAddress: '', status: '', shipmentNumber: '', poNumber: '', bolNumber: '' });
    } catch (e) {
      alertify.error('Error opening accept bid form. Please try again.');
    }
  };


  // Loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading bids and rates...</p>
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

  // Accept Bid Modal
  if (acceptBidModal.visible) {
    return (
      <div className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex justify-center items-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
          `}</style>
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-t-3xl">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Accept Bid</h2>
                  <p className="text-green-100">Accept and process the selected bid</p>
                </div>
              </div>
              <button
                onClick={() => setAcceptBidModal({ visible: false, rate: null })}
                className="text-white hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>
          </div>

          {/* Form */}
          <form noValidate onSubmit={handleAcceptBidSubmit} className="p-6 space-y-6">
            {/* Customer Information Section */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-4">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Name *
                  </label>
                  <select
                    name="customerName"
                    value={acceptBidForm.customerName}
                    onChange={(e) => {
                      handleCustomerSelect(e);
                      setAcceptErrors(prev => ({ ...prev, customerName: '' }));
                    }}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">Select a customer</option>
                    {customersLoading ? (
                      <option value="" disabled>Loading customers...</option>
                    ) : customers.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  {acceptErrors.customerName && <p className="mt-1 text-xs text-red-600">{acceptErrors.customerName}</p>}

                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Address *
                  </label>
                  <input
                    type="text"
                    name="fullAddress"
                    value={acceptBidForm.fullAddress}
                    onChange={(e) => {
                      const cleaned = sanitizeAlpha(e.target.value);
                      setAcceptBidForm(prev => ({ ...prev, fullAddress: cleaned }));
                      setAcceptErrors(prev => ({ ...prev, fullAddress: '' }));
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData('text') || '';
                      const cleaned = sanitizeAlpha(pasted);
                      setAcceptBidForm(prev => ({ ...prev, fullAddress: cleaned }));
                    }}
                    required
                    placeholder="Enter full address"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    pattern="[A-Za-z\s]+"
                    title="Only alphabets are allowed"
                  />
                  {acceptErrors.fullAddress && (
                    <p className="mt-1 text-xs text-red-600">{acceptErrors.fullAddress}</p>
                  )}


                </div>
              </div>
            </div>

            {/* Order Details Section */}
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-800 mb-4">Order Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
  Status *
</label>
<select
  name="status"
  value={acceptBidForm.status}
  onChange={(e) => {
    setAcceptBidForm(prev => ({ ...prev, status: e.target.value }));
    setAcceptErrors(prev => ({ ...prev, status: '' }));
  }}
  required
  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
>
  <option value="Accepted">Accepted</option>
  <option value="Rejected">Rejected</option>
</select>
{acceptErrors.status && <p className="mt-1 text-xs text-red-600">{acceptErrors.status}</p>}


                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shipment Number
                  </label>
                  <input
                    type="text"
                    name="shipmentNumber"
                    value={acceptBidForm.shipmentNumber}
                    onChange={(e) => {
                      setFormFieldSanitized('shipmentNumber', e.target.value, 'alnum');
                      setAcceptErrors(prev => ({ ...prev, shipmentNumber: '' }));
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      setFormFieldSanitized('shipmentNumber', (e.clipboardData.getData('text') || ''), 'alnum');
                    }}
                    inputMode="text"
                    placeholder="Enter the Shipment Number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    pattern="[A-Za-z0-9]+"
                    title="Only alphanumeric characters are allowed"
                  />

                  {acceptErrors.shipmentNumber && <p className="mt-1 text-xs text-red-600">{acceptErrors.shipmentNumber}</p>}

                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PO Number
                  </label>
                  <input
                    type="text"
                    name="poNumber"
                    value={acceptBidForm.poNumber}
                    onChange={(e) => {
                      setFormFieldSanitized('poNumber', e.target.value, 'alnum');
                      setAcceptErrors(prev => ({ ...prev, poNumber: '' }));
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      setFormFieldSanitized('poNumber', (e.clipboardData.getData('text') || ''), 'alnum');
                    }}
                    inputMode="text"
                    placeholder="Enter PO number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    pattern="[A-Za-z0-9]+"
                    title="Only alphanumeric characters are allowed"
                  />

                  {acceptErrors.poNumber && <p className="mt-1 text-xs text-red-600">{acceptErrors.poNumber}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    BOL Number
                  </label>

                  <input
                    type="text"
                    name="bolNumber"
                    value={acceptBidForm.bolNumber}
                    onChange={(e) => {
                      setFormFieldSanitized('bolNumber', e.target.value, 'alnum');
                      setAcceptErrors(prev => ({ ...prev, bolNumber: '' }));
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      setFormFieldSanitized('bolNumber', (e.clipboardData.getData('text') || ''), 'alnum');
                    }}
                    inputMode="text"
                    placeholder="Enter BOL number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    pattern="[A-Za-z0-9]+"
                    title="Only alphanumeric characters are allowed"
                  />

                  {acceptErrors.bolNumber && <p className="mt-1 text-xs text-red-600">{acceptErrors.bolNumber}</p>}
                </div>
              </div>
            </div>

            {/* Additional Information Section */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800 mb-4">Additional Information</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  name="message"
                  value={acceptBidForm.message}
                  onChange={handleAcceptBidInputChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter any additional message or notes"
                />
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setAcceptBidModal({ visible: false, rate: null })}
                className="px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={acceptSubmitting}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {acceptSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </span>
                ) : (
                  'Accept Bid'
                )}
              </button>

            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Tabs */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${activeTab === 'pending'
            ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg'
            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
        >
          <div className="flex items-center gap-2">
            <Clock size={18} />
            <span>Pending Bids</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${activeTab === 'completed'
            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle size={18} />
            <span>Approved Rates</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('accepted')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${activeTab === 'accepted'
            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle size={18} />
            <span>Accepted Bids</span>
          </div>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'pending' && (
        <div>
          {/* Pending Bids Content */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-6">
              <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <Clock className="text-yellow-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Pending Bids</p>
                    <p className="text-xl font-bold text-gray-800">{approvedRates.filter(rate => rate.status === 'pending').length}</p>
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
                  placeholder="Search pending bids..."
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
                      <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Bid ID</th>
                      <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Origin</th>
                      <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Destination</th>
                      <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Rate</th>
                      <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Trucker</th>
                      <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
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
                          <div>
                            <span className="font-medium text-gray-700">{rate.origin}</span>
                            <p className="text-xs text-gray-500">{rate.origin.split(', ')[1] || ''}</p>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div>
                            <span className="font-medium text-gray-700">{rate.destination}</span>
                            <p className="text-xs text-gray-500">{rate.destination.split(', ')[1] || ''}</p>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-bold text-green-600">${rate.rate.toLocaleString()}</span>
                        </td>
                        <td className="py-2 px-3">
                          <div>
                            <p className="font-medium text-gray-700">{rate.truckerName}</p>
                            {rate.carrierInfo && (
                              <p className="text-xs text-gray-500">MC: {rate.carrierInfo.mcDotNo}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${statusColor(rate.status)}`}>
                            {rate.status === 'approved' && <CheckCircle size={12} />}
                            {rate.status === 'rejected' && <XCircle size={12} />}
                            {rate.status === 'pending' && <Clock size={12} />}
                            {rate.status || 'Pending'}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex gap-2">
                            {/* Manual Approve Button */}
                            <button
                              onClick={() => {
                                console.log('Approve button clicked for rate:', rate);
                                setApprovalModal({ visible: true, type: 'manual', rate });
                              }}
                              disabled={actionLoading[rate.rateNum]}
                              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 ${actionLoading[rate.rateNum] === 'manual'
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                                : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:from-green-600 hover:to-emerald-700 hover:shadow-xl'
                                }`}
                            >
                              {actionLoading[rate.rateNum] === 'manual' ? (
                                <span className="flex items-center gap-2">
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>Approving...</span>
                                </span>
                              ) : (
                                <>
                                  <CheckCircle size={12} className="animate-pulse" />
                                  <span>Approve</span>
                                </>
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
                    {searchTerm ? 'No pending bids found matching your search' : 'No pending bids found'}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {searchTerm ? 'Try adjusting your search terms' : 'All bids have been processed'}
                  </p>
                </div>
              )}
            </div>
          )}



          {/* Enhanced Pagination */}
          {totalPages > 1 && filteredRates.length > 0 && (
            <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredRates.length)} of {filteredRates.length} pending bids
                {searchTerm && ` (filtered from ${approvedRates.length} total)`}
              </div>

              <div className="flex items-center gap-2 bg-white rounded-xl shadow-lg border border-gray-200 p-2">
                {/* Previous Button */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {/* First Page */}
                  {currentPage > 3 && (
                    <>
                      <button
                        onClick={() => handlePageChange(1)}
                        className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all duration-200"
                      >
                        1
                      </button>
                      {currentPage > 4 && (
                        <span className="px-2 text-gray-400">...</span>
                      )}
                    </>
                  )}

                  {/* Current Page Range */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      if (totalPages <= 7) return true;
                      if (currentPage <= 4) return page <= 5;
                      if (currentPage >= totalPages - 3) return page >= totalPages - 4;
                      return page >= currentPage - 2 && page <= currentPage + 2;
                    })
                    .map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${currentPage === page
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                          : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                          }`}
                      >
                        {page}
                      </button>
                    ))}

                  {/* Last Page */}
                  {currentPage < totalPages - 2 && totalPages > 7 && (
                    <>
                      {currentPage < totalPages - 3 && (
                        <span className="px-2 text-gray-400">...</span>
                      )}
                      <button
                        onClick={() => handlePageChange(totalPages)}
                        className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all duration-200"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>

                {/* Next Button */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  Next
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Completed Rates Tab Content */}
      {activeTab === 'completed' && (
        <div>
          {/* Completed Rates Content */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-6">
              <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="text-green-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Completed</p>
                    <p className="text-xl font-bold text-gray-800">{approvedRates.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Calendar className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Today's Completed</p>
                    <p className="text-xl font-bold text-blue-600">{approvedRates.filter(rate => rate.createdAt === new Date().toISOString().split('T')[0]).length}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search completed rates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                  <tr>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Bid ID</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Origin</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Destination</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Original Rate</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Intermediate Rate</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Trucker</th>
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
                        <div>
                          <span className="font-medium text-gray-700">{rate.origin}</span>
                          <p className="text-xs text-gray-500">{rate.origin.split(', ')[1] || ''}</p>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div>
                          <span className="font-medium text-gray-700">{rate.destination}</span>
                          <p className="text-xs text-gray-500">{rate.destination.split(', ')[1] || ''}</p>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-bold text-blue-600">${rate.originalRate?.toLocaleString() || '0'}</span>
                      </td>
                      <td className="py-2 px-3">
                        <div>
                          <span className="font-bold text-green-600">${rate.intermediateRate?.toLocaleString() || '0'}</span>
                          {rate.approvalStatus && (
                            <p className="text-xs text-gray-500">
                              Diff: ${rate.approvalStatus.rateDifference} ({rate.approvalStatus.rateDifferencePercentage}%)
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div>
                          <p className="font-medium text-gray-700">{rate.truckerName}</p>
                          {rate.carrierInfo && (
                            <p className="text-xs text-gray-500">MC: {rate.carrierInfo.mcDotNo}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptBid(rate)}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:from-green-600 hover:to-emerald-700 hover:shadow-xl"
                          >
                            <CheckCircle size={12} />
                            <span>Accept Bid</span>
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
                <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  {searchTerm ? 'No completed rates found matching your search' : 'No completed rates found'}
                </p>
                <p className="text-gray-400 text-sm">
                  {searchTerm ? 'Try adjusting your search terms' : 'No rates have been completed yet'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Accepted Bids Tab Content */}
      {activeTab === 'accepted' && (
        <div>
          {/* Accepted Bids Content */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-6">
              <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Accepted</p>
                    <p className="text-xl font-bold text-gray-800">{approvedRates.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <Calendar className="text-green-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Today's Accepted</p>
                    <p className="text-xl font-bold text-green-600">{approvedRates.filter(rate => rate.acceptedAt === new Date().toISOString().split('T')[0]).length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="text-purple-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Value</p>
                    <p className="text-xl font-bold text-purple-600">${approvedRates.reduce((sum, rate) => sum + (rate.rate || 0), 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search accepted bids..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                  <tr>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Bid ID</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Origin</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Destination</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Original Rate</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Intermediate Rate</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Trucker</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Accepted By</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRates.map((rate, index) => (
                    <tr key={rate.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-700">{rate.id}</span>
                      </td>
                      <td className="py-2 px-3">
                        <div>
                          <span className="font-medium text-gray-700">{rate.origin}</span>
                          <p className="text-xs text-gray-500">{rate.origin.split(', ')[1] || ''}</p>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div>
                          <span className="font-medium text-gray-700">{rate.destination}</span>
                          <p className="text-xs text-gray-500">{rate.destination.split(', ')[1] || ''}</p>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-bold text-blue-600">${rate.originalRate?.toLocaleString() || '0'}</span>
                      </td>
                      <td className="py-2 px-3">
                        <div>
                          <span className="font-bold text-green-600">${rate.intermediateRate?.toLocaleString() || '0'}</span>
                          {rate.rateDifference && (
                            <p className="text-xs text-gray-500">
                              Diff: ${rate.rateDifference} ({rate.rateDifferencePercentage}%)
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div>
                          <p className="font-medium text-gray-700">{rate.truckerName}</p>
                          {rate.carrierInfo && (
                            <p className="text-xs text-gray-500">MC: {rate.carrierInfo.mcDotNo}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div>
                          <p className="font-medium text-gray-700">{rate.createdBy}</p>
                          <p className="text-xs text-gray-500">{rate.acceptedAt || rate.createdAt}</p>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredRates.length === 0 && (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  {searchTerm ? 'No accepted bids found matching your search' : 'No accepted bids found'}
                </p>
                <p className="text-gray-400 text-sm">
                  {searchTerm ? 'Try adjusting your search terms' : 'No bids have been accepted yet'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Pagination */}
      {totalPages > 1 && filteredRates.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredRates.length)} of {filteredRates.length} bids/rates
            {searchTerm && ` (filtered from ${approvedRates.length} total)`}
          </div>

          <div className="flex items-center gap-2 bg-white rounded-xl shadow-lg border border-gray-200 p-2">
            {/* Previous Button */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {/* First Page */}
              {currentPage > 3 && (
                <>
                  <button
                    onClick={() => handlePageChange(1)}
                    className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all duration-200"
                  >
                    1
                  </button>
                  {currentPage > 4 && (
                    <span className="px-2 text-gray-400">...</span>
                  )}
                </>
              )}

              {/* Current Page Range */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  if (totalPages <= 7) return true;
                  if (currentPage <= 4) return page <= 5;
                  if (currentPage >= totalPages - 3) return page >= totalPages - 4;
                  return page >= currentPage - 2 && page <= currentPage + 2;
                })
                .map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${currentPage === page
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                  >
                    {page}
                  </button>
                ))}

              {/* Last Page */}
              {currentPage < totalPages - 2 && totalPages > 7 && (
                <>
                  {currentPage < totalPages - 3 && (
                    <span className="px-2 text-gray-400">...</span>
                  )}
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all duration-200"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            {/* Next Button */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
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

      {/* Approval Modal - Moved to root level */}
      {console.log('Modal state:', approvalModal)}
      {approvalModal.visible && (
        <div className="fixed inset-0 z-[9999] backdrop-blur-sm bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden">
            {/* Header with gradient */}
            <div className={`p-6 text-white ${approvalModal.type === 'manual' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-blue-500 to-purple-600'}`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    {approvalModal.type === 'manual' ? (
                      <CheckCircle className="text-white" size={24} />
                    ) : (
                      <Clock className="text-white" size={24} />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      {approvalModal.type === 'manual' ? 'Bid Approval' : 'Auto Approval'}
                    </h2>
                    <p className="text-white/80 text-sm">
                      {approvalModal.type === 'manual' ? 'Set custom rate for approval' : 'Approve with original rate'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setApprovalModal({ visible: false, type: null, rate: null })}
                  className="text-white hover:text-gray-200 text-2xl font-bold transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Rate Information Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Bid ID</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{approvalModal.rate.id}</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Trucker</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{approvalModal.rate.truckerName}</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Origin</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{approvalModal.rate.origin}</p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Destination</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{approvalModal.rate.destination}</p>
                </div>
              </div>

              {/* Rate Input Section */}
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="text-green-600" size={18} />
                  <label className="text-sm font-semibold text-gray-700">
                    {approvalModal.type === 'manual'
                      ? 'Custom Rate Amount *'         // <- star added
                      : 'Original Rate Amount'}
                  </label>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">$</span>
                  <input
                    type="number"
                    required={approvalModal.type === 'manual'}  // <- required
                    min={1}                                     // <- client-side guard
                    step="1"
                    className={`w-full pl-8 pr-4 py-3 border-2 rounded-lg text-lg font-semibold transition-all duration-200 ${approvalModal.type === 'manual'
                      ? 'border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-100'
                      : 'border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50'
                      }`}
                    value={approvalModal.rate.rate ?? ''}       // safe value
                    readOnly={approvalModal.type === 'auto'}
                    onChange={(e) => {
                      if (approvalModal.type === 'manual') {
                        const v = e.target.value === '' ? '' : Number(e.target.value);
                        setApprovalModal(prev => ({
                          ...prev,
                          rate: { ...prev.rate, rate: v }
                        }));
                        setApprovalError('');                   // clear error on typing
                      }
                    }}
                    placeholder="Enter rate amount"
                  />
                </div>

                {/* helper error line */}
                {approvalError && (
                  <p className="mt-2 text-xs font-medium text-red-600">{approvalError}</p>
                )}

                {approvalModal.type === 'auto' && (
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <Clock size={12} />
                    Auto-approval uses the original bid rate
                  </p>
                )}
              </div>


              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setApprovalModal({ visible: false, type: null, rate: null })}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all duration-200 hover:border-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (approvalModal.type === 'manual') {
                      const val = Number(approvalModal.rate?.rate);
                      if (!Number.isFinite(val) || val <= 0) {
                        setApprovalError('Please enter the Custom Rate Amount more than 0.');
                        alertify.error('Please enter the Custom Rate Amount more than 0.');
                        return;                                   // block submit
                      }
                      await handleManualApprove(approvalModal.rate.rateNum, val);
                    } else {
                      await handleAutoApprove(approvalModal.rate.rateNum);
                    }
                    setApprovalModal({ visible: false, type: null, rate: null });
                  }}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-105 ${approvalModal.type === 'manual'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl'
                    : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl'
                    }`}
                >
                  {approvalModal.type === 'manual' ? 'Approve Bid' : 'Auto Approve'}
                </button>

              </div>
            </div>
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
    </div>
  );
}