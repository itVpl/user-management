import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { FaPhone, FaEnvelope, FaCalendar, FaClock, FaUser, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaPlus, FaSearch } from 'react-icons/fa';
import API_CONFIG from '../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
// ===== Helpers & regex =====
// Local YYYY-MM-DD (timezone-safe)
const toLocalISO = (d = new Date()) => {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(Date.now() - tz).toISOString().split('T')[0];
};
// Tomorrow (strictly future)
const toLocalTomorrowISO = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().split('T')[0];
};

// Next Follow-Up min date: max(today, followUpDate + 1 day)
const getNextMinDate = (followUpDate) => {
  const tomorrow = toLocalTomorrowISO();
  if (!followUpDate) return tomorrow;
  const d = new Date(followUpDate);
  d.setDate(d.getDate() + 1);            // strictly greater than followUpDate
  const gt = toLocalISO(d);
  return gt > tomorrow ? gt : tomorrow;  // also never before tomorrow
};

const onlyLetters = /^[A-Za-z ]+$/;                  // alphabets + space
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;     // simple robust email
const phoneRe = /^[6-9]\d{9}$/;                      // 10 digits, starts 6-9
const clampDigits = (s) => s.replace(/\D/g, '').slice(0, 10);
// ---- DUPLICATE ERROR PARSER (NEW) ----
const parseDuplicateError = (error) => {
  const res = error?.response;
  const msg = (res?.data?.message || res?.data?.error || '').toString().toLowerCase();

  // Common cases: HTTP 409 (Conflict) ya 400 with “already exists / duplicate / E11000”
  const status = res?.status;
  const isDup =
    status === 409 ||
    /already\s*exists|duplicate|e11000|unique/i.test(msg);

  if (!isDup) return null;

  // Try to detect which field it is about
  const isPhone = /phone|mobile/.test(msg);
  const isEmail = /email/.test(msg);

  return {
    phone: isPhone ? 'Mobile number already registered.' : undefined,
    email: isEmail ? 'Email already registered.' : undefined,
    generic: (!isPhone && !isEmail) ? 'Phone/Email already registered.' : undefined
  };
};

export default function DailyFollowUp() {
  const [errors, setErrors] = useState({});
  const [formMessage, setFormMessage] = useState('');        // inline banner for submit/update
  const followUpDateRef = useRef(null);   // Add form ke liye
  const editFollowUpDateRef = useRef(null); // Edit form ke liye
  const nextFollowUpDateRef = useRef(null);        // Add modal ke liye
  const editNextFollowUpDateRef = useRef(null);    // Edit modal ke liye
  const newNextFollowUpDateRef = useRef(null);     // Add *New* Follow-Up modal
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddFollowUpForm, setShowAddFollowUpForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);
  const [viewLoadingId, setViewLoadingId] = useState(null); // id of row being viewed
  const [editLoadingId, setEditLoadingId] = useState(null); // id of row being edited
  const [newErrors, setNewErrors] = useState({}); // ⬅ for "Add New Follow-Up" modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddNewFollowUpForm, setShowAddNewFollowUpForm] = useState(false);
  const [newFollowUpData, setNewFollowUpData] = useState({
    followUpType: '',
    followUpNotes: '',
    nextFollowUpDate: ''
  });

  // Form state for Add Follow-Up
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    followUpDate: '',
    contactPerson: '',
    concernedPerson: '',
    followUpType: '',    // <-- default blank (Select)
    status: '',          // <-- default blank (Select)
    creditCheck: '',
    remark: '',
    followupNotes: '',
    nextFollowUpDate: '',
    documents: null
  });


  // Fetch follow-ups from API
  const fetchFollowUps = async () => {
    try {
      setLoading(true);

      // Get authentication token
      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");

      if (!token) {
        alertify.error('Authentication required. Please login again.');
        return;
      }

      // Fetch data from API
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/sales-followup/my-followups`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      });

      if (response.data.success) {
        // Transform API data to match our table structure
        const transformedData = response.data.data.map((item, index) => {
          const latestFollowUp = item.followUps?.length ? item.followUps[item.followUps.length - 1] : null;

          // Use root callingDate for main Follow-Up Date (for Today card correctness)
          const followUpDate = item.callingDate ? new Date(item.callingDate).toISOString().split('T')[0] : '';

          // Next follow-up (from latest history)
          const nextFollowUpDate = latestFollowUp?.nextFollowUpDate
            ? new Date(latestFollowUp.nextFollowUpDate).toISOString().split('T')[0]
            : '';

          // Type: prefer latest history type, else fallback to any root field if present
          const followUpType = (latestFollowUp?.followUpType || item.followUpType || '').trim();

          return {
            id: item._id,
            sNo: index + 1,
            customerName: item.customerName,
            customerPhone: item.phone,
            customerEmail: item.email,
            followUpDate,
            followUpType,
            nextFollowUpDate,
            status: item.status,
            creditCheck: item.creditCheck,
            remark: item.remarks,
            contactPerson: item.contactPerson,
            concernedPerson: item.concernedPerson,
            address: item.address,
            createdAt: new Date(item.createdAt).toISOString().split('T')[0],
            createdBy: item.createdBy?.employeeName || 'Unknown'
          };
        });


        setFollowUps(transformedData);
      } else {
        alertify.error('Failed to load follow-ups');
      }
    } catch (error) {
      console.error('Error fetching follow-ups:', error);
      if (error.response) {
        alertify.error(`Error: ${error.response.data.message || 'Failed to load follow-ups'}`);
      } else if (error.request) {
        alertify.error('Network error. Please check your connection.');
      } else {
        alertify.error('Error loading follow-ups. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, []);

  // Status color helper
  const statusColor = (status) => {
    if (status === 'completed') return 'bg-green-100 text-green-700';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
    if (status === 'cancelled') return 'bg-red-100 text-red-700';
    if (status === 'rescheduled') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };


  // Filter follow-ups based on search term
  const filteredFollowUps = followUps.filter(followUp =>
    followUp.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    followUp.customerPhone.toLowerCase().includes(searchTerm.toLowerCase()) ||
    followUp.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    followUp.createdBy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name } = e.target;
    let value = e.target.value;

    // Email: never allow spaces
    if (name === 'customerEmail') {
      value = value.replace(/\s/g, '');
    }

    // Phone: digits only, max 10
    if (name === 'customerPhone') {
      value = clampDigits(value); // keeps only 0-9 and trims to 10
    }

    // Names: allow letters + spaces (including in-between)
    if (['customerName', 'contactPerson', 'concernedPerson'].includes(name)) {
      // strip anything that's not A–Z or space
      value = value.replace(/[^A-Za-z ]/g, '');
      // collapse multiple spaces to single
      value = value.replace(/\s{2,}/g, ' ');
      // NOTE: no trim here — user ko abhi trailing space type karne do
    }

    setFormData((prev) => ({ ...prev, [name]: value }));

    // clear field error as user types
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };


  const validateForm = () => {
    const e = {};
    const today = toLocalISO();

    // Customer Name
    if (!formData.customerName.trim()) e.customerName = 'Please enter the customer name.';
    else if (!onlyLetters.test(formData.customerName.trim())) e.customerName = 'Only alphabets are allowed.';

    // Phone
    if (!formData.customerPhone) e.customerPhone = 'Please enter the mobile number.';
    else if (!phoneRe.test(formData.customerPhone)) e.customerPhone = 'Please enter the valid mobile number.';

    // Email
    if (!formData.customerEmail) e.customerEmail = 'Please enter the email id.';
    else if (/\s/.test(formData.customerEmail)) e.customerEmail = 'Email should not contain spaces.';
    else if (!emailRe.test(formData.customerEmail)) e.customerEmail = 'Please enter the valid email id.';

    // Address  ⬅️ NEW: mandatory
    if (!formData.customerAddress?.trim()) e.customerAddress = 'Please enter the customer address.';

    // Follow-Up Date (today/future)
    if (!formData.followUpDate) e.followUpDate = 'Please select the Follow-Up Date.';
    else if (formData.followUpDate < today) e.followUpDate = 'Follow-Up Date cannot be in the past.';

    // Contact Person  ⬅️ mandatory
    if (!formData.contactPerson.trim()) e.contactPerson = 'Please enter the Contact Person name.';
    else if (!onlyLetters.test(formData.contactPerson.trim())) e.contactPerson = 'Only alphabets are allowed.';

    // Concerned Person  ⬅️ mandatory
    if (!formData.concernedPerson.trim()) e.concernedPerson = 'Please enter the Concerned Person name.';
    else if (!onlyLetters.test(formData.concernedPerson.trim())) e.concernedPerson = 'Only alphabets are allowed.';

    // Follow-Up Type / Status  ⬅️ mandatory
    if (!formData.followUpType) e.followUpType = 'Please select the Follow-Up Type.';
    if (!formData.status) e.status = 'Please select the status.';

    // Credit Check  ⬅️ NEW: mandatory
    if (!formData.creditCheck?.trim()) e.creditCheck = 'Please enter the credit check details.';

    // Remark  ⬅️ NEW: mandatory
    if (!formData.remark?.trim()) e.remark = 'Please enter the remark.';

    // Follow-up Notes  ⬅️ NEW: mandatory
    if (!formData.followupNotes?.trim()) e.followupNotes = 'Please enter the follow-up notes.';

    // Next Follow-Up Date  ⬅️ NEW: mandatory + rules
    if (!formData.nextFollowUpDate) {
      e.nextFollowUpDate = 'Please select the Next Follow-Up Date.';
    } else {
      if (formData.nextFollowUpDate < today)
        e.nextFollowUpDate = 'Next Follow-Up Date cannot be in the past.';
      if (formData.followUpDate && formData.nextFollowUpDate <= formData.followUpDate)
        e.nextFollowUpDate = 'Next Follow-Up Date must be greater than the Follow-Up Date.';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const validateNewFollowUpForm = () => {
    const e = {};
    const tomorrow = toLocalTomorrowISO();
    const baseFUDate = selectedFollowUp?.callingDate
      ? new Date(selectedFollowUp.callingDate).toISOString().split('T')[0]
      : null;

    if (!newFollowUpData.followUpType) e.followUpType = 'Please select the Follow-Up Type.';
    if (!newFollowUpData.followUpNotes?.trim())
      e.followUpNotes = 'Please enter the follow-up notes.';
    if (!newFollowUpData.nextFollowUpDate) {
      e.nextFollowUpDate = 'Please select the Next Follow-Up Date.';
     } else if (newFollowUpData.nextFollowUpDate < tomorrow) {
   e.nextFollowUpDate = 'Next Follow-Up Date must be in the future.';
  } else if (baseFUDate && newFollowUpData.nextFollowUpDate <= baseFUDate) {
    e.nextFollowUpDate = 'Next Follow-Up Date must be greater than the Follow-Up Date.';
    }

    setNewErrors(e);
    return Object.keys(e).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormMessage('');
    if (showEditModal && selectedFollowUp) {
      await handleUpdateFollowUp();
      return;
    }

    if (!validateForm()) {
      setFormMessage('Please fix the highlighted fields.');
      return;
    }

    try {
      setSubmitting(true);

      const apiData = {
        customerName: formData.customerName.trim(),
        address: formData.customerAddress?.trim(),
        phone: formData.customerPhone,
        contactPerson: formData.contactPerson.trim(),
        concernedPerson: formData.concernedPerson.trim(),
        email: formData.customerEmail.trim(),
        remarks: formData.remark?.trim(),
        callingDate: formData.followUpDate,
        status: formData.status,
        creditCheck: formData.creditCheck?.trim(),
        followUpType: formData.followUpType.charAt(0).toUpperCase() + formData.followUpType.slice(1),
        followUpNotes: formData.followupNotes?.trim(),
        nextFollowUpDate: formData.nextFollowUpDate || undefined
      };

      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      if (!token) {
        setFormMessage('Authentication required. Please login again.');
        return;
      }

      await axios.post(`${API_CONFIG.BASE_URL}/api/v1/sales-followup/create`, apiData, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        withCredentials: true
      });

      // No popups; just refresh list & close modal
      await fetchFollowUps();
      setShowAddFollowUpForm(false);
      setFormData({
        customerName: '', customerPhone: '', customerEmail: '', customerAddress: '',
        followUpDate: '', contactPerson: '', concernedPerson: '',
        followUpType: '', status: '', creditCheck: '', remark: '',
        followupNotes: '', nextFollowUpDate: '', documents: null
      });
    } catch (error) {
      console.error('Error creating follow-up:', error);

      const dup = parseDuplicateError(error);
      if (dup) {
        setErrors((prev) => ({
          ...prev,
          ...(dup.phone ? { customerPhone: dup.phone } : {}),
          ...(dup.email ? { customerEmail: dup.email } : {}),
          // Agar generic mila aur specific detect nahi hua:
          ...(!dup.phone && !dup.email ? {
            customerPhone: prev.customerPhone || 'Mobile number may already be registered.',
            customerEmail: prev.customerEmail || 'Email may already be registered.'
          } : {})
        }));

        setFormMessage('Please fix the highlighted fields.');
        // Optionally: focus first errored field
        if (dup.phone && document?.getElementById('customerPhone')) {
          document.getElementById('customerPhone').focus();
        } else if (dup.email && document?.getElementById('customerEmail')) {
          document.getElementById('customerEmail').focus();
        }
      } else {
        // generic inline message (no popup)
        setFormMessage('Something went wrong while creating the follow-up. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }

  };


  // Handle update follow-up
  const handleUpdateFollowUp = async () => {
    setFormMessage('');
    if (!validateForm()) {
      setFormMessage('Please fix the highlighted fields.');
      return;
    }

    try {
      setSubmitting(true);

      const apiData = {
        customerName: formData.customerName.trim(),
        address: formData.customerAddress?.trim(),
        phone: formData.customerPhone,
        contactPerson: formData.contactPerson.trim(),
        concernedPerson: formData.concernedPerson.trim(),
        email: formData.customerEmail.trim(),
        remarks: formData.remark?.trim(),
        callingDate: formData.followUpDate,
        status: formData.status,
        creditCheck: formData.creditCheck?.trim(),
        followUpType: formData.followUpType.charAt(0).toUpperCase() + formData.followUpType.slice(1),
        followUpNotes: formData.followupNotes?.trim(),
        nextFollowUpDate: formData.nextFollowUpDate || undefined
      };

      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      if (!token) {
        setFormMessage('Authentication required. Please login again.');
        return;
      }

      await axios.put(`${API_CONFIG.BASE_URL}/api/v1/sales-followup/${selectedFollowUp._id}`, apiData, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        withCredentials: true
      });

      await fetchFollowUps();
      setShowEditModal(false);
      setSelectedFollowUp(null);
      setFormData({
        customerName: '', customerPhone: '', customerEmail: '', customerAddress: '',
        followUpDate: '', contactPerson: '', concernedPerson: '',
        followUpType: '', status: '', creditCheck: '', remark: '',
        followupNotes: '', nextFollowUpDate: '', documents: null
      });
    } catch (error) {
      console.error('Error updating follow-up:', error);

      const dup = parseDuplicateError(error);
      if (dup) {
        setErrors((prev) => ({
          ...prev,
          ...(dup.phone ? { customerPhone: dup.phone } : {}),
          ...(dup.email ? { customerEmail: dup.email } : {}),
          ...(!dup.phone && !dup.email ? {
            customerPhone: prev.customerPhone || 'Mobile number may already be registered.',
            customerEmail: prev.customerEmail || 'Email may already be registered.'
          } : {})
        }));
        setFormMessage('Please fix the highlighted fields.');
      } else {
        setFormMessage('Something went wrong while updating the follow-up. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };


  // Handle view follow-up
  const handleViewFollowUp = async (followUp) => {
    const id = followUp.id || followUp._id;
    try {
      setViewLoadingId(id);
      setSelectedFollowUp(followUp);

      // Get authentication token
      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");

      if (!token) {
        alertify.error('Authentication required. Please login again.');
        return;
      }

      // Fetch detailed follow-up data from API
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/sales-followup/${followUp.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      });

      if (response.data.success) {
        setSelectedFollowUp(response.data.data);
        setShowViewModal(true);
        alertify.success('✅ Follow-up details loaded successfully!');
      } else {
        alertify.error('Failed to load follow-up details');
      }
    } catch (error) {
      console.error('Error fetching follow-up details:', error);
      if (error.response) {
        alertify.error(`Error: ${error.response.data.message || 'Failed to load follow-up details'}`);
      } else if (error.request) {
        alertify.error('Network error. Please check your connection.');
      } else {
        alertify.error('Error loading follow-up details. Please try again.');
      }
    } finally {
      setViewLoadingId(null);
    }
  };

  // Handle edit follow-up
  const handleEditFollowUp = async (followUp) => {
    const id = followUp.id || followUp._id;
    try {
      setEditLoadingId(id);

      // Get authentication token
      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");

      if (!token) {
        alertify.error('Authentication required. Please login again.');
        return;
      }

      // Fetch detailed follow-up data from API
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/sales-followup/${followUp.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      });

      if (response.data.success) {
        const followUpData = response.data.data;

        // Get the latest follow-up from the followUps array for pre-filling
        const latestFollowUpDetails = followUpData.followUps && followUpData.followUps.length > 0
          ? followUpData.followUps[followUpData.followUps.length - 1]
          : {}; // Default to empty object if no follow-ups

        // Pre-fill form with existing data
        setFormData({
          customerName: followUpData.customerName || '',
          customerPhone: followUpData.phone || '',
          customerEmail: followUpData.email || '',
          customerAddress: followUpData.address || '',
          followUpDate: followUpData.callingDate ? new Date(followUpData.callingDate).toISOString().split('T')[0] : '',
          contactPerson: followUpData.contactPerson || '',
          concernedPerson: followUpData.concernedPerson || '',
          followUpType: latestFollowUpDetails.followUpType ? latestFollowUpDetails.followUpType.toLowerCase() : 'call',
          status: followUpData.status || 'New',
          creditCheck: followUpData.creditCheck || '',
          remark: followUpData.remarks || '',
          followupNotes: latestFollowUpDetails.followUpNotes || '',
          nextFollowUpDate: latestFollowUpDetails.nextFollowUpDate ? new Date(latestFollowUpDetails.nextFollowUpDate).toISOString().split('T')[0] : '',
          documents: null
        });

        setSelectedFollowUp(followUpData);
        setShowEditModal(true);
        alertify.success('✅ Follow-up data loaded for editing!');
      } else {
        alertify.error('Failed to load follow-up details for editing');
      }
    } catch (error) {
      console.error('Error fetching follow-up details for editing:', error);
      if (error.response) {
        alertify.error(`Error: ${error.response.data.message || 'Failed to load follow-up details'}`);
      } else if (error.request) {
        alertify.error('Network error. Please check your connection.');
      } else {
        alertify.error('Error loading follow-up details. Please try again.');
      }
    } finally {
      setEditLoadingId(null);
    }
  };

  // Reset form when modal closes
  const handleCloseModal = () => {
    setShowAddFollowUpForm(false);
    setShowEditModal(false);
    setShowAddNewFollowUpForm(false);
    setViewLoadingId(null);
    setEditLoadingId(null);
    setFormData({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      followUpDate: '',
      contactPerson: '',
      concernedPerson: '',
      followUpType: '',
      status: '',
      creditCheck: '',
      remark: '',
      followupNotes: '',
      nextFollowUpDate: '',
      documents: null
    });
    setNewFollowUpData({
      followUpType: '',
      followUpNotes: '',
      nextFollowUpDate: ''
    });


  };

  const handleNewFollowUpInputChange = (e) => {
    const { name, value } = e.target;
    setNewFollowUpData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddNewFollowUp = async (e) => {
    e.preventDefault();

    setNewErrors({});
    if (!validateNewFollowUpForm()) return;
    try {
      setSubmitting(true);

      // Get authentication token
      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");

      if (!token) {
        alertify.error('Authentication required. Please login again.');
        return;
      }

      // Prepare the data for the new follow-up
      const followUpData = {
        followUpType: newFollowUpData.followUpType
    ? newFollowUpData.followUpType.charAt(0).toUpperCase() + newFollowUpData.followUpType.slice(1)
    : '',
        followUpNotes: newFollowUpData.followUpNotes,
        nextFollowUpDate: newFollowUpData.nextFollowUpDate
      };

      // Add new follow-up to the existing sales follow-up record
      const response = await axios.post(`${API_CONFIG.BASE_URL}/api/v1/sales-followup/${selectedFollowUp._id}/followup`, followUpData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });

      if (response.data.success) {
        alertify.success('New follow-up added successfully!');

        // Close the add new follow-up form
        setShowAddNewFollowUpForm(false);

        // Reset the new follow-up data
        setNewFollowUpData({
          followUpType: 'call',
          followUpNotes: '',
          nextFollowUpDate: ''
        });

        // Refresh the follow-ups data
        await fetchFollowUps();

        // Refresh the edit form data
        await handleEditFollowUp(selectedFollowUp);
      } else {
        alertify.error(response.data.message || 'Failed to add new follow-up');
      }
    } catch (error) {
      console.error('Error adding new follow-up:', error);
      if (error.response) {
        alertify.error(`Error: ${error.response.data.message || 'Failed to add new follow-up'}`);
      } else if (error.request) {
        alertify.error('Network error. Please check your connection.');
      } else {
        alertify.error('Error adding new follow-up. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex flex-col justify-center items-center h-96 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-purple-600 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-xl font-semibold text-gray-800 mb-2">Loading Follow-Ups...</p>
            <p className="text-sm text-gray-600">Please wait while we fetch the information</p>
          </div>
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
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <FaPhone className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Follow-Ups</p>
                <p className="text-xl font-bold text-gray-800">{followUps.length}</p>
              </div>
            </div>
          </div>
          {/* <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <FaCheckCircle className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-xl font-bold text-green-600">{followUps.filter(fu => fu.status === 'completed').length}</p>
              </div>
            </div>
          </div> */}
          {/* <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                <FaClock className="text-yellow-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-xl font-bold text-yellow-600">{followUps.filter(fu => fu.status === 'pending').length}</p>
              </div>
            </div>
          </div> */}
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <FaCalendar className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Today</p>
                <p className="text-xl font-bold text-purple-600">
                  {followUps.filter(fu => fu.followUpDate === toLocalISO()).length}
                </p>

              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search follow-ups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowAddFollowUpForm(true)}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white font-semibold shadow hover:from-blue-600 hover:to-blue-700 transition"
          >
            <FaPlus size={20} /> Add Follow-Up
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
              <tr>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">S. No</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Customer Name</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Contact (Phone)</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Email</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Follow-Up Date</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Follow-Up Type</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Next Follow-Up Date</th>
                <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredFollowUps.map((followUp, index) => (
                <tr key={followUp.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                  <td className="py-2 px-3">
                    <span className="font-medium text-gray-700">{followUp.sNo}</span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="font-medium text-gray-700">{followUp.customerName}</span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="font-medium text-gray-700">{followUp.customerPhone}</span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="font-medium text-gray-700">{followUp.customerEmail}</span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="font-medium text-gray-700">{followUp.followUpDate}</span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      {(followUp.followUpType || '').toLowerCase() === 'call' && <FaPhone className="text-blue-500" size={14} />}
                      {(followUp.followUpType || '').toLowerCase() === 'email' && <FaEnvelope className="text-green-500" size={14} />}
                      <span className="font-medium text-gray-700">
                        {followUp.followUpType ? (followUp.followUpType[0].toUpperCase() + followUp.followUpType.slice(1).toLowerCase()) : ''}
                      </span>

                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <span className="font-medium text-gray-700">{followUp.nextFollowUpDate}</span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewFollowUp(followUp)}
                        disabled={viewLoadingId === followUp.id}
                        className={`px-3 py-1 text-white text-xs rounded-md transition-colors ${viewLoadingId === followUp.id ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
                          }`}
                      >
                        {viewLoadingId === followUp.id ? 'Loading...' : 'View'}
                      </button>

                      <button
                        onClick={() => handleEditFollowUp(followUp)}
                        disabled={editLoadingId === followUp.id}
                        className={`px-3 py-1 text-white text-xs rounded-md transition-colors ${editLoadingId === followUp.id ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'
                          }`}
                      >
                        {editLoadingId === followUp.id ? 'Loading...' : 'Edit'}
                      </button>


                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredFollowUps.length === 0 && (
          <div className="text-center py-12">
            <FaPhone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {searchTerm ? 'No follow-ups found matching your search' : 'No follow-ups found'}
            </p>
            <p className="text-gray-400 text-sm">
              {searchTerm ? 'Try adjusting your search terms' : 'Create your first follow-up to get started'}
            </p>
          </div>
        )}
      </div>

      {/* Add Follow-Up Modal */}
      {showAddFollowUpForm && (
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <FaPlus className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Add Follow-Up</h2>
                    <p className="text-blue-100">Create a new customer follow-up</p>
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
            <form noValidate onInvalid={(e) => e.preventDefault()} onSubmit={handleSubmit} className="p-6">

              <div className="grid grid-cols-3 gap-6 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
                {/* Customer Information */}
                <div className="bg-blue-50 p-4 rounded-lg max-h-[50vh] overflow-y-auto scrollbar-hide">
                  <h3 className="text-lg font-semibold text-blue-800 mb-4">Customer Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-2">Customer Name *</label>
                      <input
                        id="customerName"
                        type="text"
                        name="customerName"
                        value={formData.customerName}
                        onChange={handleInputChange}
                        aria-invalid={!!errors.customerName}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.customerName ? 'border-red-400' : 'border-gray-300'
                          }`}
                        placeholder="Enter customer name"
                      />
                      {errors.customerName && <p className="text-red-600 text-xs mt-1">{errors.customerName}</p>}

                    </div>
                    <div>
                      <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                      <input
                        id="customerPhone"
                        type="tel"
                        name="customerPhone"
                        value={formData.customerPhone}
                        onChange={handleInputChange}
                        onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
                        inputMode="numeric"
                        maxLength={10}
                        aria-invalid={!!errors.customerPhone}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.customerPhone ? 'border-red-400' : 'border-gray-300'
                          }`}
                        placeholder="Enter 10-digit mobile number"
                      />
                      {errors.customerPhone && <p className="text-red-600 text-xs mt-1">{errors.customerPhone}</p>}


                    </div>
                    <div>
                      <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                      <input
                        id="customerEmail"
                        type="email"
                        name="customerEmail"
                        value={formData.customerEmail}
                        onChange={handleInputChange}
                        aria-invalid={!!errors.customerEmail}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.customerEmail ? 'border-red-400' : 'border-gray-300'
                          }`}
                        placeholder="Enter email address"
                      />
                      {errors.customerEmail && <p className="text-red-600 text-xs mt-1">{errors.customerEmail}</p>}


                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address *
                      </label>
                      <textarea
                        name="customerAddress"
                        value={formData.customerAddress}
                        onChange={handleInputChange}
                        rows="3"
                        aria-invalid={!!errors.customerAddress}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.customerAddress ? 'border-red-400' : 'border-gray-300'}`}
                        placeholder="Enter customer address"
                      />
                      {errors.customerAddress && <p className="text-red-600 text-xs mt-1">{errors.customerAddress}</p>}

                    </div>
                  </div>
                </div>

                {/* Follow-Up Details */}
                <div className="bg-green-50 p-4 rounded-lg max-h-[50vh] overflow-y-auto scrollbar-hide">
                  <h3 className="text-lg font-semibold text-green-800 mb-4">Follow-Up Details</h3>
                  <div className="space-y-4">
                    {/* Follow-Up Date */}
                    <div
                      className="cursor-pointer"
                      onClick={() => {
                        // Chrome: showPicker, fallback: focus
                        if (followUpDateRef.current?.showPicker) followUpDateRef.current.showPicker();
                        else followUpDateRef.current?.focus();
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (followUpDateRef.current?.showPicker) followUpDateRef.current.showPicker();
                          else followUpDateRef.current?.focus();
                        }
                      }}
                    >
                      <label htmlFor="followUpDate" className="block text-sm font-medium text-gray-700 mb-2">
                        Follow-Up Date *
                      </label>
                      <input
                        id="followUpDate"
                        ref={followUpDateRef}
                        type="date"
                        name="followUpDate"
                        value={formData.followUpDate}
                        onChange={handleInputChange}
                        min={toLocalISO()}  // present & future only
                        aria-invalid={!!errors.followUpDate}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.followUpDate ? 'border-red-400' : 'border-gray-300'
                          }`}
                      />
                    </div>
                    {errors.followUpDate && (
                      <p className="text-red-600 text-xs mt-1">{errors.followUpDate}</p>
                    )}

                    <div>
                      <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700 mb-2">
                        Contact Person *
                      </label>
                      <input
                        id="contactPerson"
                        type="text"
                        name="contactPerson"
                        value={formData.contactPerson}
                        onChange={handleInputChange}
                        aria-invalid={!!errors.contactPerson}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.contactPerson ? 'border-red-400' : 'border-gray-300'
                          }`}
                        placeholder="Enter contact person name"
                      />
                      {errors.contactPerson && (
                        <p className="text-red-600 text-xs mt-1">{errors.contactPerson}</p>
                      )}

                    </div>
                    <div>
                      <label htmlFor="concernedPerson" className="block text-sm font-medium text-gray-700 mb-2">
                        Concerned Person *
                      </label>
                      <input
                        id="concernedPerson"
                        type="text"
                        name="concernedPerson"
                        value={formData.concernedPerson}
                        onChange={handleInputChange}
                        aria-invalid={!!errors.concernedPerson}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.concernedPerson ? 'border-red-400' : 'border-gray-300'
                          }`}
                        placeholder="Enter concerned person name"
                      />
                      {errors.concernedPerson && (
                        <p className="text-red-600 text-xs mt-1">{errors.concernedPerson}</p>
                      )}

                    </div>
                    <div>
                      <label htmlFor="followUpType" className="block text-sm font-medium text-gray-700 mb-2">Follow-Up Type *</label>
                      <select
                        id="followUpType"
                        name="followUpType"
                        value={formData.followUpType}
                        onChange={handleInputChange}
                        aria-invalid={!!errors.followUpType}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.followUpType ? 'border-red-400' : 'border-gray-300'
                          }`}
                      >
                        <option value="">Select</option>
                        <option value="call">Call</option>
                        <option value="email">Email</option>
                      </select>
                      {errors.followUpType && <p className="text-red-600 text-xs mt-1">{errors.followUpType}</p>}


                    </div>
                  </div>
                </div>

                {/* Others */}
                <div className="bg-purple-50 p-4 rounded-lg max-h-[50vh] overflow-y-auto scrollbar-hide">
                  <h3 className="text-lg font-semibold text-purple-800 mb-4">Others</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                      <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        aria-invalid={!!errors.status}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.status ? 'border-red-400' : 'border-gray-300'
                          }`}
                      >
                        <option value="">Select</option>
                        <option value="New">New</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Proposal Sent">Proposal Sent</option>
                        <option value="Negotiation">Negotiation</option>
                        <option value="Closed Won">Closed Won</option>
                        <option value="Closed Lost">Closed Lost</option>
                        <option value="On Hold">On Hold</option>
                      </select>
                      {errors.status && <p className="text-red-600 text-xs mt-1">{errors.status}</p>}


                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Credit Check *</label>
                      <input
                        type="text"
                        name="creditCheck"
                        value={formData.creditCheck}
                        onChange={handleInputChange}
                        aria-invalid={!!errors.creditCheck}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.creditCheck ? 'border-red-400' : 'border-gray-300'}`}
                        placeholder="Enter credit check details"
                      />
                      {errors.creditCheck && <p className="text-red-600 text-xs mt-1">{errors.creditCheck}</p>}

                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Remark *</label>
                      <input
                        type="text"
                        name="remark"
                        value={formData.remark}
                        onChange={handleInputChange}
                        aria-invalid={!!errors.remark}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.remark ? 'border-red-400' : 'border-gray-300'}`}
                        placeholder="Enter any remarks"
                      />
                      {errors.remark && <p className="text-red-600 text-xs mt-1">{errors.remark}</p>}

                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up Notes *</label>
                      <textarea
                        name="followupNotes"
                        value={formData.followupNotes}
                        onChange={handleInputChange}
                        rows="3"
                        aria-invalid={!!errors.followupNotes}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.followupNotes ? 'border-red-400' : 'border-gray-300'}`}
                        placeholder="Enter detailed follow-up notes"
                      />
                      {errors.followupNotes && <p className="text-red-600 text-xs mt-1">{errors.followupNotes}</p>}

                    </div>
                    {/* Next Follow-Up Date */}
                    <div
                      className="cursor-pointer"
                      onClick={() => {
                        if (nextFollowUpDateRef.current?.showPicker) nextFollowUpDateRef.current.showPicker();
                        else nextFollowUpDateRef.current?.focus();
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (nextFollowUpDateRef.current?.showPicker) nextFollowUpDateRef.current.showPicker();
                          else nextFollowUpDateRef.current?.focus();
                        }
                      }}
                    >
                      <label htmlFor="nextFollowUpDate" className="block text-sm font-medium text-gray-700 mb-2">
                        Next Follow-Up Date *
                      </label>
                      <input
                        id="nextFollowUpDate"
                        ref={nextFollowUpDateRef}
                        type="date"
                        name="nextFollowUpDate"
                        value={formData.nextFollowUpDate}
                        onChange={handleInputChange}
                        min={getNextMinDate(formData.followUpDate)}   // ✅ present/future & > followUpDate
                        aria-invalid={!!errors.nextFollowUpDate}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.nextFollowUpDate ? 'border-red-400' : 'border-gray-300'
                          }`}
                      />
                    </div>
                    {errors.nextFollowUpDate && (
                      <p className="text-red-600 text-xs mt-1">{errors.nextFollowUpDate}</p>
                    )}

                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 mt-6">
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
                    'Create Follow-Up'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Follow-Up Modal */}
      {showViewModal && selectedFollowUp && (
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4"
          onClick={() => setShowViewModal(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" 
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <FaPhone className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Follow-Up Details</h2>
                    <p className="text-blue-100">Customer Follow-Up Information</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Customer Information */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <FaUser className="text-blue-600" size={20} />
                  <h3 className="text-lg font-bold text-gray-800">Customer Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <FaUser className="text-blue-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Customer Name</p>
                      <p className="font-semibold text-gray-800">{selectedFollowUp.customerName || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <FaPhone className="text-green-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone Number</p>
                      <p className="font-semibold text-gray-800">{selectedFollowUp.phone || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <FaEnvelope className="text-purple-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email Address</p>
                      <p className="font-semibold text-gray-800">{selectedFollowUp.email || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <FaUser className="text-orange-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Contact Person</p>
                      <p className="font-semibold text-gray-800">{selectedFollowUp.contactPerson || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <FaUser className="text-red-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Concerned Person</p>
                      <p className="font-semibold text-gray-800">{selectedFollowUp.concernedPerson || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <FaCalendar className="text-gray-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Created Date</p>
                      <p className="font-semibold text-gray-800">
                        {selectedFollowUp.createdAt ? new Date(selectedFollowUp.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
                {selectedFollowUp.address && (
                  <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <FaUser className="text-gray-600" size={16} />
                      <p className="text-sm font-medium text-gray-700">Address</p>
                    </div>
                    <p className="text-gray-800">{selectedFollowUp.address}</p>
                  </div>
                )}
              </div>

              {/* Follow-Up Details */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <FaPhone className="text-green-600" size={20} />
                  <h3 className="text-lg font-bold text-gray-800">Follow-Up Details</h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <FaCalendar className="text-blue-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Calling Date</p>
                      <p className="font-semibold text-gray-800">
                        {selectedFollowUp.callingDate ? new Date(selectedFollowUp.callingDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <FaPhone className="text-green-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${statusColor(selectedFollowUp.status)}`}>
                        {selectedFollowUp.status || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <FaUser className="text-purple-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Credit Check</p>
                      <p className="font-semibold text-gray-800">{selectedFollowUp.creditCheck || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <FaUser className="text-orange-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Created By</p>
                      <p className="font-semibold text-gray-800">{selectedFollowUp.createdBy?.employeeName || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                {selectedFollowUp.remarks && (
                  <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <FaUser className="text-gray-600" size={16} />
                      <p className="text-sm font-medium text-gray-700">Remarks</p>
                    </div>
                    <p className="text-gray-800">{selectedFollowUp.remarks}</p>
                  </div>
                )}
              </div>

              {/* Follow-Ups History */}
              {selectedFollowUp.followUps && selectedFollowUp.followUps.length > 0 && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FaCalendar className="text-purple-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Follow-Ups History</h3>
                  </div>
                  <div className="space-y-4">
                    {selectedFollowUp.followUps.map((followUp, index) => (
                      <div key={followUp._id} className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-xs font-bold text-purple-600">
                              {index + 1}
                            </span>
                            <span className="text-sm font-medium text-gray-700">
                              {new Date(followUp.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${followUp.followUpType === 'Call' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                            }`}>
                            {followUp.followUpType === 'Call' ? <FaPhone size={12} /> : <FaEnvelope size={12} />}
                            {followUp.followUpType}
                          </span>
                        </div>
                        {followUp.followUpNotes && (
                          <p className="text-sm text-gray-600 mb-2">{followUp.followUpNotes}</p>
                        )}
                        {followUp.nextFollowUpDate && (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <FaCalendar size={12} />
                            <span>Next Follow-Up: {new Date(followUp.nextFollowUpDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Follow-Up Modal */}
      {showEditModal && selectedFollowUp && (
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4"
          onClick={() => setShowEditModal(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <FaPhone className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Edit Follow-Up</h2>
                    <p className="text-green-100">Update customer follow-up information</p>
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
            <form noValidate onInvalid={(e) => e.preventDefault()} onSubmit={handleSubmit} className="p-6">

              <div className="grid grid-cols-3 gap-6 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
                {/* Customer Information */}
                <div className="bg-blue-50 p-4 rounded-lg max-h-[50vh] overflow-y-auto scrollbar-hide">
                  <h3 className="text-lg font-semibold text-blue-800 mb-4">Customer Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-2">Customer Name *</label>
                      <input
                        id="customerName"
                        type="text"
                        name="customerName"
                        value={formData.customerName}
                        onChange={handleInputChange}
                        aria-invalid={!!errors.customerName}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.customerName ? 'border-red-400' : 'border-gray-300'
                          }`}
                        placeholder="Enter customer name"
                      />
                      {errors.customerName && <p className="text-red-600 text-xs mt-1">{errors.customerName}</p>}


                    </div>
                    <div>
                      <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                      <input
                        id="customerPhone"
                        type="tel"
                        name="customerPhone"
                        value={formData.customerPhone}
                        onChange={handleInputChange}
                        onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
                        inputMode="numeric"
                        maxLength={10}
                        aria-invalid={!!errors.customerPhone}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.customerPhone ? 'border-red-400' : 'border-gray-300'
                          }`}
                        placeholder="Enter 10-digit mobile number"
                      />
                      {errors.customerPhone && <p className="text-red-600 text-xs mt-1">{errors.customerPhone}</p>}


                    </div>
                    <div>
                      <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                      <input
                        id="customerEmail"
                        type="email"
                        name="customerEmail"
                        value={formData.customerEmail}
                        onChange={handleInputChange}
                        aria-invalid={!!errors.customerEmail}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.customerEmail ? 'border-red-400' : 'border-gray-300'
                          }`}
                        placeholder="Enter email address"
                      />
                      {errors.customerEmail && <p className="text-red-600 text-xs mt-1">{errors.customerEmail}</p>}


                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address *
                      </label>
                      <textarea
                        name="customerAddress"
                        value={formData.customerAddress}
                        onChange={handleInputChange}
                        rows="3"
                        aria-invalid={!!errors.customerAddress}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.customerAddress ? 'border-red-400' : 'border-gray-300'}`}
                        placeholder="Enter customer address"
                      />
                      {errors.customerAddress && <p className="text-red-600 text-xs mt-1">{errors.customerAddress}</p>}

                    </div>
                  </div>
                </div>

                {/* Follow-Up Details */}
                <div className="bg-green-50 p-4 rounded-lg max-h-[50vh] overflow-y-auto scrollbar-hide">
                  <h3 className="text-lg font-semibold text-green-800 mb-4">Follow-Up Details</h3>
                  <div className="space-y-4">
                    {/* Follow-Up Date */}
                    <div
                      className="cursor-pointer"
                      onClick={() => {
                        if (editFollowUpDateRef.current?.showPicker) editFollowUpDateRef.current.showPicker();
                        else editFollowUpDateRef.current?.focus();
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (editFollowUpDateRef.current?.showPicker) editFollowUpDateRef.current.showPicker();
                          else editFollowUpDateRef.current?.focus();
                        }
                      }}
                    >
                      <label htmlFor="editFollowUpDate" className="block text-sm font-medium text-gray-700 mb-2">
                        Follow-Up Date *
                      </label>
                      <input
                        id="editFollowUpDate"
                        ref={editFollowUpDateRef}
                        type="date"
                        name="followUpDate"
                        value={formData.followUpDate}
                        onChange={handleInputChange}
                        min={toLocalISO()}
                        aria-invalid={!!errors.followUpDate}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.followUpDate ? 'border-red-400' : 'border-gray-300'
                          }`}
                      />
                    </div>
                    {errors.followUpDate && (
                      <p className="text-red-600 text-xs mt-1">{errors.followUpDate}</p>
                    )}

                    <div>
                      <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700 mb-2">
                        Contact Person *
                      </label>
                      <input
                        id="contactPerson"
                        type="text"
                        name="contactPerson"
                        value={formData.contactPerson}
                        onChange={handleInputChange}
                        aria-invalid={!!errors.contactPerson}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.contactPerson ? 'border-red-400' : 'border-gray-300'
                          }`}
                        placeholder="Enter contact person name"
                      />
                      {errors.contactPerson && (
                        <p className="text-red-600 text-xs mt-1">{errors.contactPerson}</p>
                      )}

                    </div>
                    <div>
                      <label htmlFor="concernedPerson" className="block text-sm font-medium text-gray-700 mb-2">
                        Concerned Person *
                      </label>
                      <input
                        id="concernedPerson"
                        type="text"
                        name="concernedPerson"
                        value={formData.concernedPerson}
                        onChange={handleInputChange}
                        aria-invalid={!!errors.concernedPerson}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.concernedPerson ? 'border-red-400' : 'border-gray-300'
                          }`}
                        placeholder="Enter concerned person name"
                      />
                      {errors.concernedPerson && (
                        <p className="text-red-600 text-xs mt-1">{errors.concernedPerson}</p>
                      )}

                    </div>
                    <div>
                      <label htmlFor="followUpType" className="block text-sm font-medium text-gray-700 mb-2">Follow-Up Type *</label>
                      <select
                        id="followUpType"
                        name="followUpType"
                        value={formData.followUpType}
                        onChange={handleInputChange}
                        aria-invalid={!!errors.followUpType}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.followUpType ? 'border-red-400' : 'border-gray-300'
                          }`}
                      >
                        <option value="">Select</option>
                        <option value="call">Call</option>
                        <option value="email">Email</option>
                      </select>
                      {errors.followUpType && <p className="text-red-600 text-xs mt-1">{errors.followUpType}</p>}


                    </div>
                  </div>
                </div>

                {/* Others */}
                <div className="bg-purple-50 p-4 rounded-lg max-h-[50vh] overflow-y-auto scrollbar-hide">
                  <h3 className="text-lg font-semibold text-purple-800 mb-4">Others</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                      <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        aria-invalid={!!errors.status}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.status ? 'border-red-400' : 'border-gray-300'
                          }`}
                      >
                        <option value="">Select</option>
                        <option value="New">New</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Proposal Sent">Proposal Sent</option>
                        <option value="Negotiation">Negotiation</option>
                        <option value="Closed Won">Closed Won</option>
                        <option value="Closed Lost">Closed Lost</option>
                        <option value="On Hold">On Hold</option>
                      </select>
                      {errors.status && <p className="text-red-600 text-xs mt-1">{errors.status}</p>}


                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Credit Check *</label>
                      <input
                        type="text"
                        name="creditCheck"
                        value={formData.creditCheck}
                        onChange={handleInputChange}
                        aria-invalid={!!errors.creditCheck}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.creditCheck ? 'border-red-400' : 'border-gray-300'}`}
                        placeholder="Enter credit check details"
                      />
                      {errors.creditCheck && <p className="text-red-600 text-xs mt-1">{errors.creditCheck}</p>}

                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Remark *</label>
                      <input
                        type="text"
                        name="remark"
                        value={formData.remark}
                        onChange={handleInputChange}
                        aria-invalid={!!errors.remark}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.remark ? 'border-red-400' : 'border-gray-300'}`}
                        placeholder="Enter any remarks"
                      />
                      {errors.remark && <p className="text-red-600 text-xs mt-1">{errors.remark}</p>}

                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up Notes *</label>
                      <textarea
                        name="followupNotes"
                        value={formData.followupNotes}
                        onChange={handleInputChange}
                        rows="3"
                        aria-invalid={!!errors.followupNotes}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.followupNotes ? 'border-red-400' : 'border-gray-300'}`}
                        placeholder="Enter detailed follow-up notes"
                      />
                      {errors.followupNotes && <p className="text-red-600 text-xs mt-1">{errors.followupNotes}</p>}

                    </div>
                    {/* Next Follow-Up Date */}
                    <div
                      className="cursor-pointer"
                      onClick={() => {
                        if (editNextFollowUpDateRef.current?.showPicker) editNextFollowUpDateRef.current.showPicker();
                        else editNextFollowUpDateRef.current?.focus();
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (editNextFollowUpDateRef.current?.showPicker) editNextFollowUpDateRef.current.showPicker();
                          else editNextFollowUpDateRef.current?.focus();
                        }
                      }}
                    >
                      <label htmlFor="editNextFollowUpDate" className="block text-sm font-medium text-gray-700 mb-2">
                        Next Follow-Up Date *
                      </label>
                      <input
                        id="editNextFollowUpDate"
                        ref={editNextFollowUpDateRef}
                        type="date"
                        name="nextFollowUpDate"
                        value={formData.nextFollowUpDate}
                        onChange={handleInputChange}
                        min={getNextMinDate(formData.followUpDate)}   // ✅ same rule
                        aria-invalid={!!errors.nextFollowUpDate}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.nextFollowUpDate ? 'border-red-400' : 'border-gray-300'
                          }`}
                      />
                    </div>
                    {errors.nextFollowUpDate && (
                      <p className="text-red-600 text-xs mt-1">{errors.nextFollowUpDate}</p>
                    )}

                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-between items-center pt-6 border-t border-gray-200 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddNewFollowUpForm(true)}
                  disabled={submitting}
                  className={`px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 ${submitting
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:from-blue-600 hover:to-blue-700'
                    }`}
                >
                  <FaPlus size={16} />
                  Add New Follow-Up
                </button>
                <div className="flex gap-4">
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
                    className={`px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold transition-colors ${submitting
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:from-green-600 hover:to-green-700'
                      }`}
                  >
                    {submitting ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Updating...
                      </div>
                    ) : (
                      'Update Follow-Up'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Follow-Up Modal */}
      {showAddNewFollowUpForm && selectedFollowUp && (
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4"
          onClick={() => setShowAddNewFollowUpForm(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <FaPlus className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Add New Follow-Up</h2>
                    <p className="text-blue-100">Add a new follow-up entry for this customer</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddNewFollowUpForm(false)}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleAddNewFollowUp} className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Follow-Up Type *</label>
                  <select
                    name="followUpType"
                    value={newFollowUpData.followUpType}
                    onChange={handleNewFollowUpInputChange}
                    aria-invalid={!!newErrors.followUpType}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${newErrors.followUpType ? 'border-red-400' : 'border-gray-300'}`}
                  >
                    <option value="">Select</option>
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                  </select>
                  {newErrors.followUpType && <p className="text-red-600 text-xs mt-1">{newErrors.followUpType}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Follow-Up Notes *</label>
                  <textarea
                    name="followUpNotes"
                    value={newFollowUpData.followUpNotes}
                    onChange={handleNewFollowUpInputChange}
                    rows="4"
                    aria-invalid={!!newErrors.followUpNotes}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${newErrors.followUpNotes ? 'border-red-400' : 'border-gray-300'}`}
                    placeholder="Enter detailed follow-up notes"
                  />
                  {newErrors.followUpNotes && <p className="text-red-600 text-xs mt-1">{newErrors.followUpNotes}</p>}
                </div>
                <div
                  className="cursor-pointer"
                  onClick={() => {
                    if (newNextFollowUpDateRef.current?.showPicker) newNextFollowUpDateRef.current.showPicker();
                    else newNextFollowUpDateRef.current?.focus();
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (newNextFollowUpDateRef.current?.showPicker) newNextFollowUpDateRef.current.showPicker();
                      else newNextFollowUpDateRef.current?.focus();
                    }
                  }}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-2">Next Follow-Up Date *</label>
                  <input
                    ref={newNextFollowUpDateRef}
                    type="date"
                    name="nextFollowUpDate"
                    value={newFollowUpData.nextFollowUpDate}
                    onChange={handleNewFollowUpInputChange}
                    min={getNextMinDate(selectedFollowUp?.callingDate)}
                    aria-invalid={!!newErrors.nextFollowUpDate}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${newErrors.nextFollowUpDate ? 'border-red-400' : 'border-gray-300'}`}
                  />
                </div>
                {newErrors.nextFollowUpDate && <p className="text-red-600 text-xs mt-1">{newErrors.nextFollowUpDate}</p>}
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddNewFollowUpForm(false)}
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
                      Adding...
                    </div>
                  ) : (
                    'Add Follow-Up'
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

