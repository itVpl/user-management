import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaPhone, FaEnvelope, FaCalendar, FaClock, FaUser, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaPlus, FaSearch } from 'react-icons/fa';
import API_CONFIG from '../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

export default function DailyFollowUp() {
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddFollowUpForm, setShowAddFollowUpForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [showAddNewFollowUpForm, setShowAddNewFollowUpForm] = useState(false);
  const [newFollowUpData, setNewFollowUpData] = useState({
    followUpType: 'call',
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
    followUpType: 'call',
    status: 'pending',
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
          // Get the latest follow-up from the followUps array
          const latestFollowUp = item.followUps && item.followUps.length > 0 
            ? item.followUps[item.followUps.length - 1] 
            : null;

          return {
            id: item._id,
            sNo: index + 1,
            customerName: item.customerName,
            customerPhone: item.phone,
            customerEmail: item.email,
            followUpDate: latestFollowUp ? new Date(latestFollowUp.followUpDate).toISOString().split('T')[0] : '',
            followUpType: latestFollowUp ? latestFollowUp.followUpType : '',
            nextFollowUpDate: latestFollowUp ? new Date(latestFollowUp.nextFollowUpDate).toISOString().split('T')[0] : '',
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

  // Priority color helper
  const priorityColor = (priority) => {
    if (priority === 'high') return 'bg-red-100 text-red-700';
    if (priority === 'normal') return 'bg-blue-100 text-blue-700';
    if (priority === 'low') return 'bg-gray-100 text-gray-700';
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
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if we're in edit mode
    if (showEditModal && selectedFollowUp) {
      await handleUpdateFollowUp();
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Prepare API data according to the API specification
      const apiData = {
        customerName: formData.customerName,
        address: formData.customerAddress,
        phone: formData.customerPhone,
        contactPerson: formData.contactPerson,
        concernedPerson: formData.concernedPerson,
        email: formData.customerEmail,
        remarks: formData.remark,
        callingDate: formData.followUpDate,
        status: formData.status,
        creditCheck: formData.creditCheck,
        followUpType: formData.followUpType.charAt(0).toUpperCase() + formData.followUpType.slice(1), // Capitalize first letter
        followUpNotes: formData.followupNotes,
        nextFollowUpDate: formData.nextFollowUpDate
      };

      // Get authentication token
      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      
      if (!token) {
        alertify.error('Authentication required. Please login again.');
        return;
      }

      // Make API call with authentication
      const response = await axios.post(`${API_CONFIG.BASE_URL}/api/v1/sales-followup/create`, apiData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      });

      if (response.status === 200 || response.status === 201) {
        // Create new follow-up for local state
        const newFollowUp = {
          id: `FU-${Date.now().toString().slice(-6)}`,
          customerName: formData.customerName,
          customerPhone: formData.customerPhone,
          customerEmail: formData.customerEmail,
          customerAddress: formData.customerAddress,
          followUpDate: formData.followUpDate,
          contactPerson: formData.contactPerson,
          concernedPerson: formData.concernedPerson,
          followUpType: formData.followUpType,
          status: formData.status,
          creditCheck: formData.creditCheck,
          remark: formData.remark,
          followupNotes: formData.followupNotes,
          nextFollowUpDate: formData.nextFollowUpDate,
          createdAt: new Date().toISOString().split('T')[0],
          createdBy: 'Employee 1234'
        };

        setFollowUps(prevFollowUps => [newFollowUp, ...prevFollowUps]);
        
        // Close modal and reset form
        setShowAddFollowUpForm(false);
        setFormData({
          customerName: '',
          customerPhone: '',
          customerEmail: '',
          customerAddress: '',
          followUpDate: '',
          contactPerson: '',
          concernedPerson: '',
          followUpType: 'call',
          status: 'pending',
          creditCheck: '',
          remark: '',
          followupNotes: '',
          nextFollowUpDate: '',
          documents: null
        });

        alertify.success('✅ Follow-up created successfully!');
      }
    } catch (error) {
      console.error('Error creating follow-up:', error);
      if (error.response) {
        // Server responded with error
        alertify.error(`Error: ${error.response.data.message || 'Failed to create follow-up'}`);
      } else if (error.request) {
        // Network error
        alertify.error('Network error. Please check your connection.');
      } else {
        // Other error
        alertify.error('Error creating follow-up. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle update follow-up
  const handleUpdateFollowUp = async () => {
    try {
      setSubmitting(true);
      
      // Prepare API data for update - send all form data
      const apiData = {
        customerName: formData.customerName,
        address: formData.customerAddress,
        phone: formData.customerPhone,
        contactPerson: formData.contactPerson,
        concernedPerson: formData.concernedPerson,
        email: formData.customerEmail,
        remarks: formData.remark,
        callingDate: formData.followUpDate,
        status: formData.status,
        creditCheck: formData.creditCheck,
        followUpType: formData.followUpType.charAt(0).toUpperCase() + formData.followUpType.slice(1),
        followUpNotes: formData.followupNotes,
        nextFollowUpDate: formData.nextFollowUpDate
      };

      // Get authentication token
      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      
      if (!token) {
        alertify.error('Authentication required. Please login again.');
        return;
      }

      // Make API call for update
      const response = await axios.put(
        `${API_CONFIG.BASE_URL}/api/v1/sales-followup/${selectedFollowUp._id}`, 
        apiData, 
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          withCredentials: true
        }
      );

      if (response.status === 200 || response.status === 201) {
        // Update the follow-up in local state
        setFollowUps(prevFollowUps => 
          prevFollowUps.map(followUp => 
            followUp.id === selectedFollowUp._id 
              ? {
                  ...followUp,
                  customerName: formData.customerName,
                  phone: formData.customerPhone,
                  email: formData.customerEmail,
                  address: formData.customerAddress,
                  contactPerson: formData.contactPerson,
                  concernedPerson: formData.concernedPerson,
                  followUpDate: formData.followUpDate,
                  followUpType: formData.followUpType,
                  status: formData.status,
                  creditCheck: formData.creditCheck,
                  remark: formData.remark,
                  followupNotes: formData.followupNotes,
                  nextFollowUpDate: formData.nextFollowUpDate
                }
              : followUp
          )
        );
        
        // Close modal and reset form
        setShowEditModal(false);
        setSelectedFollowUp(null);
        setFormData({
          customerName: '',
          customerPhone: '',
          customerEmail: '',
          customerAddress: '',
          followUpDate: '',
          contactPerson: '',
          concernedPerson: '',
          followUpType: 'call',
          status: 'pending',
          creditCheck: '',
          remark: '',
          followupNotes: '',
          nextFollowUpDate: '',
          documents: null
        });

        alertify.success('✅ Follow-up updated successfully!');
        
        // Refresh the data
        fetchFollowUps();
      }
    } catch (error) {
      console.error('Error updating follow-up:', error);
      if (error.response) {
        // Server responded with error
        alertify.error(`Error: ${error.response.data.message || 'Failed to update follow-up'}`);
      } else if (error.request) {
        // Network error
        alertify.error('Network error. Please check your connection.');
      } else {
        // Other error
        alertify.error('Error updating follow-up. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle view follow-up
  const handleViewFollowUp = async (followUp) => {
    try {
      setViewLoading(true);
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
      setViewLoading(false);
    }
  };

  // Handle edit follow-up
  const handleEditFollowUp = async (followUp) => {
    try {
      setEditLoading(true);
      
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
      setEditLoading(false);
    }
  };

  // Reset form when modal closes
  const handleCloseModal = () => {
    setShowAddFollowUpForm(false);
    setShowEditModal(false);
    setShowAddNewFollowUpForm(false);
    setFormData({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      followUpDate: '',
      contactPerson: '',
      concernedPerson: '',
      followUpType: 'call',
      status: 'pending',
      creditCheck: '',
      remark: '',
      followupNotes: '',
      nextFollowUpDate: '',
      documents: null
    });
    setNewFollowUpData({
      followUpType: 'call',
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
        followUpType: newFollowUpData.followUpType.charAt(0).toUpperCase() + newFollowUpData.followUpType.slice(1),
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
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading follow-ups...</p>
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
                <p className="text-xl font-bold text-purple-600">{followUps.filter(fu => fu.followUpDate === new Date().toISOString().split('T')[0]).length}</p>
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
                       {followUp.followUpType === 'Call' && <FaPhone className="text-blue-500" size={14} />}
                       {followUp.followUpType === 'Email' && <FaEnvelope className="text-green-500" size={14} />}
                       <span className="font-medium text-gray-700">{followUp.followUpType}</span>
                     </div>
                   </td>
                   <td className="py-2 px-3">
                     <span className="font-medium text-gray-700">{followUp.nextFollowUpDate}</span>
                   </td>
                   <td className="py-2 px-3">
                     <div className="flex items-center gap-2">
                       <button
                         onClick={() => handleViewFollowUp(followUp)}
                         disabled={viewLoading}
                         className={`px-3 py-1 text-white text-xs rounded-md transition-colors ${
                           viewLoading 
                             ? 'bg-gray-400 cursor-not-allowed' 
                             : 'bg-blue-500 hover:bg-blue-600'
                         }`}
                       >
                         {viewLoading ? 'Loading...' : 'View'}
                       </button>
                                               <button
                          onClick={() => handleEditFollowUp(followUp)}
                          disabled={editLoading}
                          className={`px-3 py-1 text-white text-xs rounded-md transition-colors ${
                            editLoading 
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : 'bg-green-500 hover:bg-green-600'
                          }`}
                        >
                          {editLoading ? 'Loading...' : 'Edit'}
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
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full">
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
             <form onSubmit={handleSubmit} className="p-6">
                               <div className="grid grid-cols-3 gap-6 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
                                 {/* Customer Information */}
                 <div className="bg-blue-50 p-4 rounded-lg max-h-[50vh] overflow-y-auto scrollbar-hide">
                   <h3 className="text-lg font-semibold text-blue-800 mb-4">Customer Information</h3>
                                      <div className="space-y-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name *</label>
                       <input
                         type="text"
                         name="customerName"
                         value={formData.customerName}
                         onChange={handleInputChange}
                         required
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         placeholder="Enter customer name"
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                       <input
                         type="tel"
                         name="customerPhone"
                         value={formData.customerPhone}
                         onChange={handleInputChange}
                         required
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         placeholder="Enter phone number"
                       />
                     </div>
                                           <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                        <input
                          type="email"
                          name="customerEmail"
                          value={formData.customerEmail}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter email address"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                        <textarea
                          name="customerAddress"
                          value={formData.customerAddress}
                          onChange={handleInputChange}
                          rows="3"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter customer address"
                        />
                      </div>
                    </div>
                  </div>

                                 {/* Follow-Up Details */}
                 <div className="bg-green-50 p-4 rounded-lg max-h-[50vh] overflow-y-auto scrollbar-hide">
                   <h3 className="text-lg font-semibold text-green-800 mb-4">Follow-Up Details</h3>
                   <div className="space-y-4">
                                         <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Follow-Up Date *</label>
                       <input
                         type="date"
                         name="followUpDate"
                         value={formData.followUpDate}
                         onChange={handleInputChange}
                         required
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                       />
                     </div>
                                         <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person *</label>
                       <input
                         type="text"
                         name="contactPerson"
                         value={formData.contactPerson}
                         onChange={handleInputChange}
                         required
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                         placeholder="Enter contact person name"
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Concerned Person *</label>
                       <input
                         type="text"
                         name="concernedPerson"
                         value={formData.concernedPerson}
                         onChange={handleInputChange}
                         required
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                         placeholder="Enter concerned person name"
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Follow-Up Type *</label>
                       <select
                         name="followUpType"
                         value={formData.followUpType}
                         onChange={handleInputChange}
                         required
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                       >
                         <option value="call">Call</option>
                         <option value="email">Email</option>
                       </select>
                     </div>
                  </div>
                </div>

                                 {/* Others */}
                 <div className="bg-purple-50 p-4 rounded-lg max-h-[50vh] overflow-y-auto scrollbar-hide">
                   <h3 className="text-lg font-semibold text-purple-800 mb-4">Others</h3>
                   <div className="space-y-4">
                                         <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                       <select
                         name="status"
                         value={formData.status}
                         onChange={handleInputChange}
                         required
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                       >
                         <option value="New">New</option>
                         <option value="In Progress">In Progress</option>
                         <option value="Qualified">Qualified</option>
                         <option value="Proposal Sent">Proposal Sent</option>
                         <option value="Negotiation">Negotiation</option>
                         <option value="Closed Won">Closed Won</option>
                         <option value="Closed Lost">Closed Lost</option>
                         <option value="On Hold">On Hold</option>
                       </select>
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Credit Check</label>
                       <input
                         type="text"
                         name="creditCheck"
                         value={formData.creditCheck}
                         onChange={handleInputChange}
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                         placeholder="Enter credit check details"
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Remark</label>
                       <input
                         type="text"
                         name="remark"
                         value={formData.remark}
                         onChange={handleInputChange}
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                         placeholder="Enter any remarks"
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up Notes</label>
                       <textarea
                         name="followupNotes"
                         value={formData.followupNotes}
                         onChange={handleInputChange}
                         rows="3"
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                         placeholder="Enter detailed follow-up notes"
                       />
                     </div>
                                         <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Next Follow-Up Date</label>
                       <input
                         type="date"
                         name="nextFollowUpDate"
                         value={formData.nextFollowUpDate}
                         onChange={handleInputChange}
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                       />
                     </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className={`px-6 py-3 border border-gray-300 rounded-lg transition-colors ${
                    submitting 
                      ? 'opacity-50 cursor-not-allowed text-gray-400' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold transition-colors ${
                    submitting 
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
         <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4">
           <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" style={{
             scrollbarWidth: 'none',
             msOverflowStyle: 'none',
           }}>
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
                           <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                             followUp.followUpType === 'Call' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
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
         <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4">
           <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full">
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
             <form onSubmit={handleSubmit} className="p-6">
               <div className="grid grid-cols-3 gap-6 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
                 {/* Customer Information */}
                 <div className="bg-blue-50 p-4 rounded-lg max-h-[50vh] overflow-y-auto scrollbar-hide">
                   <h3 className="text-lg font-semibold text-blue-800 mb-4">Customer Information</h3>
                   <div className="space-y-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name *</label>
                       <input
                         type="text"
                         name="customerName"
                         value={formData.customerName}
                         onChange={handleInputChange}
                         required
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         placeholder="Enter customer name"
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                       <input
                         type="tel"
                         name="customerPhone"
                         value={formData.customerPhone}
                         onChange={handleInputChange}
                         required
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         placeholder="Enter phone number"
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                       <input
                         type="email"
                         name="customerEmail"
                         value={formData.customerEmail}
                         onChange={handleInputChange}
                         required
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         placeholder="Enter email address"
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                       <textarea
                         name="customerAddress"
                         value={formData.customerAddress}
                         onChange={handleInputChange}
                         rows="3"
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         placeholder="Enter customer address"
                       />
                     </div>
                   </div>
                 </div>

                 {/* Follow-Up Details */}
                 <div className="bg-green-50 p-4 rounded-lg max-h-[50vh] overflow-y-auto scrollbar-hide">
                   <h3 className="text-lg font-semibold text-green-800 mb-4">Follow-Up Details</h3>
                   <div className="space-y-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Follow-Up Date *</label>
                       <input
                         type="date"
                         name="followUpDate"
                         value={formData.followUpDate}
                         onChange={handleInputChange}
                         required
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person *</label>
                       <input
                         type="text"
                         name="contactPerson"
                         value={formData.contactPerson}
                         onChange={handleInputChange}
                         required
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                         placeholder="Enter contact person name"
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Concerned Person *</label>
                       <input
                         type="text"
                         name="concernedPerson"
                         value={formData.concernedPerson}
                         onChange={handleInputChange}
                         required
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                         placeholder="Enter concerned person name"
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Follow-Up Type *</label>
                       <select
                         name="followUpType"
                         value={formData.followUpType}
                         onChange={handleInputChange}
                         required
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                       >
                         <option value="call">Call</option>
                         <option value="email">Email</option>
                       </select>
                     </div>
                   </div>
                 </div>

                 {/* Others */}
                 <div className="bg-purple-50 p-4 rounded-lg max-h-[50vh] overflow-y-auto scrollbar-hide">
                   <h3 className="text-lg font-semibold text-purple-800 mb-4">Others</h3>
                   <div className="space-y-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                       <select
                         name="status"
                         value={formData.status}
                         onChange={handleInputChange}
                         required
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                       >
                         <option value="New">New</option>
                         <option value="In Progress">In Progress</option>
                         <option value="Qualified">Qualified</option>
                         <option value="Proposal Sent">Proposal Sent</option>
                         <option value="Negotiation">Negotiation</option>
                         <option value="Closed Won">Closed Won</option>
                         <option value="Closed Lost">Closed Lost</option>
                         <option value="On Hold">On Hold</option>
                       </select>
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Credit Check</label>
                       <input
                         type="text"
                         name="creditCheck"
                         value={formData.creditCheck}
                         onChange={handleInputChange}
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                         placeholder="Enter credit check details"
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Remark</label>
                       <input
                         type="text"
                         name="remark"
                         value={formData.remark}
                         onChange={handleInputChange}
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                         placeholder="Enter any remarks"
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up Notes</label>
                       <textarea
                         name="followupNotes"
                         value={formData.followupNotes}
                         onChange={handleInputChange}
                         rows="3"
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                         placeholder="Enter detailed follow-up notes"
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Next Follow-Up Date</label>
                       <input
                         type="date"
                         name="nextFollowUpDate"
                         value={formData.nextFollowUpDate}
                         onChange={handleInputChange}
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                       />
                     </div>
                   </div>
                 </div>
               </div>

               {/* Form Actions */}
               <div className="flex justify-between items-center pt-6 border-t border-gray-200 mt-6">
                 <button
                   type="button"
                   onClick={() => setShowAddNewFollowUpForm(true)}
                   disabled={submitting}
                   className={`px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                     submitting 
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
                     className={`px-6 py-3 border border-gray-300 rounded-lg transition-colors ${
                       submitting 
                         ? 'opacity-50 cursor-not-allowed text-gray-400' 
                         : 'text-gray-700 hover:bg-gray-50'
                     }`}
                   >
                     Cancel
                   </button>
                   <button
                     type="submit"
                     disabled={submitting}
                     className={`px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold transition-colors ${
                       submitting 
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
         <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4">
           <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full">
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
                     required
                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   >
                     <option value="call">Call</option>
                     <option value="email">Email</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">Follow-Up Notes</label>
                   <textarea
                     name="followUpNotes"
                     value={newFollowUpData.followUpNotes}
                     onChange={handleNewFollowUpInputChange}
                     rows="4"
                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     placeholder="Enter detailed follow-up notes"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">Next Follow-Up Date</label>
                   <input
                     type="date"
                     name="nextFollowUpDate"
                     value={newFollowUpData.nextFollowUpDate}
                     onChange={handleNewFollowUpInputChange}
                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   />
                 </div>
               </div>

               {/* Form Actions */}
               <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 mt-6">
                 <button
                   type="button"
                   onClick={() => setShowAddNewFollowUpForm(false)}
                   disabled={submitting}
                   className={`px-6 py-3 border border-gray-300 rounded-lg transition-colors ${
                     submitting 
                       ? 'opacity-50 cursor-not-allowed text-gray-400' 
                       : 'text-gray-700 hover:bg-gray-50'
                   }`}
                 >
                   Cancel
                 </button>
                 <button
                   type="submit"
                   disabled={submitting}
                   className={`px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold transition-colors ${
                     submitting 
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