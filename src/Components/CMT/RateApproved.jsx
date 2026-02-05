import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { FaArrowLeft, FaDownload } from 'react-icons/fa';
import { User, Mail, Phone, Building, FileText, CheckCircle, XCircle, Clock, PlusCircle, MapPin, Truck, Calendar, DollarSign, Search, MessageCircle, RefreshCw } from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import PendingBids from './PendingBids.jsx';
import LoadChatModalCMT from './LoadChatModalCMT.jsx';

const alphaOnly = /^[A-Za-z\s]+$/;            // alphabets + space
const alphaNum = /^[A-Za-z0-9\s-]+$/;        // letters, numbers, space, dash
// Sanitizers
const sanitizeAlphaNum = (v) => (v || '').replace(/[^a-zA-Z0-9]/g, ''); // A-Z a-z 0-9 only
const sanitizeAlpha = (v) => (v || '').replace(/[^a-zA-Z\s]/g, '').replace(/\s{2,}/g, ' '); // alphabets + single spaces

export default function RateApproved() {
  const [pendingRates, setPendingRates] = useState([]);
  const [completedRates, setCompletedRates] = useState([]);
  const [acceptedRates, setAcceptedRates] = useState([]);
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
  const [marginAmount, setMarginAmount] = useState(0);
  const [editableMessage, setEditableMessage] = useState('');
  const [finalPriceMode, setFinalPriceMode] = useState(false);
  const [finalPriceAmount, setFinalPriceAmount] = useState(0);

  // Manager approved bids state
  const [managerApprovedBids, setManagerApprovedBids] = useState([]);
  const [managerRejectedBids, setManagerRejectedBids] = useState([]);
  const [managerBidsLoading, setManagerBidsLoading] = useState(false);
  const [tabCounts, setTabCounts] = useState({
    pending: 0,
    approved: 0,
    accepted: 0,
    managerApproved: 0,
    managerRejected: 0
  });

  // Final Price Modal State for rejected bids
  const [finalPriceModal, setFinalPriceModal] = useState({
    visible: false,
    bid: null
  });
  const [finalPriceModalAmount, setFinalPriceModalAmount] = useState(0);
  const [finalPriceModalMessage, setFinalPriceModalMessage] = useState('');

  // Accept Bid Modal State
  const [acceptBidModal, setAcceptBidModal] = useState({
    visible: false,
    rate: null
  });

  // Negotiate Bid Modal State
  const [negotiateBidModal, setNegotiateBidModal] = useState({
    visible: false,
    rate: null
  });

  // Negotiate Bid Form Data
  const [negotiateBidForm, setNegotiateBidForm] = useState({
    inhouseCounterRate: '',
    message: ''
  });

  // Negotiate form state
  const [negotiateSubmitting, setNegotiateSubmitting] = useState(false);
  const [negotiateErrors, setNegotiateErrors] = useState({
    inhouseCounterRate: '',
    message: ''
  });

  // Negotiation history state
  const [negotiationHistory, setNegotiationHistory] = useState([]);
  const [negotiationHistoryLoading, setNegotiationHistoryLoading] = useState(false);
  const [chatContainerRef, setChatContainerRef] = useState(null);
  const prevHistoryLengthRef = useRef(0);
  const lastProcessedMessageIdRef = useRef(null);

  // Chat Modal State
  const [chatModal, setChatModal] = useState({
    visible: false,
    loadId: null,
    receiverEmpId: null,
    receiverName: null
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
  
  // Accept form state
  const [acceptSubmitting, setAcceptSubmitting] = useState(false);
  const [acceptErrors, setAcceptErrors] = useState({
    customerName: '',
    fullAddress: '',
    status: '',
    shipmentNumber: '',
    poNumber: '',
    bolNumber: ''
  });

  // Customer search state
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [salesUserId, setSalesUserId] = useState(''); // Will be set from sessionStorage
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'completed', 'accepted', 'manager-approved', or 'manager-rejected'
  const [pendingLoaded, setPendingLoaded] = useState(false);
  const [completedLoaded, setCompletedLoaded] = useState(false);
  const [acceptedLoaded, setAcceptedLoaded] = useState(false);
  const [managerApprovedLoaded, setManagerApprovedLoaded] = useState(false);
  const [managerRejectedLoaded, setManagerRejectedLoaded] = useState(false);
  const [initialPrefetchDone, setInitialPrefetchDone] = useState(false);
  const [tabSwitchingLoading, setTabSwitchingLoading] = useState(false);

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

    return [];
  };

  // Fetch completed rates from new API endpoint
  const fetchCustomers = async () => {
    try {
      setCustomersLoading(true);
      const userEmpId = salesUserId || sessionStorage.getItem('empId') || localStorage.getItem('empId');

      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/shipper_driver/department/customers/${userEmpId}`, {
        timeout: 10000,
        headers: API_CONFIG.getAuthHeaders()
      });

      if (response.data && response.data.success) {
        const customerOptions = response.data.customers.map(customer => ({
          value: customer._id,
          label: `${customer.compName} (${customer.mc_dot_no})`,
          customer: customer
        }));
        setCustomers(customerOptions);

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

  const fetchCompletedRates = async ({ withLoading = true } = {}) => {
    try {
      if (withLoading) {
        setLoading(true);
      }
      const userEmpId = salesUserId || sessionStorage.getItem('empId') || localStorage.getItem('empId');

      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/bid/pending/emp/${userEmpId}`, {
        timeout: 10000,
        headers: API_CONFIG.getAuthHeaders()
      });

      if (response.data && (response.data.success || response.data.bids || response.data.data)) {
        console.log('Completed Rates Response:', response.data);
        const bidsData = response.data.bids || response.data.data?.bids || [];
        
        // Transform API data to match our component structure
        const transformedRates = bidsData.map(bid => ({
          id: `BID-${bid._id.slice(-6)}`,
          rateNum: bid._id,
          loadId: bid.load?._id ? `L-${bid.load._id.slice(-5)}` : 'N/A',
          shipmentNumber: bid.load?.shipmentNumber || 'N/A',
          origin: bid.load ? (() => {
            if (bid.load.origin && bid.load.origin.city) {
              return `${bid.load.origin.city}, ${bid.load.origin.state || 'N/A'}`;
            }
            if (bid.load.origins && bid.load.origins.length > 0) {
              return `${bid.load.origins[0].city}, ${bid.load.origins[0].state || 'N/A'}`;
            }
            return 'N/A, N/A';
          })() : 'N/A, N/A',
          destination: bid.load ? (() => {
            if (bid.load.destination && bid.load.destination.city) {
              return `${bid.load.destination.city}, ${bid.load.destination.state || 'N/A'}`;
            }
            if (bid.load.destinations && bid.load.destinations.length > 0) {
              return `${bid.load.destinations[0].city}, ${bid.load.destinations[0].state || 'N/A'}`;
            }
            return 'N/A, N/A';
          })() : 'N/A, N/A',
          // Add return address fields
          returnAddress: bid.load?.returnAddress || bid.returnAddress || null,
          returnCity: bid.load?.returnCity || bid.returnCity || null,
          returnState: bid.load?.returnState || bid.returnState || null,
          returnZip: bid.load?.returnZip || bid.returnZip || null,
          originalRate: bid.originalRate || bid.load?.rate || 0,
          intermediateRate: bid.intermediateRate || 0,
          rate: bid.intermediateRate || bid.originalRate || 0,
          truckerName: bid.carrier?.compName || 'N/A',
          status: bid.status || 'pending',
          createdAt: new Date(bid.createdAt).toISOString().split('T')[0],
          createdBy: `Employee ${bid.approvedByinhouseUser?.empId || salesUserId || 'Unknown'}`,
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
          // Add shipper info for the new column
          shipperInfo: bid.load?.shipper || null,
          shipperName: bid.load?.shipper?.compName || 'N/A',
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
          // Add attachment field for popup display
          attachment: bid.attachment || null,
          intermediateApprovedAt: bid.intermediateApprovedAt
        }));


        setCompletedRates(transformedRates);
        setTabCounts(prev => ({ ...prev, approved: transformedRates.length }));

        // Force a re-render by updating the search term
        setSearchTerm('');
      } else {
        console.error('Completed rates API response format error:', response.data);
        setCompletedRates([]);
        setTabCounts(prev => ({ ...prev, approved: 0 }));
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
      setCompletedRates([]);
      setTabCounts(prev => ({ ...prev, approved: 0 }));
    } finally {
      if (withLoading) {
        setLoading(false);
      }
      setCompletedLoaded(true);
    }
  };

  // Fetch manager approved bids
  const fetchManagerApprovedBids = async () => {
    try {
      setManagerBidsLoading(true);
      const userEmpId = sessionStorage.getItem('empId') || localStorage.getItem('empId');

      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/bid/sales/manager-accepted`, {
        timeout: 10000,
        headers: API_CONFIG.getAuthHeaders()
      });

      if (response.data && (response.data.success || response.data.bids || response.data.data)) {
        console.log('Manager Approved Response:', response.data);
        const bidsData = response.data.bids || response.data.data?.bids || [];
        const transformedBids = bidsData.map(bid => ({
          id: `BID-${bid._id.slice(-6)}`,
          rateNum: bid._id,
          loadId: bid.load?._id ? `L-${bid.load._id.slice(-5)}` : 'N/A',
          shipmentNumber: bid.load?.shipmentNumber || 'N/A',
          origin: bid.origins && bid.origins.length > 0 
            ? `${bid.origins[0].city || bid.origins[0].extractedCity || 'N/A'}, ${bid.origins[0].state || 'N/A'}`
            : bid.load?.origins && bid.load.origins.length > 0
            ? `${bid.load.origins[0].city || bid.load.origins[0].extractedCity || 'N/A'}, ${bid.load.origins[0].state || 'N/A'}`
            : 'N/A, N/A',
          destination: bid.destinations && bid.destinations.length > 0
            ? `${bid.destinations[0].city || bid.destinations[0].extractedCity || 'N/A'}, ${bid.destinations[0].state || 'N/A'}`
            : bid.load?.destinations && bid.load.destinations.length > 0
            ? `${bid.load.destinations[0].city || bid.load.destinations[0].extractedCity || 'N/A'}, ${bid.load.destinations[0].state || 'N/A'}`
            : 'N/A, N/A',
          originalRate: bid.originalRate || bid.originalLoadRate || bid.load?.rateDetails?.totalRates || 0,
          currentRate: bid.currentRate || bid.finalCharges || 0,
          thresholdRate: bid.thresholdRate || 0,
          rateDifference: bid.rateDifference || 0,
          rateDifferencePercentage: bid.rateDifferencePercentage || '0',
          truckerName: bid.carrier?.compName || 'N/A',
          shipperName: bid.shipper?.compName || 'N/A',
          status: 'manager-approved',
          createdAt: new Date(bid.createdAt).toISOString().split('T')[0],
          approvedAt: bid.managerApproval?.approvedAt ? new Date(bid.managerApproval.approvedAt).toISOString().split('T')[0] : 'N/A',
          approvedBy: bid.managerApproval?.approvedBy?.empName || bid.approvedByInhouseUser?.empName || 'Manager',
          driverName: bid.driverName || 'N/A',
          driverPhone: bid.driverPhone || 'N/A',
          vehicleNumber: bid.vehicleNumber || 'N/A',
          vehicleType: bid.vehicleType || bid.load?.vehicleType || 'N/A',
          estimatedPickupDate: bid.estimatedPickupDate ? new Date(bid.estimatedPickupDate).toLocaleDateString() : 'N/A',
          estimatedDeliveryDate: bid.estimatedDeliveryDate ? new Date(bid.estimatedDeliveryDate).toLocaleDateString() : 'N/A',
          docUpload: bid.doDocument || 'sample-doc.jpg',
          remarks: bid.message || '',
          carrierInfo: {
            mcDotNo: bid.carrier?.mc_dot_no || 'N/A',
            email: bid.carrier?.email || 'N/A',
            phone: bid.carrier?.phoneNo || 'N/A',
            state: bid.carrier?.state || 'N/A',
            city: bid.carrier?.city || 'N/A'
          },
          shipperInfo: {
            compName: bid.shipper?.compName || 'N/A',
            mc_dot_no: bid.shipper?.mc_dot_no || 'N/A',
            email: bid.shipper?.email || 'N/A',
            phoneNo: bid.shipper?.phoneNo || 'N/A',
            state: bid.shipper?.state || 'N/A',
            city: bid.shipper?.city || 'N/A'
          },
          loadInfo: {
            weight: bid.load?.weight || 0,
            commodity: bid.load?.commodity || 'N/A',
            vehicleType: bid.load?.vehicleType || 'N/A',
            pickupDate: bid.load?.pickupDate || 'N/A',
            deliveryDate: bid.load?.deliveryDate || 'N/A'
          },
          // Internal negotiation data
          internalNegotiation: bid.internalNegotiation || null,
          forwardedToManager: bid.forwardedToManager || null
        }));

        setManagerApprovedBids(transformedBids);
        setTabCounts(prev => ({ ...prev, managerApproved: transformedBids.length }));
      } else {
        console.error('Manager approved bids API response format error:', response.data);
        setManagerApprovedBids([]);
        setTabCounts(prev => ({ ...prev, managerApproved: 0 }));
      }
    } catch (error) {
      console.error('Error fetching manager approved bids:', error);
      alertify.error('Error fetching manager approved bids');
      setManagerApprovedBids([]);
      setTabCounts(prev => ({ ...prev, managerApproved: 0 }));
    } finally {
      setManagerBidsLoading(false);
      setManagerApprovedLoaded(true);
    }
  };

  // Fetch manager rejected bids
  const fetchManagerRejectedBids = async () => {
    try {
      setManagerBidsLoading(true);
      const userEmpId = sessionStorage.getItem('empId') || localStorage.getItem('empId');

      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/bid/sales/manager-rejected`, {
        timeout: 10000,
        headers: API_CONFIG.getAuthHeaders()
      });

      if (response.data && (Array.isArray(response.data) || response.data.success || response.data.bids || response.data.data)) {
        console.log('Manager Rejected Response:', response.data);
        let bidsData = [];
        if (Array.isArray(response.data)) {
          bidsData = response.data;
        } else {
          bidsData = response.data.bids || response.data.data?.bids || [];
        }
        const transformedBids = bidsData.map(bid => ({
          id: `BID-${bid._id.slice(-6)}`,
          rateNum: bid._id,
          loadId: bid.load?._id ? `L-${bid.load._id.slice(-5)}` : 'N/A',
          shipmentNumber: bid.load?.shipmentNumber || 'N/A',
          origin: bid.load ? (() => {
            if (bid.load.origin && bid.load.origin.city) {
              return `${bid.load.origin.city}, ${bid.load.origin.state || 'N/A'}`;
            }
            if (bid.load.origins && bid.load.origins.length > 0) {
              return `${bid.load.origins[0].city}, ${bid.load.origins[0].state || 'N/A'}`;
            }
            return 'N/A, N/A';
          })() : 'N/A, N/A',
          destination: bid.load ? (() => {
            if (bid.load.destination && bid.load.destination.city) {
              return `${bid.load.destination.city}, ${bid.load.destination.state || 'N/A'}`;
            }
            if (bid.load.destinations && bid.load.destinations.length > 0) {
              return `${bid.load.destinations[0].city}, ${bid.load.destinations[0].state || 'N/A'}`;
            }
            return 'N/A, N/A';
          })() : 'N/A, N/A',
          originalRate: bid.originalRate || bid.load?.rate || 0,
          rejectedRate: bid.rejectedRate || bid.managerRejectedRate || 0,
          truckerName: bid.carrier?.compName || 'N/A',
          status: 'manager-rejected',
          createdAt: new Date(bid.createdAt).toISOString().split('T')[0],
          rejectedAt: bid.managerRejectedAt ? new Date(bid.managerRejectedAt).toISOString().split('T')[0] : 'N/A',
          rejectedBy: bid.managerRejectedBy?.empName || 'Manager',
          rejectionReason: bid.rejectionReason || 'No reason provided',
          docUpload: bid.doDocument || 'sample-doc.jpg',
          remarks: bid.message || '',
          carrierInfo: {
            mcDotNo: bid.carrier?.mc_dot_no || 'N/A',
            email: bid.carrier?.email || 'N/A',
            phone: bid.carrier?.phoneNo || 'N/A',
            state: bid.carrier?.state || 'N/A',
            city: bid.carrier?.city || 'N/A'
          },
          shipperInfo: bid.load?.shipper || null,
          shipperName: bid.load?.shipper?.compName || 'N/A',
          loadInfo: {
            weight: bid.load?.weight || 0,
            commodity: bid.load?.commodity || 'N/A',
            vehicleType: bid.load?.vehicleType || 'N/A',
            pickupDate: bid.load?.pickupDate || 'N/A',
            deliveryDate: bid.load?.deliveryDate || 'N/A'
          }
        }));

        setManagerRejectedBids(transformedBids);
        setTabCounts(prev => ({ ...prev, managerRejected: transformedBids.length }));
      } else {
        console.error('Manager rejected bids API response format error:', response.data);
        setManagerRejectedBids([]);
        setTabCounts(prev => ({ ...prev, managerRejected: 0 }));
      }
    } catch (error) {
      console.error('Error fetching manager rejected bids:', error);
      alertify.error('Error fetching manager rejected bids');
      setManagerRejectedBids([]);
      setTabCounts(prev => ({ ...prev, managerRejected: 0 }));
    } finally {
      setManagerBidsLoading(false);
      setManagerRejectedLoaded(true);
    }
  };

  // Handle submit new price for approval (for rejected bids)
  const handleSubmitNewPrice = async (bidId, newPrice, message = '') => {
    try {
      setSubmitting(true);

      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/bids/${bidId}/manager-approve`, {
        status: "Approved",
        finalRate: parseFloat(newPrice),
        message: message || ''
      }, {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('authToken') || localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        alertify.success('New price submitted for manager approval successfully!');
        setFinalPriceModal({ visible: false, bid: null });
        setFinalPriceModalAmount(0);
        setFinalPriceModalMessage('');
        // Refresh the data
        await fetchManagerRejectedBids();
      } else {
        alertify.error(response.data?.message || 'Failed to submit new price');
      }
    } catch (error) {
      console.error('Error submitting new price:', error);
      alertify.error(error.response?.data?.message || 'Error submitting new price. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  const fetchAcceptedBids = async ({ withLoading = true } = {}) => {
    try {
      if (withLoading) {
        setLoading(true);
      }
      const userEmpId = salesUserId || sessionStorage.getItem('empId') || localStorage.getItem('empId');

      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/bid/accepted-by-inhouse?empId=${userEmpId}`, {
        timeout: 10000,
        headers: API_CONFIG.getAuthHeaders()
      });

      if (response.data && response.data.success) {
        // Transform API data to match our component structure
        const transformedBids = response.data.bids.map(bid => {
          // Helper function to extract origin with fallback logic
          const getOrigin = () => {
            // First try direct bid.origins (at bid level)
            if (bid.origins && Array.isArray(bid.origins) && bid.origins.length > 0) {
              const firstOrigin = bid.origins[0];
              const city = firstOrigin.city || firstOrigin.extractedCity || firstOrigin.addressLine1 || '';
              const state = firstOrigin.state || '';
              if (city || state) {
                return `${city || 'N/A'}, ${state || 'N/A'}`;
              }
            }
            
            // Then try bid.load
            if (bid.load) {
              // Try origin object first
              if (bid.load.origin) {
                const city = bid.load.origin.city || bid.load.origin.extractedCity || bid.load.origin.addressLine1 || '';
                const state = bid.load.origin.state || '';
                if (city || state) {
                  return `${city || 'N/A'}, ${state || 'N/A'}`;
                }
              }
              
              // Try origins array
              if (bid.load.origins && Array.isArray(bid.load.origins) && bid.load.origins.length > 0) {
                const firstOrigin = bid.load.origins[0];
                const city = firstOrigin.city || firstOrigin.extractedCity || firstOrigin.addressLine1 || '';
                const state = firstOrigin.state || '';
                if (city || state) {
                  return `${city || 'N/A'}, ${state || 'N/A'}`;
                }
              }
            }
            
            return 'N/A, N/A';
          };
          
          // Helper function to extract destination with fallback logic
          const getDestination = () => {
            // First try direct bid.destinations (at bid level)
            if (bid.destinations && Array.isArray(bid.destinations) && bid.destinations.length > 0) {
              const firstDestination = bid.destinations[0];
              const city = firstDestination.city || firstDestination.extractedCity || firstDestination.addressLine1 || '';
              const state = firstDestination.state || '';
              if (city || state) {
                return `${city || 'N/A'}, ${state || 'N/A'}`;
              }
            }
            
            // Then try bid.load
            if (bid.load) {
              // Try destination object first
              if (bid.load.destination) {
                const city = bid.load.destination.city || bid.load.destination.extractedCity || bid.load.destination.addressLine1 || '';
                const state = bid.load.destination.state || '';
                if (city || state) {
                  return `${city || 'N/A'}, ${state || 'N/A'}`;
                }
              }
              
              // Try destinations array
              if (bid.load.destinations && Array.isArray(bid.load.destinations) && bid.load.destinations.length > 0) {
                const firstDestination = bid.load.destinations[0];
                const city = firstDestination.city || firstDestination.extractedCity || firstDestination.addressLine1 || '';
                const state = firstDestination.state || '';
                if (city || state) {
                  return `${city || 'N/A'}, ${state || 'N/A'}`;
                }
              }
            }
            
            return 'N/A, N/A';
          };
          
          return {
          id: `BID-${bid._id.slice(-6)}`,
          rateNum: bid._id,
          loadId: bid.load?._id ? `L-${bid.load._id.slice(-5)}` : 'N/A',
          shipmentNumber: bid.load?.shipmentNumber || 'N/A',
          origin: getOrigin(),
          destination: getDestination(),
          // Add return address fields
          returnAddress: bid.load?.returnAddress || bid.returnAddress || null,
          returnCity: bid.load?.returnCity || bid.returnCity || null,
          returnState: bid.load?.returnState || bid.returnState || null,
          returnZip: bid.load?.returnZip || bid.returnZip || null,
          originalRate: bid.originalRate || bid.load?.rate || 0,
          intermediateRate: bid.intermediateRate || 0,
          rate: bid.intermediateRate || bid.originalRate || 0,
          truckerName: bid.carrier?.compName || 'N/A',
          status: 'accepted',
          createdAt: new Date(bid.createdAt).toISOString().split('T')[0],
          acceptedAt: bid.acceptedAt ? new Date(bid.acceptedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          createdBy: `${bid.acceptedByInhouseUser?.empName || 'Unknown'} (${bid.acceptedByInhouseUser?.empId || salesUserId || 'Unknown'})`,
          docUpload: bid.doDocument || 'sample-doc.jpg',
          remarks: bid.message || '',
          // Add shipper info for the new column
          shipperInfo: bid.load?.shipper || null,
          shipperName: bid.load?.shipper?.compName || 'N/A',
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
          };
        });


        setAcceptedRates(transformedBids);
        setTabCounts(prev => ({ ...prev, accepted: transformedBids.length }));

        // Force a re-render by updating the search term
        setSearchTerm('');
      } else {
        console.error('Accepted bids API response format error:', response.data);
        setAcceptedRates([]);
        setTabCounts(prev => ({ ...prev, accepted: 0 }));
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
      setAcceptedRates([]);
      setTabCounts(prev => ({ ...prev, accepted: 0 }));
    } finally {
      if (withLoading) {
        setLoading(false);
      }
      setAcceptedLoaded(true);
    }
  };

  // Get empId from sessionStorage on component mount
  useEffect(() => {
    const userEmpId = sessionStorage.getItem('empId') || localStorage.getItem('empId');
    if (userEmpId) {
      setSalesUserId(userEmpId);

    } else {
      console.warn('No empId found in sessionStorage or localStorage');
    }

    // Log current auth token for Postman testing
    const authToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
    if (authToken) {









    } else {
      console.warn('❌ No auth token found in sessionStorage or localStorage');
    }
  }, []);

  const updateActiveTabRates = (updater) => {
    if (activeTab === 'pending') {
      setPendingRates(updater);
    } else if (activeTab === 'completed') {
      setCompletedRates(updater);
    } else if (activeTab === 'accepted') {
      setAcceptedRates(updater);
    }
  };

  const handleStatusUpdate = async (status) => {
    try {
      const { id } = selectedRate;
      // Simulate API call
      setTimeout(() => {
        updateActiveTabRates(prevRates =>
          prevRates.map(rate => (rate.id === id ? { ...rate, status } : rate))
        );
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

  const activeTabRates = activeTab === 'pending'
    ? pendingRates
    : activeTab === 'completed'
      ? completedRates
      : activeTab === 'accepted'
        ? acceptedRates
        : activeTab === 'manager-approved'
          ? managerApprovedBids
          : managerRejectedBids;

  // Filter rates based on search term
  const filteredRates = activeTabRates.filter(rate => {
    const searchLower = searchTerm.toLowerCase();
    const matches = (rate.id || '').toLowerCase().includes(searchLower) ||
      (rate.shipmentNumber || '').toLowerCase().includes(searchLower) ||
      (rate.origin || '').toLowerCase().includes(searchLower) ||
      (rate.destination || '').toLowerCase().includes(searchLower) ||
      (rate.truckerName || '').toLowerCase().includes(searchLower) ||
      ((rate.shipperName || '').toLowerCase().includes(searchLower));

    if (searchTerm && matches) {

    }
    return matches;
  });

  // Add after fetchApprovedRates function
  const fetchPendingApprovals = async () => {
    try {

      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/bid/pending-intermediate-approval`, {
        timeout: 10000,
        headers: API_CONFIG.getAuthHeaders()
      });


      if (response.data && response.data.success) {
        const currentUserEmpId = salesUserId || sessionStorage.getItem('empId') || localStorage.getItem('empId');
        
        // Filter bids to show only current user's data
        const userSpecificBids = response.data.bids.filter(bid => {
          // Check if bid belongs to current user
          const bidEmpId = bid.placedByInhouseUser || bid.load?.createdBySalesUser?.empId;
          return bidEmpId === currentUserEmpId;
        });



        const transformedRates = userSpecificBids.map(bid => ({
          id: `RA-${bid._id.slice(-6)}`,
          rateNum: bid._id,
          loadId: bid.load?._id ? `L-${bid.load._id.slice(-5)}` : 'N/A',
          shipmentNumber: bid.load?.shipmentNumber || 'N/A',
          origin: bid.load ? (() => {
            if (bid.load.origin && bid.load.origin.city) {
              return `${bid.load.origin.city}, ${bid.load.origin.state || 'N/A'}`;
            }
            if (bid.load.origins && bid.load.origins.length > 0) {
              return `${bid.load.origins[0].city}, ${bid.load.origins[0].state || 'N/A'}`;
            }
            return 'N/A, N/A';
          })() : 'N/A, N/A',
          destination: bid.load ? (() => {
            if (bid.load.destination && bid.load.destination.city) {
              return `${bid.load.destination.city}, ${bid.load.destination.state || 'N/A'}`;
            }
            if (bid.load.destinations && bid.load.destinations.length > 0) {
              return `${bid.load.destinations[0].city}, ${bid.load.destinations[0].state || 'N/A'}`;
            }
            return 'N/A, N/A';
          })() : 'N/A, N/A',
          // Add return address fields
          returnAddress: bid.load?.returnAddress || bid.returnAddress || null,
          returnCity: bid.load?.returnCity || bid.returnCity || null,
          returnState: bid.load?.returnState || bid.returnState || null,
          returnZip: bid.load?.returnZip || bid.returnZip || null,
          rate: bid.rate,
          rates: bid.rates || null, // Add rates array
          totalrates: bid.totalrates || null, // Add totalrates
          truckerName: bid.carrier?.compName || 'N/A',
          status: 'pending',
          createdAt: new Date(bid.createdAt).toISOString().split('T')[0],
          createdBy: `Employee ${bid.placedByInhouseUser}`,
          docUpload: bid.doDocument || 'sample-doc.jpg',
          remarks: bid.message || '',
          // Add shipper name for display
          shipperName: bid.load?.shipper?.compName || 'N/A',
          // Add attachment field for popup display
          attachment: bid.attachment || null
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
  const fetchPendingBidsBySalesUser = async (userId = null) => {
    try {
      const userEmpId = userId || salesUserId || sessionStorage.getItem('empId') || localStorage.getItem('empId');

      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/bid/pending-by-sales-user/${userEmpId}`, {
        timeout: 10000,
        headers: API_CONFIG.getAuthHeaders()
      });


      if (response.data && response.data.success) {
        const transformedBids = response.data.bids.map(bid => ({
          id: `BID-${bid._id.slice(-6)}`,
          rateNum: bid._id,
          loadId: bid.load?._id ? `L-${bid.load._id.slice(-5)}` : 'N/A',
          actualLoadId: bid.load?._id || null, // Store actual MongoDB load ID for API calls
          shipmentNumber: bid.load?.shipmentNumber || 'N/A',
          origin: bid.load ? (() => {
            if (bid.load.origin && bid.load.origin.city) {
              return `${bid.load.origin.city}, ${bid.load.origin.state || 'N/A'}`;
            }
            if (bid.load.origins && bid.load.origins.length > 0) {
              return `${bid.load.origins[0].city}, ${bid.load.origins[0].state || 'N/A'}`;
            }
            return 'N/A, N/A';
          })() : 'N/A, N/A',
          destination: bid.load ? (() => {
            if (bid.load.destination && bid.load.destination.city) {
              return `${bid.load.destination.city}, ${bid.load.destination.state || 'N/A'}`;
            }
            if (bid.load.destinations && bid.load.destinations.length > 0) {
              return `${bid.load.destinations[0].city}, ${bid.load.destinations[0].state || 'N/A'}`;
            }
            return 'N/A, N/A';
          })() : 'N/A, N/A',
          rate: bid.rate,
          rates: bid.rates || null, // Add rates array
          totalrates: bid.totalrates || null, // Add totalrates
          // Add return address fields
          returnAddress: bid.load?.returnAddress || bid.returnAddress || null,
          returnCity: bid.load?.returnCity || bid.returnCity || null,
          returnState: bid.load?.returnState || bid.returnState || null,
          returnZip: bid.load?.returnZip || bid.returnZip || null,
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
          // Add shipper info for the new column
          shipperInfo: bid.load?.shipper || null,
          shipperName: bid.load?.shipper?.compName || 'N/A',
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
          salesUserInfo: bid.load?.createdBySalesUser,
          // Add placedByCMTUser data for the new column
          placedByCMTUser: bid.placedByCMTUser || null,
          // Add attachment field for popup display
          attachment: bid.attachment || null
        }));

        return transformedBids;
      }
      return [];
    } catch (error) {
      console.error('Error fetching pending bids by sales user:', error);
      return [];
    }
  };

  // Define fetchAllData at the component level
  const fetchAllData = async ({ withLoading = true } = {}) => {
    if (withLoading) {
      setLoading(true);
    }
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


      setPendingRates(uniqueRates);
      const pendingTotal = uniqueRates.filter(rate => rate.status === 'pending').length;
      setTabCounts(prev => ({ ...prev, pending: pendingTotal }));
    } catch (error) {
      console.error('Error fetching data:', error);
      alertify.error('Error refreshing data');
      setTabCounts(prev => ({ ...prev, pending: 0 }));
    } finally {
      if (withLoading) {
        setLoading(false);
      }
      setPendingLoaded(true);
    }
  };

  // Send to Manager function
  const handleSendToManager = async (bidId, finalPrice, message = '') => {
    setActionLoading(prev => ({ ...prev, [bidId]: 'sendToManager' }));
    try {
      // Prepare API payload - include negotiatedPrice only when finalPrice is provided
      const payload = {
        forwardReason: message || `Negotiated price is $${finalPrice}`
      };
      
      // Add negotiatedPrice only when finalPrice is provided and valid
      if (finalPrice && Number(finalPrice) > 0) {
        payload.negotiatedPrice = Number(finalPrice);
      }

      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/bid/${bidId}/forward-to-manager`, payload, {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('authToken') || localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        alertify.success('✅ Bid sent to manager for approval successfully!');
        // Refresh data based on active tab
        if (activeTab === 'pending') {
          await fetchAllData();
        } else if (activeTab === 'completed') {
          await fetchCompletedRates();
        } else if (activeTab === 'manager-rejected') {
          await fetchManagerRejectedBids();
        }
      } else {
        alertify.error(response.data?.message || 'Failed to send bid to manager');
      }
    } catch (error) {
      console.error('Send to manager error:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      alertify.error(error.response?.data?.message || 'Error sending bid to manager. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [bidId]: null }));
    }
  };

  // Then update the handleManualApprove and handleAutoApprove functions
  const handleManualApprove = async (bidId, customRate, message = '') => {
    setActionLoading(prev => ({ ...prev, [bidId]: 'manual' }));
    try {

      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/bid/intermediate/${bidId}/approve`, {
        intermediateRate: parseFloat(customRate),
        message: message || ''
      }, {
        headers: API_CONFIG.getAuthHeaders()
      });

      if (response.data.success) {
        alertify.success('✅ Bid approved successfully with custom rate!');
        // Refresh data based on active tab
        if (activeTab === 'pending') {
          await fetchAllData();
        } else if (activeTab === 'completed') {
          await fetchCompletedRates();
        }
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
        // Refresh data based on active tab
        if (activeTab === 'pending') {
          await fetchAllData();
        } else if (activeTab === 'completed') {
          await fetchCompletedRates();
        }
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

  const pendingCount = tabCounts.pending;
  const approvedCount = tabCounts.approved;
  const acceptedCount = tabCounts.accepted;
  const managerApprovedCount = tabCounts.managerApproved;
  const managerRejectedCount = tabCounts.managerRejected;

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Export to CSV function
  const handleExportToCSV = () => {
    try {
      // Get current filtered data
      const dataToExport = filteredRates;
      
      if (dataToExport.length === 0) {
        console.warn('No data to export');
        return;
      }

      // Define CSV headers
      const headers = [
        'Bid ID',
        'Origin',
        'Destination', 
        'Original Rate',
        'Intermediate Rate',
        'Shipper',
        'Shipper MC',
        'Trucker',
        'Trucker MC',
        'Status',
        'Created Date',
        'Created By'
      ];

      // Convert data to CSV format
      const csvContent = [
        headers.join(','),
        ...dataToExport.map(rate => [
          rate.id || '',
          `"${rate.origin || ''}"`,
          `"${rate.destination || ''}"`,
          rate.originalRate || 0,
          rate.intermediateRate || 0,
          `"${rate.shipperInfo?.compName || 'N/A'}"`,
          `"${rate.shipperInfo?.mc_dot_no || 'N/A'}"`,
          `"${rate.truckerName || 'N/A'}"`,
          `"${rate.carrierInfo?.mcDotNo || 'N/A'}"`,
          `"${rate.status || 'N/A'}"`,
          `"${rate.createdAt || 'N/A'}"`,
          `"${rate.createdBy || 'N/A'}"`
        ].join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `approved_rates_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Export to CSV error:', error);
    }
  };

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Close customer dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCustomerDropdown && !event.target.closest('.customer-dropdown-container')) {
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCustomerDropdown]);
  // Replace the existing useEffect
  useEffect(() => {
    const prefetchAllTabs = async () => {
      await Promise.allSettled([
        fetchAllData({ withLoading: true }),
        fetchCompletedRates({ withLoading: false }),
        fetchAcceptedBids({ withLoading: false }),
        fetchManagerApprovedBids(),
        fetchManagerRejectedBids()
      ]);
      setInitialPrefetchDone(true);
    };

    prefetchAllTabs();
  }, []);

  useEffect(() => {
    if (!initialPrefetchDone) {
      return;
    }
    if (activeTab === 'pending') {
      if (!pendingLoaded) {
        fetchAllData();
      }
    } else if (activeTab === 'completed') {
      if (!completedLoaded) {
        fetchCompletedRates();
      }
    } else if (activeTab === 'accepted') {
      if (!acceptedLoaded) {
        fetchAcceptedBids();
      }
    } else if (activeTab === 'manager-approved') {
      if (!managerApprovedLoaded) {
        fetchManagerApprovedBids();
      }
    } else if (activeTab === 'manager-rejected') {
      if (!managerRejectedLoaded) {
        fetchManagerRejectedBids();
      }
    }
  }, [activeTab, pendingLoaded, completedLoaded, acceptedLoaded, managerApprovedLoaded, managerRejectedLoaded, initialPrefetchDone]);

  // Auto-scroll to bottom when negotiation history updates
  useEffect(() => {
    if (chatContainerRef && negotiationHistory.length > 0) {
      setTimeout(() => {
        chatContainerRef.scrollTop = chatContainerRef.scrollHeight;
      }, 100);
    }
  }, [negotiationHistory, chatContainerRef]);

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
        customerName: customerId,
        fullAddress: `${customer.city}, ${customer.state}, ${customer.country}`
      }));
      
      // Update search term to show selected customer name
      setCustomerSearchTerm(customer.compName);
      setShowCustomerDropdown(false);
    }
  };

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer => 
    customer.customer.compName.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    customer.customer.city.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    customer.customer.state.toLowerCase().includes(customerSearchTerm.toLowerCase())
  );

  // Handle customer search input change
  const handleCustomerSearchChange = (e) => {
    const value = e.target.value;
    setCustomerSearchTerm(value);
    setShowCustomerDropdown(true);
    
    // Clear selection if search term doesn't match selected customer
    if (acceptBidForm.customerName) {
      const selectedCustomer = customers.find(c => c.value === acceptBidForm.customerName);
      if (selectedCustomer && !selectedCustomer.customer.compName.toLowerCase().includes(value.toLowerCase())) {
        setAcceptBidForm(prev => ({
          ...prev,
          customerName: '',
          fullAddress: ''
        }));
      }
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
      const userEmpId = salesUserId || sessionStorage.getItem('empId') || localStorage.getItem('empId');
      const submitData = {
        empId: userEmpId, // Dynamic based on logged-in user
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

      // Find matching customer by shipper ID
      const matchingCustomer = customers.find(c => c.customer._id === rate.shipperInfo?._id);
      const selectedCustomerId = matchingCustomer ? matchingCustomer.value : '';




      const sn = (rate.shipmentNumber && rate.shipmentNumber !== 'N/A') ? rate.shipmentNumber : '';
      setAcceptBidForm({
        customerName: selectedCustomerId, // Auto-select shipper ID if found
        fullAddress: rate.shipperInfo ? `${rate.shipperInfo.city}, ${rate.shipperInfo.state}` : '',
        status: 'Accepted',
        shipmentNumber: sn,
        poNumber: '',
        bolNumber: '',
        message: ''
      });

      // Set search term to show selected customer name
      if (matchingCustomer) {
        setCustomerSearchTerm(matchingCustomer.customer.compName);
      } else {
        setCustomerSearchTerm('');
      }
      setShowCustomerDropdown(false);
      setAcceptErrors({ customerName: '', fullAddress: '', status: '', shipmentNumber: '', poNumber: '', bolNumber: '' });

    } catch (error) {
      console.error('Error opening accept bid modal:', error);
      alertify.error('Error opening accept bid form. Please try again.');
    }
  };

  // Fetch negotiation history
  const fetchNegotiationHistory = useCallback(async (bidId, isSilent = false, senderName = 'Shipper') => {
    try {
      if (!isSilent) setNegotiationHistoryLoading(true);
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/bid/${bidId}/internal-negotiation-thread`,
        {
          headers: API_CONFIG.getAuthHeaders(),
          timeout: 10000
        }
      );

      if (response.data && response.data.success) {
        const history = response.data.data?.internalNegotiation?.history || [];
        setNegotiationHistory(history);

        // Check for new messages to alert
        if (history.length > 0) {
          const lastMsg = history[history.length - 1];
          
          if (lastProcessedMessageIdRef.current) {
             const lastId = lastProcessedMessageIdRef.current;
             const lastIndex = history.findIndex(m => m._id === lastId);
             
             if (lastIndex !== -1 && lastIndex < history.length - 1) {
                const newMessages = history.slice(lastIndex + 1);
                newMessages.forEach(msg => {
                   if (msg.by !== 'inhouse') {
                      alertify.set('notifier','position', 'top-right');
                      alertify.success(`${senderName}: ${msg.message}`);
                   }
                });
             }
          } else {
            // Initial load or reset, just set the ref without alerting
            lastProcessedMessageIdRef.current = lastMsg._id;
          }
          // Update ref to latest always if we have history
          lastProcessedMessageIdRef.current = lastMsg._id;
        }
      } else {
        if (!isSilent) setNegotiationHistory([]);
      }
    } catch (error) {
      console.error('Error fetching negotiation history:', error);
      if (!isSilent) setNegotiationHistory([]);
    } finally {
      if (!isSilent) setNegotiationHistoryLoading(false);
    }
  }, []);

  // Poll for negotiation history
  useEffect(() => {
    let intervalId;
    if (negotiateBidModal.visible && negotiateBidModal.rate?.rateNum) {
      intervalId = setInterval(() => {
        fetchNegotiationHistory(negotiateBidModal.rate.rateNum, true, negotiateBidModal.rate?.shipperName || 'Shipper');
      }, 2000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [negotiateBidModal.visible, negotiateBidModal.rate, fetchNegotiationHistory]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef && negotiationHistory.length > 0) {
      // Only scroll if length increased (new message) or on initial load
      if (negotiationHistory.length > prevHistoryLengthRef.current) {
        chatContainerRef.scrollTop = chatContainerRef.scrollHeight;
      }
      prevHistoryLengthRef.current = negotiationHistory.length;
    } else if (negotiationHistory.length === 0) {
      prevHistoryLengthRef.current = 0;
    }
  }, [negotiationHistory, chatContainerRef, negotiateBidModal.visible]);

  // Handle negotiate bid
  const handleNegotiateBid = async (rate) => {
    try {
      setNegotiateBidModal({ visible: true, rate });
      
      // Pre-fill form with current rate
      setNegotiateBidForm({
        inhouseCounterRate: rate.intermediateRate || rate.rate || '',
        message: ''
      });
      
      setNegotiateErrors({ inhouseCounterRate: '', message: '' });
      
      // Reset last processed message ref
      lastProcessedMessageIdRef.current = null;

      // Fetch negotiation history
      await fetchNegotiationHistory(rate.rateNum, false, rate.shipperName || 'Shipper');
    } catch (error) {
      console.error('Error opening negotiate bid modal:', error);
      alertify.error('Error opening negotiate form. Please try again.');
    }
  };

  // Handle negotiate bid form submission
  const handleNegotiateBidSubmit = async (e) => {
    e.preventDefault();

    // Front-end validation
    const errs = {};
    if (!negotiateBidForm.inhouseCounterRate || parseFloat(negotiateBidForm.inhouseCounterRate) <= 0) {
      errs.inhouseCounterRate = 'Please enter a valid counter rate greater than 0.';
    }
    
    if (!negotiateBidForm.message || negotiateBidForm.message.trim() === '') {
      errs.message = 'Please enter a negotiation message.';
    }

    setNegotiateErrors(errs);
    if (Object.keys(errs).length) {
      alertify.error(Object.values(errs)[0]);
      return;
    }

    try {
      setNegotiateSubmitting(true);

      const submitData = {
        inhouseCounterRate: parseFloat(negotiateBidForm.inhouseCounterRate),
        message: negotiateBidForm.message.trim()
      };

      const response = await axios.put(
        `${API_CONFIG.BASE_URL}/api/v1/bid/${negotiateBidModal.rate.rateNum}/inhouse-internal-negotiate`,
        submitData,
        { headers: API_CONFIG.getAuthHeaders(), timeout: 10000 }
      );

      if (response.data && response.data.success) {
        alertify.success('Negotiation sent successfully!');
        setNegotiateBidForm({
          inhouseCounterRate: '',
          message: ''
        });
        
        // Refresh negotiation history
        await fetchNegotiationHistory(negotiateBidModal.rate.rateNum);
        
        // Refresh table
        await fetchCompletedRates();
      } else {
        alertify.error(response.data?.message || 'Failed to send negotiation. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting negotiate bid:', error);
      alertify.error(error.response?.data?.message || 'Error sending negotiation. Please try again.');
    } finally {
      setNegotiateSubmitting(false);
    }
  };


  // Loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading bids and rates</p>
          </div>
        </div>
      </div>
    );
  }

  if (previewImg) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center">
        <div className="relative bg-white rounded-2xl overflow-hidden p-4">
          <img src={previewImg} alt="Document Preview" className="max-h-[80vh] rounded-xl" />
          <button
            onClick={() => setPreviewImg(null)}
            className="absolute left-4 top-4 bg-white p-2 rounded-full hover:bg-blue-100"
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
        <div className="bg-white p-8 rounded-2xl w-[400px] relative flex flex-col items-center">
          <button className="absolute right-4 top-2 text-xl hover:text-red-500" onClick={() => setModalType(null)}>×</button>
          <textarea
            className="w-full border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-3 rounded-lg mb-4"
            rows={5}
            placeholder={`Type reason of ${modalType}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full font-semibold hover:from-blue-700 hover:to-purple-700 transition"
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
        <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[95vh] overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
                <div className="relative customer-dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={customerSearchTerm}
                      onChange={handleCustomerSearchChange}
                      onFocus={() => setShowCustomerDropdown(true)}
                      placeholder="Search customer by name, city, or state..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  </div>
                  
                  {/* Dropdown */}
                  {showCustomerDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
                      {customersLoading ? (
                        <div className="px-4 py-3 text-gray-500 text-center">
                          Loading customers...
                        </div>
                      ) : filteredCustomers.length > 0 ? (
                        filteredCustomers.map((customer) => (
                          <div
                            key={customer.value}
                            onClick={() => handleCustomerSelect(customer.value)}
                            className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900">{customer.customer.compName}</div>
                            <div className="text-sm text-gray-500">{customer.customer.city}, {customer.customer.state}</div>
                            {customer.customer.mc_dot_no && (
                              <div className="text-xs text-gray-400">MC: {customer.customer.mc_dot_no}</div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-gray-500 text-center">
                          No customers found
                        </div>
                      )}
                    </div>
                  )}
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

  // Negotiate Bid Modal - WhatsApp Style
  if (negotiateBidModal.visible) {
    return (
      <div className="fixed inset-0 backdrop-blur-sm bg-black/50 z-50 flex justify-center items-center p-4">
        <style>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-out;
          }
        `}</style>
        <div className="bg-gray-100 rounded-xl max-w-2xl w-full h-[85vh] flex flex-col overflow-hidden">
          {/* Header - WhatsApp Style */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold flex items-center gap-2">
                  Negotiation - {negotiateBidModal.rate?.id || 'N/A'}
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                </h2>
                <p className="text-xs text-green-100">{negotiateBidModal.rate?.origin} → {negotiateBidModal.rate?.destination}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchNegotiationHistory(negotiateBidModal.rate.rateNum, false, negotiateBidModal.rate?.shipperName || 'Shipper')}
                className="text-white hover:text-gray-200 p-1 rounded-full hover:bg-white/10 transition-colors"
                title="Refresh messages"
              >
                <RefreshCw size={18} />
              </button>
              <button
                onClick={() => {
                  setNegotiateBidModal({ visible: false, rate: null });
                  setNegotiationHistory([]);
                }}
                className="text-white hover:text-gray-200 text-xl font-bold w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
              >
                ×
              </button>
            </div>
          </div>

          {/* Chat Messages Area */}
          <div
            ref={(el) => setChatContainerRef(el)}
            className="flex-1 overflow-y-auto bg-gray-50 p-3 space-y-2"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e5e7eb' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}
          >
            {negotiationHistoryLoading ? (
              <div className="flex justify-center items-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                  <p className="text-gray-500 text-sm">Loading messages...</p>
                </div>
              </div>
            ) : negotiationHistory.length === 0 ? (
              <div className="flex justify-center items-center h-full">
                <div className="text-center">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <p className="text-gray-400 text-sm">No negotiation history yet</p>
                  <p className="text-gray-300 text-xs mt-1">Start a negotiation below</p>
                </div>
              </div>
            ) : (
              negotiationHistory.map((msg, index) => {
                const isInhouse = msg.by === 'inhouse';
                const messageTime = new Date(msg.at).toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                });

                return (
                  <div
                    key={msg._id || index}
                    className={`flex flex-col ${isInhouse ? 'items-end' : 'items-start'} animate-fadeIn`}
                  >
                    {/* Sender Name */}
                    <p className={`text-xs mb-0.5 px-1.5 ${isInhouse ? 'text-gray-600' : 'text-gray-600'}`}>
                      {isInhouse 
                        ? 'You' 
                        : (negotiateBidModal.rate?.shipperName || 
                           negotiateBidModal.rate?.shipperInfo?.compName || 
                           'Shipper')}
                    </p>
                    
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        isInhouse
                          ? 'bg-green-500 text-white rounded-br-none'
                          : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
                      }`}
                      style={{
                        borderRadius: isInhouse ? '18px 18px 4px 18px' : '18px 18px 18px 4px'
                      }}
                    >
                      {/* Rate Badge */}
                      {msg.rate && (
                        <div className={`mb-1.5 inline-block px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                          isInhouse 
                            ? 'bg-green-600 text-white' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          ${msg.rate.toLocaleString()}
                        </div>
                      )}
                      
                      {/* Message */}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                      
                      {/* Timestamp */}
                      <p className={`text-xs mt-0.5 ${isInhouse ? 'text-green-100' : 'text-gray-400'}`}>
                        {messageTime}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input Area - WhatsApp Style */}
          <div className="bg-white border-t border-gray-200 p-3">
            <form noValidate onSubmit={handleNegotiateBidSubmit} className="space-y-2">
              {/* Counter Rate Input */}
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <span className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium text-sm">$</span>
                  <input
                    type="number"
                    name="inhouseCounterRate"
                    value={negotiateBidForm.inhouseCounterRate}
                    onChange={(e) => {
                      setNegotiateBidForm(prev => ({ ...prev, inhouseCounterRate: e.target.value }));
                      setNegotiateErrors(prev => ({ ...prev, inhouseCounterRate: '' }));
                    }}
                    required
                    min="0"
                    step="0.01"
                    placeholder="Counter rate"
                    className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={negotiateSubmitting || !negotiateBidForm.inhouseCounterRate || !negotiateBidForm.message}
                  className="bg-green-500 hover:bg-green-600 text-white rounded-full p-2.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {negotiateSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Message Input */}
              <div>
                <textarea
                  name="message"
                  value={negotiateBidForm.message}
                  onChange={(e) => {
                    setNegotiateBidForm(prev => ({ ...prev, message: e.target.value }));
                    setNegotiateErrors(prev => ({ ...prev, message: '' }));
                  }}
                  required
                  rows={2}
                  placeholder="Type your message..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                />
                {negotiateErrors.message && (
                  <p className="mt-1 text-xs text-red-600">{negotiateErrors.message}</p>
                )}
                {negotiateErrors.inhouseCounterRate && (
                  <p className="mt-1 text-xs text-red-600">{negotiateErrors.inhouseCounterRate}</p>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Tabs + Search + Quick Stats Wrapper */}
      <div className="bg-white rounded-2xl border border-gray-200 p-3 mb-6 w-full">
        {/* Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full">
          <button
            onClick={() => {
              setTabSwitchingLoading(true);
              setActiveTab('pending');
              setTimeout(() => setTabSwitchingLoading(false), 600);
            }}
            className={`w-full px-4 py-4 rounded-2xl border transition-all duration-200 text-left ${activeTab === 'pending'
              ? 'bg-white border-blue-400'
              : 'bg-white border-gray-200'
              }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-gray-600">Pending Bids</p>
                <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
                <Clock className="text-red-500" size={18} />
              </div>
            </div>
          </button>
          <button
            onClick={() => {
              setTabSwitchingLoading(true);
              setActiveTab('completed');
              setTimeout(() => setTabSwitchingLoading(false), 300);
            }}
            className={`w-full px-4 py-4 rounded-2xl border transition-all duration-200 text-left ${activeTab === 'completed'
              ? 'bg-white border-blue-400'
              : 'bg-white border-gray-200'
              }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-gray-600">Approved Rates</p>
                <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle className="text-green-500" size={18} />
              </div>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('accepted')}
            className={`w-full px-4 py-4 rounded-2xl border transition-all duration-200 text-left ${activeTab === 'accepted'
              ? 'bg-white border-blue-400'
              : 'bg-white border-gray-200'
              }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-gray-600">Accepted Bids</p>
                <p className="text-2xl font-bold text-gray-900">{acceptedCount}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle className="text-emerald-500" size={18} />
              </div>
            </div>
          </button>
          <button
            onClick={() => {
              setTabSwitchingLoading(true);
              setActiveTab('manager-approved');
              setTimeout(() => setTabSwitchingLoading(false), 300);
            }}
            className={`w-full px-4 py-4 rounded-2xl border transition-all duration-200 text-left ${activeTab === 'manager-approved'
              ? 'bg-white border-blue-400'
              : 'bg-white border-gray-200'
              }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-gray-600">Manager Approved</p>
                <p className="text-2xl font-bold text-gray-900">{managerApprovedCount}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center">
                <CheckCircle className="text-teal-500" size={18} />
              </div>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('manager-rejected')}
            className={`w-full px-4 py-4 rounded-2xl border transition-all duration-200 text-left ${activeTab === 'manager-rejected'
              ? 'bg-white border-blue-400'
              : 'bg-white border-gray-200'
              }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-gray-600">Manager Rejected</p>
                <p className="text-2xl font-bold text-gray-900">{managerRejectedCount}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center">
                <XCircle className="text-rose-500" size={18} />
              </div>
            </div>
          </button>
        </div>

        {activeTab === 'pending' && (
          <div className="mt-3 space-y-3">
            {/* Search */}
            <div className="bg-white rounded-2xl w-full">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search pending bids"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 pr-10 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              </div>
            </div>

            {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div
                  className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between"
                  style={{ boxShadow: '3.08px 3.08px 3.08px 0px #338ACD1A inset' }}
                >
                <p className="text-sm font-bold text-gray-700">Total pending bids</p>
                <span className="text-3xl font-bold text-green-500">{pendingCount}</span>
              </div>
                <div
                  className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between"
                  style={{ boxShadow: '3.08px 3.08px 3.08px 0px #338ACD1A inset' }}
                >
                <p className="text-sm font-bold text-gray-700">Approved</p>
                <span className="text-3xl font-bold text-green-500">{approvedCount}</span>
              </div>
                <div
                  className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between"
                  style={{ boxShadow: '3.08px 3.08px 3.08px 0px #338ACD1A inset' }}
                >
                <p className="text-sm font-bold text-gray-700">Today</p>
                <span className="text-3xl font-bold text-green-500">
                  {pendingRates.filter(rate => rate.createdAt === new Date().toISOString().split('T')[0]).length}
                </span>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'completed' && (
          <div className="mt-3 space-y-3">
            {/* Search */}
            <div className="bg-white rounded-2xl w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search completed rates"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 pl-9 pr-10 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div
                className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between"
                style={{ boxShadow: '3.08px 3.08px 3.08px 0px #338ACD1A inset' }}
              >
                <p className="text-sm font-bold text-gray-700">Total Completed</p>
                <span className="text-3xl font-bold text-green-500">{completedRates.length}</span>
              </div>
              <div
                className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between"
                style={{ boxShadow: '3.08px 3.08px 3.08px 0px #338ACD1A inset' }}
              >
                <p className="text-sm font-bold text-gray-700">Today's Completed</p>
                <span className="text-3xl font-bold text-green-500">{completedRates.filter(rate => rate.createdAt === new Date().toISOString().split('T')[0]).length}</span>
              </div>
              <div
                className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between"
                style={{ boxShadow: '3.08px 3.08px 3.08px 0px #338ACD1A inset' }}
              >
                <button
                  onClick={handleExportToCSV}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200"
                >
                  <FaDownload size={16} />
                  <span className="text-sm font-semibold">Export to CSV</span>
                </button>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'accepted' && (
          <div className="mt-3 space-y-3">
            {/* Search */}
            <div className="bg-white rounded-2xl w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search accepted bids"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 pl-9 pr-10 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div
                className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between"
                style={{ boxShadow: '3.08px 3.08px 3.08px 0px #338ACD1A inset' }}
              >
                <p className="text-sm font-bold text-gray-700">Total Accepted</p>
                <span className="text-3xl font-bold text-green-500">{acceptedCount}</span>
              </div>
              <div
                className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between"
                style={{ boxShadow: '3.08px 3.08px 3.08px 0px #338ACD1A inset' }}
              >
                <p className="text-sm font-bold text-gray-700">Today's Accepted</p>
                <span className="text-3xl font-bold text-green-500">{acceptedRates.filter(rate => rate.acceptedAt === new Date().toISOString().split('T')[0]).length}</span>
              </div>
              <div
                className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between"
                style={{ boxShadow: '3.08px 3.08px 3.08px 0px #338ACD1A inset' }}
              >
                <p className="text-sm font-bold text-gray-700">Total Value</p>
                <span className="text-3xl font-bold text-green-500">
                  ${acceptedRates.reduce((sum, rate) => sum + (rate.rate || 0), 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'manager-approved' && (
          <div className="mt-3 space-y-3">
            <div className="bg-white rounded-2xl w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search manager approved bids"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 pl-9 pr-10 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div
                className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between"
                style={{ boxShadow: '3.08px 3.08px 3.08px 0px #338ACD1A inset' }}
              >
                <p className="text-sm font-bold text-gray-700">Manager Approved</p>
                <span className="text-3xl font-bold text-green-500">{managerApprovedBids.length}</span>
              </div>
              <div
                className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between"
                style={{ boxShadow: '3.08px 3.08px 3.08px 0px #338ACD1A inset' }}
              >
                <p className="text-sm font-bold text-gray-700">Total Value</p>
                <span className="text-3xl font-bold text-green-500">
                  ${managerApprovedBids.reduce((sum, bid) => sum + (bid.currentRate || 0), 0).toLocaleString()}
                </span>
              </div>
              <div
                className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between"
                style={{ boxShadow: '3.08px 3.08px 3.08px 0px #338ACD1A inset' }}
              >
                <button
                  onClick={handleExportToCSV}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200"
                >
                  <FaDownload size={16} />
                  <span className="text-sm font-semibold">Export to CSV</span>
                </button>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'manager-rejected' && (
          <div className="mt-3 space-y-3">
            <div className="bg-white rounded-2xl w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search manager rejected bids"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 pl-9 pr-10 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div
                className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between"
                style={{ boxShadow: '3.08px 3.08px 3.08px 0px #338ACD1A inset' }}
              >
                <p className="text-sm font-bold text-gray-700">Manager Rejected</p>
                <span className="text-3xl font-bold text-green-500">{managerRejectedBids.length}</span>
              </div>
              <div
                className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between"
                style={{ boxShadow: '3.08px 3.08px 3.08px 0px #338ACD1A inset' }}
              >
                <p className="text-sm font-bold text-gray-700">Total Value</p>
                <span className="text-3xl font-bold text-green-500">
                  ${managerRejectedBids.reduce((sum, bid) => sum + (bid.currentRate || 0), 0).toLocaleString()}
                </span>
              </div>
              <div
                className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between"
                style={{ boxShadow: '3.08px 3.08px 3.08px 0px #338ACD1A inset' }}
              >
                <button
                  onClick={handleExportToCSV}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200"
                >
                  <FaDownload size={16} />
                  <span className="text-sm font-semibold">Export to CSV</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tab Switching Loader */}
      {tabSwitchingLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              Loading {activeTab === 'pending' ? 'Pending Bids' :
                           activeTab === 'completed' ? 'Approved Rates' :
                           activeTab === 'accepted' ? 'Accepted Bids' :
                           activeTab === 'manager-approved' ? 'Manager Approved' :
                           activeTab === 'manager-rejected' ? 'Manager Rejected' : 'Tab'}...
            </p>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {!tabSwitchingLoading && activeTab === 'pending' && (
        <div className="space-y-4">
          {viewDoc && selectedRate ? (
            <div className="bg-white rounded-2xl p-8 max-w-3xl mx-auto">
              <div className="flex justify-between items-center mb-8">
                <div className="flex gap-4">
                  <button
                    onClick={() => setModalType('approval')}
                    className="flex items-center gap-1 bg-gradient-to-r from-green-500 to-green-700 text-white px-5 py-2 rounded-full hover:from-green-600 hover:to-green-800 transition"
                  >
                    <CheckCircle size={18} /> Approve
                  </button>
                  <button
                    onClick={() => setModalType('rejection')}
                    className="flex items-center gap-1 bg-gradient-to-r from-red-500 to-red-700 text-white px-5 py-2 rounded-full hover:from-red-600 hover:to-red-800 transition"
                  >
                    <XCircle size={18} /> Reject
                  </button>
                  <button
                    onClick={() => setModalType('resubmit')}
                    className="flex items-center gap-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-5 py-2 rounded-full hover:from-blue-600 hover:to-purple-700 transition"
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
                <div className="border rounded-2xl p-6 bg-gradient-to-br from-green-50 to-white flex flex-col gap-2">
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
                    className="rounded-xl max-h-[250px] w-full object-contain border border-green-100 cursor-pointer hover:scale-105 transition"
                    onClick={() => setPreviewImg(`${API_CONFIG.BASE_URL}/${selectedRate.docUpload}`)}
                  />
                  <div className="text-xs text-gray-400 mt-2">Click image to preview</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden px-2">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-separate border-spacing-y-3 border-spacing-x-0">
                  <thead>
                    <tr className="bg-gray-100 text-xs uppercase text-gray-600">
                      <th className="text-left text-gray-800 py-3 px-4 font-bold whitespace-nowrap tracking-wide rounded-l-xl">Bid ID / Load ID</th>
                      <th className="text-left text-gray-800 py-3 px-4 font-bold tracking-wide">Origin</th>
                      <th className="text-left text-gray-800 py-3 px-4 font-bold tracking-wide">Destination</th>
                      <th className="text-left text-gray-800 py-3 px-4 font-bold tracking-wide">Rate</th>
                      <th className="text-left text-gray-800 py-3 px-4 font-bold tracking-wide">Shipper</th>
                      <th className="text-left text-gray-800 py-3 px-4 font-bold tracking-wide">Trucker</th>
                      <th className="text-left text-gray-800 py-3 px-4 font-bold whitespace-nowrap tracking-wide">CMT User</th>
                      <th className="text-left text-gray-800 py-3 px-4 font-bold whitespace-nowrap tracking-wide">Date & Time</th>
                      <th className="text-center text-gray-800 py-3 px-4 font-bold tracking-wide rounded-r-xl">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRates.map((rate) => (
                      <tr key={rate.id} className="bg-white hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-4 border-y border-l border-gray-200 rounded-l-xl">
                          <div className="text-sm font-semibold text-gray-800">{rate.id}</div>
                          <div className="text-xs text-gray-400">{rate.loadId}</div>
                        </td>
                        <td className="py-3 px-4 border-y border-gray-200">
                          <div className="text-sm text-gray-800">{rate.origin}</div>
                          <div className="text-xs text-gray-400">{rate.origin.split(', ')[1] || ''}</div>
                        </td>
                        <td className="py-3 px-4 border-y border-gray-200">
                          <div className="text-sm text-gray-800">{rate.destination}</div>
                          <div className="text-xs text-gray-400">{rate.destination.split(', ')[1] || ''}</div>
                        </td>
                        <td className="py-3 px-4 border-y border-gray-200">
                          <span className="text-sm font-semibold text-green-600">${rate.rate.toLocaleString()}</span>
                        </td>
                        <td className="py-3 px-4 border-y border-gray-200">
                          <div className="text-sm text-gray-800">{rate.shipperInfo?.compName || 'N/A'}</div>
                          {rate.shipperInfo?.mc_dot_no && (
                            <div className="text-xs text-gray-400">MC: {rate.shipperInfo.mc_dot_no}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 border-y border-gray-200">
                          <div className="text-sm text-gray-800">{rate.truckerName}</div>
                          {rate.carrierInfo && (
                            <div className="text-xs text-gray-400">MC: {rate.carrierInfo.mcDotNo}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 border-y border-gray-200">
                          <div className="text-sm text-gray-800">{rate.placedByCMTUser?.employeeName || 'N/A'}</div>
                          {rate.placedByCMTUser?.empId && (
                            <div className="text-xs text-gray-400">ID: {rate.placedByCMTUser.empId}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 border-y border-gray-200">
                          <div className="text-sm text-gray-800">{rate.createdAt || 'N/A'}</div>
                          <div className="text-xs text-gray-400">
                            {rate.createdAt ? new Date(rate.createdAt).toLocaleTimeString() : 'N/A'}
                          </div>
                        </td>
                        <td className="py-3 px-4 border-y border-r border-gray-200 rounded-r-xl">
                          <div className="flex gap-2">
                          <button
  onClick={() => {
    const loadId = rate.actualLoadId || rate.loadId?.replace(/^L-/, '') || rate.loadId || rate.rateNum;
    const receiverEmpId = rate.salesUserInfo?.empId || rate.load?.createdBySalesUser?.empId;
    const receiverName =
      rate.salesUserInfo?.empName ||
      rate.salesUserInfo?.employeeName ||
      rate.load?.createdBySalesUser?.empName ||
      'Sales User';

    if (!receiverEmpId) {
      alertify.error('Unable to determine receiver. Please check the bid information.');
      return;
    }

    if (!loadId) {
      alertify.error('Unable to determine load ID. Please check the bid information.');
      return;
    }

    setChatModal({
      visible: true,
      loadId,
      receiverEmpId,
      receiverName
    });
  }}
  className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-500 text-white transition-all duration-300 transform hover:scale-105 mr-2"
  title="Chat"
>
  Chat
</button>

<button
  onClick={() => {
    setMarginAmount(0);
    setEditableMessage(rate.remarks || '');
    setFinalPriceMode(false);
    setFinalPriceAmount(0);
    setApprovalModal({ visible: true, type: 'manual', rate });
  }}
  disabled={actionLoading[rate.rateNum]}
  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold whitespace-nowrap rounded-lg transition-all duration-300 transform hover:scale-105 ${
    actionLoading[rate.rateNum] === 'manual'
      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
      : 'bg-green-500 text-white hover:bg-green-600'
  }`}
>
  {actionLoading[rate.rateNum] === 'manual' ? 'Approving...' : 'Add Margin'}
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
            <div className="flex justify-between items-center mt-6 bg-white rounded-2xl p-4 border border-gray-200">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredRates.length)} of {filteredRates.length} pending bids
                {searchTerm && ` (filtered from ${activeTabRates.length} total)`}
              </div>

              <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-2">
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

                <div className="flex items-center gap-1">
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
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                          : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                          }`}
                      >
                        {page}
                      </button>
                    ))}

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
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden px-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-y-3 border-spacing-x-0">
                <thead>
                  <tr className="bg-gray-100 text-xs uppercase text-gray-600">
                    <th className="text-left text-gray-800 py-3 px-4 font-bold whitespace-nowrap tracking-wide rounded-l-xl">Bid ID / Load ID</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold tracking-wide w-48">Origin</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold tracking-wide w-48">Destination</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold whitespace-nowrap tracking-wide">Original Rate</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold whitespace-nowrap tracking-wide">Intermediate Rate</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold tracking-wide">Shipper</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold tracking-wide">Trucker</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold whitespace-nowrap tracking-wide">Date & Time</th>
                    <th className="text-center text-gray-800 py-3 px-4 font-bold tracking-wide rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRates.map((rate, index) => (
                    <tr key={rate.id} className="bg-white hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 px-4 border-y border-l border-gray-200 rounded-l-xl">
                        <div className="text-sm font-semibold text-gray-800">{rate.id}</div>
                        <div className="text-xs text-gray-400">{rate.loadId}</div>
                      </td>
                      <td className="py-3 px-4 border-y border-gray-200">
                        <div>
                          <span className="font-medium text-gray-700">{rate.origin}</span>
                          <p className="text-xs text-gray-500">{rate.origin.split(', ')[1] || ''}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 border-y border-gray-200">
                        <div>
                          <span className="font-medium text-gray-700">{rate.destination}</span>
                          <p className="text-xs text-gray-500">{rate.destination.split(', ')[1] || ''}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 border-y border-gray-200">
                        <span className="font-bold text-blue-600">${rate.originalRate?.toLocaleString() || '0'}</span>
                      </td>
                      <td className="py-3 px-4 border-y border-gray-200">
                      <div>
  <span className="font-bold text-green-600">
    ${Number(rate.intermediateRate || 0).toLocaleString()}
  </span>

  {rate.approvalStatus && (
    <p className="text-xs text-gray-500">
      Diff: $
      {Number(rate.approvalStatus.rateDifference || 0).toFixed(2)}
      {' '}
      (
      {Number(rate.approvalStatus.rateDifferencePercentage || 0).toFixed(2)}
      %)
    </p>
  )}
</div>

                      </td>
                      <td className="py-3 px-4 border-y border-gray-200">
                        <div>
                          <p className="font-medium text-gray-700">{rate.shipperInfo?.compName || 'N/A'}</p>
                          {rate.shipperInfo?.mc_dot_no && (
                            <p className="text-xs text-gray-500">MC: {rate.shipperInfo.mc_dot_no}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 border-y border-gray-200">
                        <div>
                          <p className="font-medium text-gray-700">{rate.truckerName}</p>
                          {rate.carrierInfo && (
                            <p className="text-xs text-gray-500">MC: {rate.carrierInfo.mcDotNo}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 border-y border-gray-200">
                        <div>
                          <p className="font-medium text-gray-700">{rate.createdAt || 'N/A'}</p>
                          <p className="text-xs text-gray-500">
                            {rate.createdAt ? new Date(rate.createdAt).toLocaleTimeString() : 'N/A'}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4 border-y border-r border-gray-200 rounded-r-xl">
                        <div className="flex gap-2">
                          {/* <button
                            onClick={() => {
                              setMarginAmount(0); // Reset margin when opening modal
                              setEditableMessage(rate.remarks || ''); // Initialize editable message
                              setFinalPriceMode(false); // Reset final price mode
                              setFinalPriceAmount(0); // Reset final price
                              setApprovalModal({ visible: true, type: 'manual', rate });
                            }}
                            disabled={actionLoading[rate.rateNum]}
                            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 ${actionLoading[rate.rateNum] === 'manual'
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
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
                                <span>Add Margin</span>
                              </>
                            )}
                          </button> */}
                          {/* Enter Final Price Button - Only show in Approved Rates tab */}
                          {activeTab === 'completed' && (
                            <button
                              onClick={() => {
                                setFinalPriceModalAmount(0); // Reset final price amount
                                setFinalPriceModalMessage(rate.remarks || ''); // Initialize message
                                setFinalPriceModal({ visible: true, rate });
                              }}
                              disabled={actionLoading[rate.rateNum]}
                              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all duration-300 transform hover:scale-105 ${actionLoading[rate.rateNum]
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700'
                                }`}
                            >
                              {/* <DollarSign size={12} /> */}
                              <span>Enter Final Price</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleNegotiateBid(rate)}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:from-orange-600 hover:to-amber-700"
                          >
                            {/* <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg> */}
                            <span>Negotiate</span>
                          </button>
                          {/* Accept Bid button commented out for Approved Rates tab */}
                          {/* <button
                            onClick={() => handleAcceptBid(rate)}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700"
                          >
                            <CheckCircle size={12} />
                            <span>Accept Bid</span>
                          </button> */}
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
      {!tabSwitchingLoading && activeTab === 'accepted' && (
        <div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden px-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-y-3 border-spacing-x-0">
                <thead>
                  <tr className="bg-gray-100 text-xs uppercase text-gray-600">
                    <th className="text-left whitespace-nowrap text-gray-800 py-3 px-4 font-bold tracking-wide rounded-l-xl">Bid ID / Load ID</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold tracking-wide w-48">Origin</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold tracking-wide w-48">Destination</th>
                    <th className="text-left whitespace-nowrap text-gray-800 py-3 px-4 font-bold tracking-wide">Original Rate</th>
                    <th className="text-left whitespace-nowrap text-gray-800 py-3 px-4 font-bold tracking-wide">Intermediate Rate</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold tracking-wide">Shipper</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold tracking-wide">Trucker</th>
                    <th className="text-left whitespace-nowrap text-gray-800 py-3 px-4 font-bold tracking-wide rounded-r-xl">Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRates.map((rate, index) => (
                    <tr key={rate.id} className="bg-white hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 px-4 border-y border-l border-gray-200 rounded-l-xl">
                        <div className="text-sm font-semibold text-gray-800">{rate.id}</div>
                        <div className="text-xs text-gray-400">{rate.loadId}</div>
                      </td>
                      <td className="py-3 px-4 border-y border-gray-200">
                        <div>
                          <span className="font-medium text-gray-700">{rate.origin}</span>
                          <p className="text-xs text-gray-500">{rate.origin.split(', ')[1] || ''}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 border-y border-gray-200">
                        <div>
                          <span className="font-medium text-gray-700">{rate.destination}</span>
                          <p className="text-xs text-gray-500">{rate.destination.split(', ')[1] || ''}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 border-y border-gray-200">
                        <span className="font-bold text-blue-600">${rate.originalRate?.toLocaleString() || '0'}</span>
                      </td>
                      <td className="py-3 px-4 border-y border-gray-200">
                                              <div>
  <span className="font-bold text-green-600">
    ${Number(rate.intermediateRate || 0).toLocaleString()}
  </span>

  {rate.rateDifference !== undefined && rate.rateDifference !== null && (
    <p className="text-xs text-gray-500">
      Diff: $
      {Number(rate.rateDifference || 0).toFixed(2)}
      {' '}
      (
      {Number(rate.rateDifferencePercentage || 0).toFixed(2)}
      %)
    </p>
  )}
</div>
                      </td>
                      <td className="py-3 px-4 border-y border-gray-200">
                        <div>
                          <p className="font-medium text-gray-700">{rate.shipperInfo?.compName || 'N/A'}</p>
                          {rate.shipperInfo?.mc_dot_no && (
                            <p className="text-xs text-gray-500">MC: {rate.shipperInfo.mc_dot_no}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 border-y border-gray-200">
                        <div>
                          <p className="font-medium text-gray-700">{rate.truckerName}</p>
                          {rate.carrierInfo && (
                            <p className="text-xs text-gray-500">MC: {rate.carrierInfo.mcDotNo}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 border-y border-r border-gray-200 rounded-r-xl">
                        <div>
                          <p className="font-medium text-gray-700">{rate.acceptedAt || rate.createdAt || 'N/A'}</p>
                          <p className="text-xs text-gray-500">
                            {(rate.acceptedAt || rate.createdAt) ? new Date(rate.acceptedAt || rate.createdAt).toLocaleTimeString() : 'N/A'}
                          </p>
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

      {/* Manager Approved Bids Tab Content */}
      {activeTab === 'manager-approved' && (
        <div>
          {/* Manager Approved Bids Table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden px-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-y-3 border-spacing-x-0">
                <thead>
                  <tr className="bg-gray-100 text-xs uppercase text-gray-600">
                    <th className="text-left text-gray-800 py-3 px-4 font-bold whitespace-nowrap tracking-wide rounded-l-xl">Bid ID / Load ID</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold tracking-wide w-48">Origin</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold tracking-wide w-48">Destination</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold whitespace-nowrap tracking-wide">Original Rate</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold whitespace-nowrap tracking-wide">Current Rate</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold whitespace-nowrap tracking-wide">Rate Diff %</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold tracking-wide">Shipper</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold whitespace-nowrap tracking-wide">Carrier</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold whitespace-nowrap tracking-wide">Driver Info</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold whitespace-nowrap tracking-wide rounded-r-xl">Approved Date</th>
                    {/* <th className="text-left py-3 px-4 font-semibold tracking-wide">Action</th> */}
                  </tr>
                </thead>
                <tbody>
                  {managerBidsLoading ? (
                    <tr>
                      <td colSpan="12" className="py-12 text-center">
                        <div className="flex justify-center items-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mr-3"></div>
                          <span className="text-gray-600">Loading manager approved bids...</span>
                        </div>
                      </td>
                    </tr>
                  ) : managerApprovedBids.length === 0 ? (
                    <tr>
                      <td colSpan="12" className="py-12 text-center">
                        <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">No manager approved bids found</p>
                        <p className="text-gray-400 text-sm">No bids have been approved by manager yet</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRates
                      .slice(startIndex, endIndex)
                      .map((bid, index) => (
                        <tr key={bid.id} className="bg-white hover:bg-gray-50/60 transition-colors">
                          <td className="py-3 px-4 border-y border-l border-gray-200 rounded-l-xl">
                            <div className="text-sm font-semibold text-gray-800">{bid.id}</div>
                            <div className="text-xs text-gray-400">{bid.loadId}</div>
                          </td>
                          <td className="py-3 px-4 border-y border-gray-200">
                            <div>
                              <span className="font-medium text-gray-700">{bid.origin}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 border-y border-gray-200">
                            <div>
                              <span className="font-medium text-gray-700">{bid.destination}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 border-y border-gray-200">
                            <span className="font-medium text-gray-600">${bid.originalRate.toLocaleString()}</span>
                          </td>
                          <td className="py-3 px-4 border-y border-gray-200">
                            <span className="font-bold text-green-600">${bid.currentRate.toLocaleString()}</span>
                          </td>
                          <td className="py-3 px-4 border-y border-gray-200">
                            <span className={`font-bold ${parseFloat(bid.rateDifferencePercentage) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {bid.rateDifferencePercentage}%
                            </span>
                          </td>
                          <td className="py-3 px-4 border-y border-gray-200">
                            <div>
                              <p className="font-medium text-gray-700">{bid.shipperName}</p>
                              <p className="text-xs text-gray-500">MC: {bid.shipperInfo?.mc_dot_no || 'N/A'}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 border-y border-gray-200">
                            <div>
                              <p className="font-medium text-gray-700">{bid.truckerName}</p>
                              <p className="text-xs text-gray-500">MC: {bid.carrierInfo?.mcDotNo || 'N/A'}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 border-y border-gray-200">
                            <div>
                              <p className="font-medium text-gray-700">{bid.driverName}</p>
                              <p className="text-xs text-gray-500">Phone: {bid.driverPhone}</p>
                              <p className="text-xs text-gray-500">Vehicle: {bid.vehicleNumber}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 border-y border-r border-gray-200 rounded-r-xl">
                            <div>
                              <p className="font-medium text-gray-700">{bid.approvedAt}</p>
                              <p className="text-xs text-gray-500">By: {bid.approvedBy}</p>
                            </div>
                          </td>
                          {/* <td className="py-2 px-3">
                            <button
                              onClick={() => handleViewBid(bid)}
                              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1 rounded-lg text-sm hover:from-green-600 hover:to-emerald-700 transition-all duration-200"
                            >
                              View Details
                            </button>
                          </td> */}
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Manager Rejected Bids Tab Content */}
      {!tabSwitchingLoading && activeTab === 'manager-rejected' && (
        <div>
          {/* Manager Rejected Bids Table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden px-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-y-3 border-spacing-x-0">
                <thead>
                  <tr className="bg-gray-100 text-xs uppercase text-gray-600">
                    <th className="text-left text-gray-800 py-3 px-4 font-bold whitespace-nowrap tracking-wide rounded-l-xl">Bid ID / Load ID</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold tracking-wide w-48">Origin</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold tracking-wide w-48">Destination</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold whitespace-nowrap tracking-wide">Original Rate</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold whitespace-nowrap tracking-wide">Current Rate</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold whitespace-nowrap tracking-wide">Rate Diff %</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold tracking-wide">Shipper</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold tracking-wide">Carrier</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold whitespace-nowrap tracking-wide">Rejection Reason</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold whitespace-nowrap tracking-wide">Rejected Date</th>
                    <th className="text-left text-gray-800 py-3 px-4 font-bold tracking-wide rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {managerBidsLoading ? (
                    <tr>
                      <td colSpan="12" className="py-12 text-center">
                        <div className="flex justify-center items-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mr-3"></div>
                          <span className="text-gray-600">Loading manager rejected bids...</span>
                        </div>
                      </td>
                    </tr>
                  ) : managerRejectedBids.length === 0 ? (
                    <tr>
                      <td colSpan="12" className="py-12 text-center">
                        <XCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">No manager rejected bids found</p>
                        <p className="text-gray-400 text-sm">No bids have been rejected by manager yet</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRates
                      .slice(startIndex, endIndex)
                      .map((bid, index) => (
                        <tr key={bid.id} className="bg-white hover:bg-gray-50/60 transition-colors">
                          <td className="py-3 px-4 border-y border-l border-gray-200 rounded-l-xl">
                            <div className="text-sm font-semibold text-gray-800">{bid.id}</div>
                            <div className="text-xs text-gray-400">{bid.loadId}</div>
                          </td>
                          <td className="py-3 px-4 border-y border-gray-200">
                            <div>
                              <span className="font-medium text-gray-700">{bid.origin}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 border-y border-gray-200">
                            <div>
                              <span className="font-medium text-gray-700">{bid.destination}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 border-y border-gray-200">
                            <span className="font-medium text-gray-600">${bid.originalRate.toLocaleString()}</span>
                          </td>
                          <td className="py-3 px-4 border-y border-gray-200">
                            <span className="font-bold text-red-600">${bid.currentRate.toLocaleString()}</span>
                          </td>
                          <td className="py-3 px-4 border-y border-gray-200">
                            <span className={`font-bold ${parseFloat(bid.rateDifferencePercentage) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {bid.rateDifferencePercentage}%
                            </span>
                          </td>
                          <td className="py-3 px-4 border-y border-gray-200">
                            <div>
                              <p className="font-medium text-gray-700">{bid.shipperName}</p>
                              <p className="text-xs text-gray-500">MC: {bid.shipperInfo?.mc_dot_no || 'N/A'}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 border-y border-gray-200">
                            <div>
                              <p className="font-medium text-gray-700">{bid.truckerName}</p>
                              <p className="text-xs text-gray-500">MC: {bid.carrierInfo?.mcDotNo || 'N/A'}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 border-y border-gray-200">
                            <div className="max-w-xs">
                              <p className="text-sm text-red-600 truncate" title={bid.rejectionReason}>
                                {bid.rejectionReason}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4 border-y border-gray-200">
                            <div>
                              <p className="font-medium text-gray-700">{bid.rejectedAt}</p>
                              <p className="text-xs text-gray-500">By: {bid.rejectedBy}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 border-y border-r border-gray-200 rounded-r-xl">
                            <button
                              onClick={() => handleViewBid(bid)}
                              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1 rounded-lg text-sm hover:from-blue-600 hover:to-indigo-700 transition-all duration-200"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Pagination */}
      {totalPages > 1 && filteredRates.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl p-4 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredRates.length)} of {filteredRates.length} bids/rates
            {searchTerm && ` (filtered from ${activeTabRates.length} total)`}
          </div>

          <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-2">
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
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
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
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto hide-scrollbar"
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
      {approvalModal.visible && (
        <>
          {console.log('Modal rate data:', approvalModal.rate)}
          {console.log('Rates array:', approvalModal.rate?.rates)}
          {console.log('Totalrates:', approvalModal.rate?.totalrates)}
        </>
      )}
      {approvalModal.visible && (
        <div className="fixed inset-0 z-[9999] backdrop-blur-sm bg-black/30 flex items-center justify-center p-4">
          <style>{`
            .approval-modal-scroll::-webkit-scrollbar {
              display: none;
            }
            .approval-modal-scroll {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>
          <div className="bg-white rounded-3xl w-full max-w-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto approval-modal-scroll">
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

                {/* Return Address Card - Show only if return data exists */}
                {(approvalModal.rate.returnAddress || approvalModal.rate.returnCity || approvalModal.rate.returnState || approvalModal.rate.returnZip) && (
                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-100 col-span-2">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                      <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Return</span>
                    </div>
                    <div className="space-y-1">
                      {approvalModal.rate.returnAddress && (
                        <p className="text-sm font-medium text-gray-800">{approvalModal.rate.returnAddress}</p>
                      )}
                      <p className="text-sm text-gray-700">
                        {[
                          approvalModal.rate.returnCity,
                          approvalModal.rate.returnState,
                          approvalModal.rate.returnZip
                        ].filter(Boolean).join(', ') || 'N/A'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Attachment Section */}
              {approvalModal.rate.attachment && (
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-700">Uploaded Document</span>
                  </div>
                  
                  <div className="relative">
                    <img
                      src={approvalModal.rate.attachment}
                      alt="Bid Attachment"
                      className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div 
                      className="hidden w-full h-32 bg-gray-100 rounded-lg border-2 border-gray-200 items-center justify-center"
                    >
                      <div className="text-center">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm text-gray-500">Document Preview</p>
                        <p className="text-xs text-gray-400">Click to view full size</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between">
                    <a
                      href={approvalModal.rate.attachment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View Full Size
                    </a>
                    <span className="text-xs text-gray-500">
                      {approvalModal.rate.attachment.split('/').pop()}
                    </span>
                  </div>
                </div>
              )}

              {/* Rates Array Display Section */}
              {approvalModal.rate && approvalModal.rate.rates && Array.isArray(approvalModal.rate.rates) && approvalModal.rate.rates.length > 0 ? (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="text-blue-600" size={18} />
                    <label className="text-sm font-semibold text-gray-700">Rate Breakdown</label>
                  </div>
                  <div className="bg-white rounded-lg border border-blue-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-blue-100">
                        <tr>
                          <th className="text-left py-2 px-3 text-blue-800 font-semibold">Charge Name</th>
                          <th className="text-center py-2 px-3 text-blue-800 font-semibold">Quantity</th>
                          <th className="text-right py-2 px-3 text-blue-800 font-semibold">Amount</th>
                          <th className="text-right py-2 px-3 text-blue-800 font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {approvalModal.rate.rates.map((rateItem, index) => (
                          <tr key={rateItem._id || index} className={`border-b border-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'}`}>
                            <td className="py-2 px-3 text-gray-800 font-medium">{rateItem.name || 'N/A'}</td>
                            <td className="py-2 px-3 text-center text-gray-700">{rateItem.quantity || 0}</td>
                            <td className="py-2 px-3 text-right text-gray-700">${(rateItem.amount || 0).toLocaleString()}</td>
                            <td className="py-2 px-3 text-right text-green-700 font-semibold">${((rateItem.total || rateItem.amount * rateItem.quantity) || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-green-50 border-t-2 border-green-200">
                        <tr>
                          <td colSpan="3" className="py-3 px-3 text-right font-bold text-gray-800">Total Rate:</td>
                          <td className="py-3 px-3 text-right font-bold text-green-700 text-lg">
                            ${(approvalModal.rate.totalrates || approvalModal.rate.rate || 0).toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : approvalModal.rate?.totalrates ? (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="text-blue-600" size={18} />
                    <label className="text-sm font-semibold text-gray-700">Total Rate</label>
                  </div>
                  <div className="bg-white rounded-lg border border-blue-100 p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-700">
                        ${(approvalModal.rate.totalrates || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Total rate amount</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Rate Input Section */}
              {approvalModal.type === 'manual' ? (
                <div className="space-y-4">
                  {/* Base Rate Display (Readonly) */}
                  <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="text-blue-600" size={18} />
                      <label className="text-sm font-semibold text-gray-700">
                        Original Rate Amount
                      </label>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">$</span>
                      <input
                        type="number"
                        readOnly
                        className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-semibold bg-gray-50 text-gray-700"
                        value={approvalModal.rate?.rate || 0}
                      />
                    </div>
                  </div>

                  {/* Add Margin Input */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-3">
                      <PlusCircle className="text-green-600" size={18} />
                      <label className="text-sm font-semibold text-gray-700">
                        Add Margin Amount *
                      </label>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">$</span>
                      <input
                        type="number"
                        required
                        min={0}
                        step="0.01"
                        className="w-full pl-8 pr-4 py-3 border-2 border-green-300 rounded-lg text-lg font-semibold transition-all duration-200 focus:border-green-500 focus:ring-2 focus:ring-green-100"
                        value={marginAmount || ''}
                        onChange={(e) => {
                          const v = e.target.value === '' ? 0 : Number(e.target.value);
                          setMarginAmount(v);
                          setApprovalError('');
                        }}
                        placeholder="Enter margin amount"
                      />
                    </div>
                    {approvalError && (
                      <p className="mt-2 text-xs font-medium text-red-600">{approvalError}</p>
                    )}
                  </div>

                  {/* Total Amount (Readonly) */}
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="text-purple-600" size={18} />
                      <label className="text-sm font-semibold text-gray-700">
                        Total (Rate + Margin) *
                      </label>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">$</span>
                      <input
                        type="text"
                        readOnly
                        className="w-full pl-8 pr-4 py-3 border-2 border-purple-300 rounded-lg text-lg font-bold bg-purple-50 text-purple-700"
                        value={((Number(approvalModal.rate?.rate || 0)) + (Number(marginAmount || 0))).toFixed(2)}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="text-green-600" size={18} />
                    <label className="text-sm font-semibold text-gray-700">
                      Original Rate Amount
                    </label>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">$</span>
                    <input
                      type="number"
                      readOnly
                      className="w-full pl-8 pr-4 py-3 border-2 border-blue-300 rounded-lg text-lg font-semibold bg-gray-50 text-gray-700"
                      value={approvalModal.rate?.originalRate || ''}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <Clock size={12} />
                    Auto-approval uses the original bid rate
                  </p>
                </div>
              )}

              {/* Message Section - Editable */}
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <label className="text-sm font-semibold text-gray-700">Message</label>
                </div>
                <div className="bg-white rounded-lg border border-gray-200">
                  <textarea
                    value={editableMessage}
                    onChange={(e) => setEditableMessage(e.target.value)}
                    rows={3}
                    className="w-full p-3 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-800 leading-relaxed resize-none"
                    placeholder="Enter message or notes..."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setApprovalModal({ visible: false, type: null, rate: null });
                    setMarginAmount(0); // Reset margin when modal closes
                    setEditableMessage(''); // Reset editable message
                    setFinalPriceMode(false); // Reset final price mode
                    setFinalPriceAmount(0); // Reset final price
                  }}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all duration-200 hover:border-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (approvalModal.type === 'manual') {
                      // Regular margin mode
                      const baseRate = Number(approvalModal.rate?.rate || 0);
                      const margin = Number(marginAmount || 0);
                      const total = baseRate + margin;
                      
                      if (!Number.isFinite(total) || total <= 0) {
                        setApprovalError('Please enter a valid margin amount. Total must be greater than 0.');
                        alertify.error('Please enter a valid margin amount. Total must be greater than 0.');
                        return;
                      }
                      
                      if (margin < 0) {
                        setApprovalError('Margin amount cannot be negative.');
                        alertify.error('Margin amount cannot be negative.');
                        return;
                      }
                      
                      await handleManualApprove(approvalModal.rate.rateNum, total, editableMessage);
                      setMarginAmount(0); // Reset margin after submission
                    } else {
                      await handleAutoApprove(approvalModal.rate.rateNum);
                    }
                    setApprovalModal({ visible: false, type: null, rate: null });
                    setMarginAmount(0); // Reset margin when modal closes
                    setEditableMessage(''); // Reset editable message
                    setFinalPriceMode(false); // Reset final price mode
                    setFinalPriceAmount(0); // Reset final price
                  }}
                  disabled={!!actionLoading[approvalModal.rate?.rateNum]}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-105 ${
                    approvalModal.type === 'manual'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                      : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                  } ${actionLoading[approvalModal.rate?.rateNum] ? 'opacity-70 cursor-not-allowed transform-none' : ''}`}
                >
                  {actionLoading[approvalModal.rate?.rateNum] ? (
                    <div className="flex items-center justify-center gap-2">
                       <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                       <span>Processing...</span>
                    </div>
                  ) : (
                    approvalModal.type === 'manual' ? 'Approve Bid' : 'Auto Approve'
                  )}
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
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto hide-scrollbar"
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

      {/* Final Price Modal */}
      {finalPriceModal.visible && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <DollarSign className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Enter Final Price</h2>
                    <p className="text-purple-100">Set final bid amount for {finalPriceModal.rate?.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFinalPriceModal({ visible: false, rate: null });
                    setFinalPriceModalAmount(0);
                    setFinalPriceModalMessage('');
                  }}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Original Rate Display */}
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="text-blue-600" size={18} />
                  <label className="text-sm font-semibold text-gray-700">
                    Original Rate Amount
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">$</span>
                  <input
                    type="number"
                    readOnly
                    className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-semibold bg-gray-50 text-gray-700"
                    value={finalPriceModal.rate?.originalRate || 0}
                  />
                </div>
              </div>

              {/* Message Section - Editable */}
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <label className="text-sm font-semibold text-gray-700">Message</label>
                </div>
                <div className="bg-white rounded-lg border border-gray-200">
                  <textarea
                    value={finalPriceModalMessage}
                    onChange={(e) => setFinalPriceModalMessage(e.target.value)}
                    rows={3}
                    className="w-full p-3 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-800 leading-relaxed resize-none"
                    placeholder="Enter message or notes..."
                  />
                </div>
              </div>

              {/* Final Price Input */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="text-purple-600" size={18} />
                  <label className="text-sm font-semibold text-gray-700">
                    Final Bid Amount *
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">$</span>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    className="w-full pl-8 pr-4 py-3 border-2 border-purple-300 rounded-lg text-lg font-semibold transition-all duration-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    value={finalPriceModalAmount || ''}
                    onChange={(e) => {
                      const v = e.target.value === '' ? 0 : Number(e.target.value);
                      setFinalPriceModalAmount(v);
                    }}
                    placeholder="Enter final bid amount"
                  />
                </div>
                
                {/* Show 10% calculation info */}
                {finalPriceModalAmount > 0 && (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-purple-200">
                    <div className="text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Original Rate Amount:</span>
                        <span className="font-semibold">${(Number(finalPriceModal.rate?.originalRate || 0)).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>10% of Original Rate:</span>
                        <span className="font-semibold">${(Number(finalPriceModal.rate?.originalRate || 0) * 0.1).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1 mt-1">
                        <span>Max Amount (Original + 10%):</span>
                        <span className="font-semibold">${(Number(finalPriceModal.rate?.originalRate || 0) * 1.1).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between mt-2 pt-2 border-t">
                        <span>Your Final Price:</span>
                        <span className={`font-bold ${
                          finalPriceModalAmount <= (Number(finalPriceModal.rate?.originalRate || 0) * 1.1)
                            ? 'text-orange-600'
                            : 'text-green-600'
                        }`}>
                          ${finalPriceModalAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-2 text-center">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          finalPriceModalAmount <= (Number(finalPriceModal.rate?.originalRate || 0) * 1.1)
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {finalPriceModalAmount <= (Number(finalPriceModal.rate?.originalRate || 0) * 1.1)
                            ? 'Will be sent to Manager'
                            : 'Will be submitted directly'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setFinalPriceModal({ visible: false, rate: null });
                    setFinalPriceModalAmount(0);
                    setFinalPriceModalMessage('');
                  }}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all duration-200 hover:border-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const baseRate = Number(finalPriceModal.rate?.originalRate || 0);
                    const finalPrice = Number(finalPriceModalAmount || 0);
                    
                    if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
                      alertify.error('Please enter a valid final price amount. Amount must be greater than 0.');
                      return;
                    }
                    
                    // Check if final price is within 10% of base rate
                    const tenPercentOfBase = baseRate * 0.1;
                    const maxAllowedAmount = baseRate + tenPercentOfBase;
                    
                    if (finalPrice <= maxAllowedAmount) {
                      // Within 10% - show "Send to Manager" functionality
                      alertify.confirm('Send to Manager', 
                        `The final price ($${finalPrice.toLocaleString()}) is within 10% of the original rate amount ($${baseRate.toLocaleString()}). This will be sent to the manager for approval.`,
                        async function() {
                          // Send to manager API call with negotiated price
                          const forwardMessage = finalPriceModalMessage || `Negotiated price is $${finalPrice}`;
                          await handleSendToManager(finalPriceModal.rate.rateNum, finalPrice, forwardMessage);
                          setFinalPriceModal({ visible: false, rate: null });
                          setFinalPriceModalAmount(0);
                          setFinalPriceModalMessage('');
                        },
                        function() {
                          // Cancel - do nothing
                        }
                      );
                      return;
                    } else {
                      // Above 10% - proceed with normal submission
                      await handleManualApprove(finalPriceModal.rate.rateNum, finalPrice, finalPriceModalMessage);
                      setFinalPriceModal({ visible: false, rate: null });
                      setFinalPriceModalAmount(0);
                      setFinalPriceModalMessage('');
                    }
                  }}
                  disabled={!!actionLoading[finalPriceModal.rate?.rateNum]}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-105 ${
                    (() => {
                      const baseRate = Number(finalPriceModal.rate?.originalRate || 0);
                      const finalPrice = Number(finalPriceModalAmount || 0);
                      const tenPercentOfBase = baseRate * 0.1;
                      const maxAllowedAmount = baseRate + tenPercentOfBase;
                      
                      return finalPrice > 0 && finalPrice <= maxAllowedAmount
                        ? 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700'
                        : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700';
                    })()
                  } ${actionLoading[finalPriceModal.rate?.rateNum] ? 'opacity-70 cursor-not-allowed transform-none' : ''}`}
                >
                  {actionLoading[finalPriceModal.rate?.rateNum] ? (
                    <div className="flex items-center justify-center gap-2">
                       <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                       <span>Processing...</span>
                    </div>
                  ) : (
                    (() => {
                      const baseRate = Number(finalPriceModal.rate?.originalRate || 0);
                      const finalPrice = Number(finalPriceModalAmount || 0);
                      const tenPercentOfBase = baseRate * 0.1;
                      const maxAllowedAmount = baseRate + tenPercentOfBase;
                      
                      return finalPrice > 0 && finalPrice <= maxAllowedAmount
                        ? 'Send to Manager'
                        : 'Submit';
                    })()
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      <LoadChatModalCMT
        isOpen={chatModal.visible}
        onClose={() => setChatModal({ visible: false, loadId: null, receiverEmpId: null, receiverName: null })}
        loadId={chatModal.loadId}
        receiverEmpId={chatModal.receiverEmpId}
        receiverName={chatModal.receiverName}
      />
      

    </div>
  );
}