import React, { useState, useEffect, useCallback, useMemo } from 'react';
import API_CONFIG from '../../config/api';
import { Search, PlusCircle, ChevronLeft, ChevronRight, User } from 'lucide-react';

// Base URL for API
const BASE_URL = API_CONFIG.BASE_URL;

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

  const inputClass = "mt-1 block w-full bg-gray-50 border border-gray-200 rounded-lg shadow-sm p-3 text-gray-700 cursor-not-allowed";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-2" onClick={onClose}>
      <div
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header - same as DeliveryOrder */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-t-3xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Driver Details</h2>
                <p className="text-blue-100">{driverData.fullName}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="text-white hover:text-gray-200 text-2xl font-bold leading-none">
              ×
            </button>
          </div>
        </div>

        {/* Form Body with Scroll - Hide Scrollbar */}
        <div className="p-4 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch]">
          <style jsx>{`
            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div className="hide-scrollbar space-y-6">
            {/* SECTION 1: Personal & Contact - same as DeliveryOrder popup */}
            <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-blue-100 px-4 py-3">
                <h3 className="text-lg font-semibold text-blue-800">Personal & Contact Information</h3>
              </div>
              <div className="bg-white p-4 border-t border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>Trucker/Carrier</label>
                    <div className={inputClass}>{driverData.truckerInfo?.truckerName || 'N/A'}</div>
                  </div>
                  <div>
                    <label className={labelClass}>Full Name</label>
                    <div className={inputClass}>{driverData.fullName}</div>
                  </div>
                  <div>
                    <label className={labelClass}>Phone Number</label>
                    <div className={inputClass}>{driverData.phone}</div>
                  </div>
                  <div>
                    <label className={labelClass}>Email</label>
                    <div className={inputClass}>{driverData.email}</div>
                  </div>
                  <div>
                    <label className={labelClass}>Driver License</label>
                    <div className={inputClass}>{driverData.driverLicense}</div>
                  </div>
                  <div>
                    <label className={labelClass}>Gender</label>
                    <div className={inputClass}>{driverData.gender}</div>
                  </div>
                  <div>
                    <label className={labelClass}>Driver ID</label>
                    <div className={inputClass}>{driverData.driverId}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Address Details - same as DeliveryOrder popup */}
            <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-green-100 px-4 py-3">
                <h3 className="text-lg font-semibold text-green-800">Address Details</h3>
              </div>
              <div className="bg-white p-4 border-t border-gray-200">
                <div className="grid grid-cols-3 md:grid-cols-4 gap-6">
                  <div>
                    <label className={labelClass}>Country</label>
                    <div className={inputClass}>{driverData.country}</div>
                  </div>
                  <div>
                    <label className={labelClass}>State</label>
                    <div className={inputClass}>{driverData.state}</div>
                  </div>
                  <div>
                    <label className={labelClass}>City</label>
                    <div className={inputClass}>{driverData.city}</div>
                  </div>
                  <div>
                    <label className={labelClass}>Zip Code</label>
                    <div className={inputClass}>{driverData.zipCode}</div>
                  </div>
                </div>
                <div className="mt-4">
                  <label className={labelClass}>Full Address</label>
                  <div className={inputClass}>{driverData.fullAddress}</div>
                </div>
              </div>
            </div>

            {/* SECTION 3: Compliance & Documents - same as DeliveryOrder popup */}
            <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-purple-100 px-4 py-3">
                <h3 className="text-lg font-semibold text-purple-800">Compliance & Documents</h3>
              </div>
              <div className="bg-white p-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            </div>

            {/* SECTION 4: Added By Information - same as DeliveryOrder popup */}
            <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-orange-100 px-4 py-3">
                <h3 className="text-lg font-semibold text-orange-800">Added By Information</h3>
              </div>
              <div className="bg-white p-4 border-t border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <label className={labelClass}>Added By</label>
                    <div className={inputClass}>{driverData.addedByInfo?.employeeName || 'N/A'}</div>
                  </div>
                  <div>
                    <label className={labelClass}>Employee ID</label>
                    <div className={inputClass}>{driverData.addedByInfo?.empId || 'N/A'}</div>
                  </div>
                  <div>
                    <label className={labelClass}>Department</label>
                    <div className={inputClass}>{driverData.addedByInfo?.department || 'N/A'}</div>
                  </div>
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
  const [truckersLoading, setTruckersLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const TRUCKERS_LIST_PATH = `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/truckers`;

  // GET /api/v1/shipper_driver/truckers — full list when search is empty; ?search= when typed (server filter).
  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();

    (async () => {
      setTruckersLoading(true);
      try {
        const token =
          localStorage.getItem('authToken') ||
          sessionStorage.getItem('authToken') ||
          localStorage.getItem('token') ||
          sessionStorage.getItem('token');
        const url = new URL(TRUCKERS_LIST_PATH);
        const q = debouncedSearchTerm.trim();
        if (q) url.searchParams.set('search', q);

        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setTruckerList(result.data);
        } else {
          console.error('API response format is incorrect:', result);
          setTruckerList([]);
        }
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Error fetching truckers:', error);
        setTruckerList([]);
      } finally {
        if (!controller.signal.aborted) setTruckersLoading(false);
      }
    })();

    return () => controller.abort();
  }, [isOpen, debouncedSearchTerm]);


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
      if (!token) {
        throw new Error("Authentication token missing. Please login again.");
      }

      // Create FormData object for file uploads
      const submitData = new FormData();

      // Append all form fields
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== '' && key !== 'mcDot') {
          submitData.append(key, formData[key]);
        }
      });

      // API URL
      const POST_API_URL = `${API_CONFIG.BASE_URL}/api/v1/driver/cmt/add`;

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-2">
      <div
        className="bg-white rounded-3xl max-w-6xl w-full max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header - same as DeliveryOrder */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-t-3xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <PlusCircle className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Add New Trucker Driver</h2>
                <p className="text-blue-100">Register a new driver and complete their compliance profile</p>
              </div>
            </div>
            <button type="button" onClick={resetFormAndClose} className="text-white hover:text-gray-200 text-2xl font-bold leading-none" disabled={loading}>
              ×
            </button>
          </div>
        </div>

        {/* Form Body with Scroll - Hide Scrollbar */}
        <div className="p-4 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch]">
          <style jsx>{`
            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div className="hide-scrollbar">
            {/* Custom Status Message Box */}
            {statusMessage.text && (
              <div className={`p-3 mb-4 rounded-lg text-sm font-medium ${statusMessage.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
                {statusMessage.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* SECTION 1: Personal & Contact - same as DeliveryOrder popup */}
              <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <div className="bg-blue-100 px-4 py-3">
                  <h3 className="text-lg font-semibold text-blue-800">Personal & Contact Information</h3>
                </div>
                <div className="bg-white p-4 border-t border-gray-200">
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
                      <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none]">
                        <style jsx>{`
                          .dropdown-scrollbar::-webkit-scrollbar {
                            display: none;
                          }
                        `}</style>
                        <div className="dropdown-scrollbar">
                          {truckersLoading && (
                            <div className="p-3 text-center text-sm text-blue-500">Loading truckers...</div>
                          )}
                          {truckerList.length === 0 && !truckersLoading && (
                            <div className="p-3 text-center text-sm text-gray-500">No truckers found.</div>
                          )}
                          {truckerList.map((trucker) => (
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
              </div>

              {/* SECTION 2: Address Details - same as DeliveryOrder popup */}
              <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <div className="bg-green-100 px-4 py-3">
                  <h3 className="text-lg font-semibold text-green-800">Address Details</h3>
                </div>
                <div className="bg-white p-4 border-t border-gray-200">
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
              </div>

              {/* SECTION 3: Compliance & Documents - same as DeliveryOrder popup */}
              <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <div className="bg-purple-100 px-4 py-3">
                  <h3 className="text-lg font-semibold text-purple-800">Compliance & Documents</h3>
                </div>
                <div className="bg-white p-4 border-t border-gray-200">
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

      const API_URL = `${API_CONFIG.BASE_URL}/api/v1/driver/cmt/my-drivers?empId=${userData.empId}`;

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
      <div className="p-6 bg-white min-h-screen font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading drivers data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white min-h-screen font-sans flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md border border-gray-200">
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

  const getPaginationPages = () => {
    const total = totalPages;
    const current = currentPage;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [];
    if (current > 3) pages.push(1, 'ellipsis');
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push('ellipsis', total);
    return pages;
  };

  return (
    <div className="p-6 bg-white min-h-screen font-sans">
      {/* Top Section - same as DeliveryOrder */}
      <div className="flex flex-col gap-6 mb-6 border border-gray-200 rounded-xl p-6 bg-white">
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Left: Stats Cards - same as DeliveryOrder */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-gray-700 font-bold text-2xl shrink-0">
                {driversData.length}
              </div>
              <span className="text-gray-700 font-semibold">Total Drivers</span>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-gray-700 font-bold text-2xl shrink-0">
                {driversData.filter(d => d.isLoggedIn).length}
              </div>
              <span className="text-gray-700 font-semibold">Active Drivers</span>
            </div>
          </div>

          {/* Right: Add Driver Button - same as DeliveryOrder */}
          <div className="flex flex-col gap-1 w-full xl:w-[350px]">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-between gap-4 px-6 h-[45px] bg-blue-600 rounded-lg text-white font-semibold hover:bg-blue-700 transition w-full"
            >
              <span>Add Driver</span>
              <PlusCircle size={20} />
            </button>
          </div>
        </div>

        {/* Row 2: Search Bar - same as DeliveryOrder */}
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search by Driver ID, Name, Trucker, or Email"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-6 pr-12 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-colors text-gray-600 placeholder-gray-400"
          />
          <Search className="absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-400" size={24} />
        </div>
      </div>

      {/* Table - same as DeliveryOrder */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {currentDrivers.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {searchTerm ? 'No drivers found matching your search' : 'No drivers found'}
              </p>
              <p className="text-gray-400 text-sm">
                {searchTerm ? 'Try adjusting your search terms' : 'Add your first driver to get started'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-white border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">S.No</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Full Name</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Email</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Phone</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Trucker</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">License</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Status</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Action</th>
                </tr>
              </thead>
              <tbody>
                {currentDrivers.map((driver, index) => (
                  <tr key={driver.driverId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4 text-sm text-gray-600 font-medium">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-medium text-gray-800">{driver.fullName}</span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-700">{driver.email}</td>
                    <td className="py-4 px-4 text-sm text-gray-700">{driver.phone}</td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{driver.truckerInfo?.truckerName || 'N/A'}</p>
                        <p className="text-xs text-gray-500">MC: {driver.truckerInfo?.mcDot || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-700">{driver.driverLicense}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${driver.isLoggedIn ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {driver.isLoggedIn ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        type="button"
                        onClick={() => handleViewDetails(driver)}
                        className="px-4 py-1 rounded border border-green-500 text-green-500 text-sm font-medium hover:bg-green-50 transition-colors min-w-[70px]"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination - same as DeliveryOrder */}
      {totalPages > 1 && currentDrivers.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl border border-gray-200 p-4">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredDrivers.length)} of {filteredDrivers.length} drivers
          </div>
          <div className="flex gap-1 items-center">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <ChevronLeft size={18} />
              <span>Previous</span>
            </button>
            <div className="flex items-center gap-1 mx-4">
              {getPaginationPages().map((page, index) => {
                if (page === 'ellipsis') {
                  return <span key={`ellipsis-${index}`} className="px-2 text-gray-400">...</span>;
                }
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => handlePageChange(page)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${currentPage === page ? 'bg-white border border-black shadow-sm text-black' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <span>Next</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

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