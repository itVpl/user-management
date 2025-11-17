import React, { useState, useEffect, useCallback, useMemo } from 'react';

// Base URL for API (Placeholder - MUST be updated by the user)
const BASE_URL = 'https://api.your-logistics-app.com';

// --- Custom Hook for Debouncing Search Input ---
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set a timeout to update the debounced value
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function to cancel the previous timer on every change
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// --- View Driver Details Modal Component ---
const ViewDriverDetailsModal = ({ isOpen, onClose, driverData }) => {
  if (!isOpen || !driverData) return null;

  // Tailwind classes
  const inputClass = "mt-1 block w-full bg-gray-50 border border-gray-200 rounded-lg shadow-sm p-3 text-gray-700 cursor-not-allowed";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const sectionHeaderClass = "text-lg font-bold text-white border-b border-white pb-2 mb-4 -mt-4";

  return (
    <div
      className="fixed inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden transform transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-blue-600 p-4 flex justify-between items-center text-white rounded-t-xl shadow-md">
          <div className="flex items-center space-x-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <h3 className="text-xl font-bold">Driver Details</h3>
              <p className="text-sm text-blue-200">Complete information about {driverData.fullName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:text-blue-200 p-1 rounded-full transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        {/* Form Body with Scroll */}
        <div className="p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* SECTION 1: Personal & Contact Information - Blue Background */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className={sectionHeaderClass + " bg-blue-600 px-3 py-2 rounded-t-lg -mx-4 -mt-4 mb-4"}>Personal & Contact Information</h4>
              <div className="grid grid-cols-2 md:grid-cols-2 gap-6">
                
                {/* Trucker Information */}
                <div>
                  <label className={labelClass}>Trucker/Carrier</label>
                  <div className={inputClass}>
                    {driverData.truckerInfo?.truckerName || 'N/A'}
                  </div>
                  {driverData.truckerInfo && (
                    <div className="mt-2 space-y-1 text-xs">
                      <p className="text-gray-600">ID: {driverData.truckerInfo.truckerId}</p>
                      <p className="text-gray-600">MC/DOT: {driverData.truckerInfo.mcDot || 'N/A'}</p>
                      <p className="text-gray-600">Email: {driverData.truckerInfo.email || 'N/A'}</p>
                      <p className="text-gray-600">Phone: {driverData.truckerInfo.phoneNo || 'N/A'}</p>
                    </div>
                  )}
                </div>

                {/* Full Name */}
                <div>
                  <label className={labelClass}>Full Name</label>
                  <div className={inputClass}>{driverData.fullName}</div>
                </div>

                {/* Phone */}
                <div>
                  <label className={labelClass}>Phone Number</label>
                  <div className={inputClass}>{driverData.phone}</div>
                </div>

                {/* Email */}
                <div>
                  <label className={labelClass}>Email</label>
                  <div className={inputClass}>{driverData.email}</div>
                </div>

                {/* Driver License */}
                <div>
                  <label className={labelClass}>Driver License</label>
                  <div className={inputClass}>{driverData.driverLicense}</div>
                </div>

                {/* Gender */}
                <div>
                  <label className={labelClass}>Gender</label>
                  <div className={inputClass}>{driverData.gender}</div>
                </div>

                {/* Driver ID */}
                <div>
                  <label className={labelClass}>Driver ID</label>
                  <div className={inputClass}>{driverData.driverId}</div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Address Details - Green Background */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className={sectionHeaderClass + " bg-green-600 px-3 py-2 rounded-t-lg -mx-4 -mt-4 mb-4"}>Address Details</h4>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-6">
                {/* Country */}
                <div>
                  <label className={labelClass}>Country</label>
                  <div className={inputClass}>{driverData.country}</div>
                </div>

                {/* State */}
                <div>
                  <label className={labelClass}>State</label>
                  <div className={inputClass}>{driverData.state}</div>
                </div>

                {/* City */}
                <div>
                  <label className={labelClass}>City</label>
                  <div className={inputClass}>{driverData.city}</div>
                </div>

                {/* Zip Code */}
                <div>
                  <label className={labelClass}>Zip Code</label>
                  <div className={inputClass}>{driverData.zipCode}</div>
                </div>
              </div>
              
              {/* Full Address (Full Width) */}
              <div className="mt-4">
                <label className={labelClass}>Full Address</label>
                <div className={inputClass}>{driverData.fullAddress}</div>
              </div>
            </div>

            {/* SECTION 3: Compliance & Documents - Purple Background */}
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h4 className={sectionHeaderClass + " bg-purple-600 px-3 py-2 rounded-t-lg -mx-4 -mt-4 mb-4"}>Compliance & Documents</h4>
              <div className="grid grid-cols-3 md:grid-cols-3 gap-6">
                {/* MC/DOT Number */}
                <div>
                  <label className={labelClass}>MC/DOT Number</label>
                  <div className={inputClass}>{driverData.mcDot || 'N/A'}</div>
                </div>

                {/* Status */}
                <div>
                  <label className={labelClass}>Account Status</label>
                  <div className={inputClass}>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      driverData.isLoggedIn 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {driverData.isLoggedIn ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Created Date */}
                <div>
                  <label className={labelClass}>Created Date</label>
                  <div className={inputClass}>
                    {new Date(driverData.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>
              
              {/* Documents Section */}
              <div className="grid grid-cols-2 md:grid-cols-2 gap-6 mt-6">
                {/* Driver Photo */}
                <div>
                  <label className={labelClass}>Driver Photo</label>
                  {driverData.driverPhoto ? (
                    <div className="mt-1">
                      <img 
                        src={driverData.driverPhoto} 
                        alt={driverData.fullName}
                        className="w-32 h-32 rounded-lg object-cover border border-gray-200"
                      />
                      <a 
                        href={driverData.driverPhoto} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block"
                      >
                        View Full Image
                      </a>
                    </div>
                  ) : (
                    <div className={inputClass}>No photo available</div>
                  )}
                </div>

                {/* CDL Document */}
                <div>
                  <label className={labelClass}>CDL Document</label>
                  {driverData.cdlDocument ? (
                    <div className="mt-1">
                      <div className="w-32 h-32 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                      </div>
                      <a 
                        href={driverData.cdlDocument} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block"
                      >
                        View Document
                      </a>
                    </div>
                  ) : (
                    <div className={inputClass}>No document available</div>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 4: Added By Information - Orange Background */}
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <h4 className={sectionHeaderClass + " bg-orange-600 px-3 py-2 rounded-t-lg -mx-4 -mt-4 mb-4"}>Added By Information</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {/* Added By Employee */}
                <div>
                  <label className={labelClass}>Added By</label>
                  <div className={inputClass}>{driverData.addedByInfo?.employeeName || 'N/A'}</div>
                </div>

                {/* Employee ID */}
                <div>
                  <label className={labelClass}>Employee ID</label>
                  <div className={inputClass}>{driverData.addedByInfo?.empId || 'N/A'}</div>
                </div>

                {/* Department */}
                <div>
                  <label className={labelClass}>Department</label>
                  <div className={inputClass}>{driverData.addedByInfo?.department || 'N/A'}</div>
                </div>

                {/* Added Date */}
                <div>
                  <label className={labelClass}>Added Date</label>
                  <div className={inputClass}>
                    {new Date(driverData.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Close Button */}
            <div className="pt-6 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition duration-150 shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Modal Component for Adding a Driver (Updated Design with Searchable Dropdown) ---
const TruckerDriverModal = ({ isOpen, onClose, onDriverAdded }) => {
  const initialFormData = {
    truckerId: '', // This will now hold the selected _id
    fullName: '',
    phone: '',
    email: '',
    password: '',
    driverLicense: '',
    gender: 'Male',
    country: '',
    state: '',
    city: '',
    zipCode: '',
    fullAddress: '',
    mcDot: '',
    driverPhoto: null,
    cdlDocument: null
  };

  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  
  // States for the new searchable Trucker ID dropdown
  const [truckerList, setTruckerList] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const GET_TRUCKERS_URL = 'https://vpl-liveproject-1.onrender.com/api/v1/shipper_driver/truckers';

  // --- Fetch Truckers Data ---
  const fetchTruckers = useCallback(async () => {
    try {
      const response = await fetch(GET_TRUCKERS_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setTruckerList(result.data);
      } else {
        console.error("API response format is incorrect:", result);
      }
    } catch (error) {
      console.error('Error fetching truckers:', error);
      // setStatusMessage({ type: 'error', text: 'Failed to load trucker list.' }); // Optional: Show error
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchTruckers();
    }
  }, [isOpen, fetchTruckers]);


  // --- Filter Truckers based on Debounced Search Term ---
  const filteredTruckers = useMemo(() => {
    if (!debouncedSearchTerm) {
      return truckerList;
    }
    const lowerCaseSearch = debouncedSearchTerm.toLowerCase();
    return truckerList.filter(trucker => 
      trucker.compName?.toLowerCase().includes(lowerCaseSearch) ||
      trucker._id?.toLowerCase().includes(lowerCaseSearch)
    );
  }, [truckerList, debouncedSearchTerm]);


  // --- Handlers ---

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;
    
    if (type === 'file') {
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleTruckerSelect = (truckerId, compName) => {
    setFormData(prev => ({
      ...prev,
      truckerId: truckerId, // Store the _id
      // Optional: You might want to pre-fill other fields like carrier name/MC/DOT if needed
      // mcDot: trucker.mc_dot_no || '',
    }));
    setSearchTerm(compName); // Show the company name in the input
    setIsDropdownOpen(false);
  };

  const resetFormAndClose = () => {
    setFormData(initialFormData);
    setStatusMessage({ type: '', text: '' });
    setTruckerList([]); // Clear the list on close
    setSearchTerm('');
    setIsDropdownOpen(false);
    onClose();
  };

  // Auto-close modal on successful driver addition
  useEffect(() => {
    if (statusMessage.type === 'success') {
      const timer = setTimeout(() => {
        resetFormAndClose();
        if (onDriverAdded) {
          onDriverAdded(); // Refresh the driver list
        }
      }, 2000); // Close after 2 seconds
      
      return () => clearTimeout(timer);
    }
  }, [statusMessage.type, onDriverAdded]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage({ type: '', text: '' });
    setLoading(true);

    try {
      // Get token from session
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || localStorage.getItem('token') || sessionStorage.getItem('token');

      // Create FormData object for file uploads
      const submitData = new FormData();

      // Append all form fields
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== '' && key !== 'mcDot') {
          submitData.append(key, formData[key]);
        }
      });

      // API URL
      const POST_API_URL = 'https://vpl-liveproject-1.onrender.com/api/v1/driver/cmt/add';

      // Retry mechanism
      const maxRetries = 3;
      let response;

      for (let i = 0; i < maxRetries; i++) {
        try {
          response = await fetch(POST_API_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,   // ✅ Add token
            },
            body: submitData,
          });

          if (response.ok) break;

          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
          } else {
            throw new Error(`Failed after ${maxRetries} retries: ${response.status}`);
          }

        } catch (err) {
          if (i === maxRetries - 1) throw err;
        }
      }

      const result = await response.json();

      if (response.ok && result.success) {
        setStatusMessage({ type: 'success', text: 'Trucker driver added successfully! Closing modal...' });
        setFormData(initialFormData);
        setSearchTerm('');
        // Modal will auto-close due to useEffect above
      } else {
        throw new Error(result.message || "API error");
      }

    } catch (error) {
      console.error("Error adding driver:", error);
      setStatusMessage({
        type: "error",
        text: `Failed to add driver: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  // Tailwind classes
  const inputClass = "mt-1 block w-full bg-white border border-gray-200 rounded-lg shadow-sm p-3 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const sectionHeaderClass = "text-lg font-bold text-white border-b border-white pb-2 mb-4 -mt-4";

  if (!isOpen) return null;

  return (
<div
  className="fixed inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center z-50 p-4 "
  onClick={resetFormAndClose}
>
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden transform transition-all duration-300 "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-blue-600 p-4 flex justify-between items-center text-white rounded-t-xl shadow-md">
          <div className="flex items-center space-x-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <div>
              <h3 className="text-xl font-bold">Add New Trucker Driver</h3>
              <p className="text-sm text-blue-200">Register a new driver and complete their compliance profile</p>
            </div>
          </div>
          <button onClick={resetFormAndClose} className="text-white hover:text-blue-200 p-1 rounded-full transition" disabled={loading}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        {/* Form Body with Scroll */}
        <div className="p-6 overflow-y-auto">
          {/* Custom Status Message Box */}
          {statusMessage.text && (
            <div className={`p-3 mb-4 rounded-lg text-sm font-medium ${statusMessage.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
              {statusMessage.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* SECTION 1: Personal & Contact Information - Blue Background */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className={sectionHeaderClass + " bg-blue-600 px-3 py-2 rounded-t-lg -mx-4 -mt-4 mb-4"}>Personal & Contact Information</h4>
              <div className="grid grid-cols-2 md:grid-cols-2 gap-6">
                
                {/* Trucker ID/Name Dropdown (NEW) */}
                <div className="relative">
                  <label htmlFor="truckerIdSearch" className={labelClass}>Select Trucker/Carrier *</label>
                  <input
                    type="text"
                    id="truckerIdSearch"
                    name="truckerIdSearch"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)} // Delay closing
                    className={`${inputClass} ${formData.truckerId ? 'border-green-500' : ''}`}
                    placeholder="Search by Company Name or ID"
                    required
                    disabled={loading}
                  />
                  {formData.truckerId && (
                    <p className="text-xs text-green-600 mt-1">Selected ID: **{formData.truckerId}**</p>
                  )}

                  {isDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
                      {loading && (
                        <div className="p-3 text-center text-sm text-blue-500">Loading truckers...</div>
                      )}
                      {filteredTruckers.length === 0 && !loading && (
                        <div className="p-3 text-center text-sm text-gray-500">No truckers found.</div>
                      )}
                      {filteredTruckers.map((trucker) => (
                        <div
                          key={trucker._id}
                          onMouseDown={(e) => { // Use onMouseDown to capture click before onBlur fires
                            e.preventDefault(); 
                            handleTruckerSelect(trucker._id, trucker.compName);
                          }}
                          className="p-3 hover:bg-blue-50 cursor-pointer transition duration-100 border-b border-gray-100 last:border-b-0"
                        >
                          <p className="text-sm font-semibold text-gray-800">{trucker.compName || 'N/A'}</p>
                          <p className="text-xs text-gray-500">ID: {trucker._id}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <input type="hidden" name="truckerId" value={formData.truckerId} />
                </div>

                {/* Full Name */}
                <div>
                  <label htmlFor="fullName" className={labelClass}>Full Name *</label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className={inputClass}
                    placeholder="e.g., John Doe"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className={labelClass}>Phone Number *</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={inputClass}
                    placeholder="e.g., 1234567890"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className={labelClass}>Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={inputClass}
                    placeholder="e.g., driver@example.com"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className={labelClass}>Password *</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={inputClass}
                    placeholder="Enter secure password"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Driver License */}
                <div>
                  <label htmlFor="driverLicense" className={labelClass}>Driver License *</label>
                  <input
                    type="text"
                    id="driverLicense"
                    name="driverLicense"
                    value={formData.driverLicense}
                    onChange={handleInputChange}
                    className={inputClass}
                    placeholder="e.g., DL123456"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Gender */}
                <div>
                  <label htmlFor="gender" className={labelClass}>Gender *</label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className={inputClass}
                    required
                    disabled={loading}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 2: Address Details - Green Background */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className={sectionHeaderClass + " bg-green-600 px-3 py-2 rounded-t-lg -mx-4 -mt-4 mb-4"}>Address Details</h4>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-6">
                {/* Country */}
                <div>
                  <label htmlFor="country" className={labelClass}>Country *</label>
                  <input
                    type="text"
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className={inputClass}
                    placeholder="e.g., USA"
                    required
                    disabled={loading}
                  />
                </div>

                {/* State */}
                <div>
                  <label htmlFor="state" className={labelClass}>State *</label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className={inputClass}
                    placeholder="e.g., CA"
                    required
                    disabled={loading}
                  />
                </div>

                {/* City */}
                <div>
                  <label htmlFor="city" className={labelClass}>City *</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className={inputClass}
                    placeholder="e.g., Los Angeles"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Zip Code */}
                <div>
                  <label htmlFor="zipCode" className={labelClass}>Zip Code *</label>
                  <input
                    type="text"
                    id="zipCode"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    className={inputClass}
                    placeholder="e.g., 90001"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              
              {/* Full Address (Full Width) */}
              <div className="mt-4">
                <label htmlFor="fullAddress" className={labelClass}>Full Address *</label>
                <textarea
                  id="fullAddress"
                  name="fullAddress"
                  value={formData.fullAddress}
                  onChange={handleInputChange}
                  rows="2"
                  className={inputClass}
                  placeholder="e.g., 123 Main St, Los Angeles, CA 90001"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* SECTION 3: Compliance & Documents - Purple Background */}
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h4 className={sectionHeaderClass + " bg-purple-600 px-3 py-2 rounded-t-lg -mx-4 -mt-4 mb-4"}>Compliance & Documents</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* MC/DOT Number (Now optional/moved) */}
                <div>
                  <label htmlFor="mcDot" className={labelClass}>MC/DOT Number (Optional)</label>
                  <input
                    type="text"
                    id="mcDot"
                    name="mcDot"
                    value={formData.mcDot}
                    onChange={handleInputChange}
                    className={inputClass}
                    placeholder="e.g., MC123456"
                    disabled={loading}
                  />
                </div>

                {/* Driver Photo */}
               
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-2 gap-6 mt-6">
                           <div>
                  <label htmlFor="driverPhoto" className={labelClass}>Driver Photo</label>
                  <input
                    type="file"
                    id="driverPhoto"
                    name="driverPhoto"
                    onChange={handleInputChange}
                    className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer mt-1 block w-full bg-white border border-gray-200 rounded-lg shadow-sm p-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
                    accept="image/*"
                    disabled={loading}
                  />
                </div>

                {/* CDL Document */}
                <div>
                  <label htmlFor="cdlDocument" className={labelClass}>CDL Document</label>
                  <input
                    type="file"
                    id="cdlDocument"
                    name="cdlDocument"
                    onChange={handleInputChange}
                    className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer mt-1 block w-full bg-white border border-gray-200 rounded-lg shadow-sm p-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
                    accept=".pdf,.doc,.docx,image/*"
                    disabled={loading}
                  />
                              </div>
                              </div>
            </div>
            
            {/* Submit/Cancel Buttons */}
            <div className="pt-6 border-t border-gray-100 flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetFormAndClose}
                className="px-5 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition duration-150 disabled:opacity-50 shadow-sm"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 shadow-md"
                disabled={loading || !formData.truckerId}
              >
                {loading ? 'Adding...' : 'Add Driver'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- Main AddTruckerDriver Component ---
const AddTruckerDriver = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driversData, setDriversData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Get user data from session storage
  const getUserData = () => {
    try {
      const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  };

  // Fetch drivers data
  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const userData = getUserData();
      if (!userData || !userData.empId) {
        throw new Error('User data not found. Please login again.');
      }

      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }

      const API_URL = `https://vpl-liveproject-1.onrender.com/api/v1/driver/cmt/my-drivers?empId=${userData.empId}`;

      const response = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setDriversData(result.drivers || []);
      } else {
        throw new Error(result.message || 'Failed to fetch drivers data');
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  // Filter drivers based on search term
  const filteredDrivers = useMemo(() => {
    if (!searchTerm) return driversData;
    
    const lowerCaseSearch = searchTerm.toLowerCase();
    return driversData.filter(driver => 
      driver.driverId?.toLowerCase().includes(lowerCaseSearch) ||
      driver.fullName?.toLowerCase().includes(lowerCaseSearch) ||
      driver.truckerInfo?.truckerName?.toLowerCase().includes(lowerCaseSearch) ||
      driver.email?.toLowerCase().includes(lowerCaseSearch)
    );
  }, [driversData, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredDrivers.length / itemsPerPage);
  const currentDrivers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredDrivers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredDrivers, currentPage, itemsPerPage]);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Refresh drivers list after adding a new driver
  const handleDriverAdded = () => {
    fetchDrivers();
  };

  // Handle view details
  const handleViewDetails = (driver) => {
    setSelectedDriver(driver);
    setIsViewModalOpen(true);
  };

  // Close view modal
  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedDriver(null);
  };

  // Get user data for display
  const userData = getUserData();

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading drivers data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen font-sans flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Error Loading Data</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchDrivers}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-150"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      
     

      {/* Stats Cards and Search Bar */}
      <div className="flex flex-wrap md:flex-nowrap justify-between items-center mb-8 gap-4">
        <div className="flex space-x-4">
          {/* Total Drivers Card */}
          <div className="flex items-center space-x-4 p-5 bg-white rounded-xl shadow-xl border-l-4 border-blue-500 min-w-[200px]">
            <div className="bg-blue-100 p-3 rounded-full text-blue-600">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path>
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Drivers</p>
              <p className="text-2xl font-bold text-gray-900">{driversData.length}</p>
            </div>
          </div>

          {/* Active Drivers Card */}
          <div className="flex items-center space-x-4 p-5 bg-white rounded-xl shadow-xl border-l-4 border-green-500 min-w-[200px]">
            <div className="bg-green-100 p-3 rounded-full text-green-600">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Drivers</p>
              <p className="text-2xl font-bold text-green-600">
                {driversData.filter(driver => driver.isLoggedIn).length}
              </p>
            </div>
          </div>

          {/* Unique Truckers Card */}
          <div className="hidden lg:flex items-center space-x-4 p-5 bg-white rounded-xl shadow-xl border-l-4 border-purple-500 min-w-[200px]">
            <div className="bg-purple-100 p-3 rounded-full text-purple-600">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"></path>
                <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1v-1a1 1 0 011-1h2a1 1 0 011 1v1a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H19a1 1 0 001-1V5a1 1 0 00-1-1H3z"></path>
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Unique Truckers</p>
              <p className="text-2xl font-bold text-purple-600">
                {new Set(driversData.map(driver => driver.truckerInfo?.truckerId)).size}
              </p>
            </div>
          </div>
        </div>

        {/* Add Driver Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-5 rounded-xl shadow-lg transition duration-150 ease-in-out flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
          </svg>
          <span>Add Trucker Driver</span>
        </button>

        {/* Search Input */}
        <div className="relative w-full md:w-auto">
          <input
            type="text"
            placeholder="Search by Driver ID, Name, Trucker, or Email"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page when searching
            }}
            className="w-full md:w-80 pl-10 pr-4 py-3 border border-gray-300 rounded-xl shadow-inner focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-150"
          />
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
      </div>

      {/* Data Table Section */}
      <div className="bg-white rounded-xl shadow-2xl overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">S.NO</th>
              {/* <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">DRIVER ID</th> */}
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">DRIVER NAME</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">EMAIL</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">PHONE</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">TRUCKER</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">LICENSE</th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">STATUS</th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">ACTION</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {currentDrivers.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                    <p className="text-lg font-medium text-gray-600">No drivers found</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first driver'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              currentDrivers.map((driver, index) => (
                <tr key={driver.driverId} className="hover:bg-blue-50/50 transition duration-100">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </td>
                  {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold cursor-pointer hover:underline">
                    {driver.driverId}
                  </td> */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    <div className="flex items-center">
                    
                      {driver.fullName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{driver.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{driver.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    <div>
                      <p className="font-medium">{driver.truckerInfo?.truckerName || 'N/A'}</p>
                      <p className="text-xs text-gray-500">MC: {driver.truckerInfo?.mcDot || 'N/A'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{driver.driverLicense}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      driver.isLoggedIn 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {driver.isLoggedIn ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <button 
                      onClick={() => handleViewDetails(driver)}
                      className="bg-blue-500 hover:bg-blue-600 text-white py-1.5 px-3.5 rounded-lg text-xs font-medium transition duration-150 shadow-md"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Section */}
        {filteredDrivers.length > 0 && (
          <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <p className="text-sm text-gray-600">
              Showing <span className="font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-bold">
                {Math.min(currentPage * itemsPerPage, filteredDrivers.length)}
              </span> of{' '}
              <span className="font-bold">{filteredDrivers.length}</span> drivers
            </p>
            <div className="flex space-x-2">
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                Previous
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                    currentPage === page
                      ? 'text-blue-700 bg-blue-100 border border-blue-500'
                      : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* The Add Driver Modal */}
      <TruckerDriverModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onDriverAdded={handleDriverAdded}
      />

      {/* The View Driver Details Modal */}
      <ViewDriverDetailsModal 
        isOpen={isViewModalOpen}
        onClose={handleCloseViewModal}
        driverData={selectedDriver}
      />
    </div>
  );
};

export default AddTruckerDriver;