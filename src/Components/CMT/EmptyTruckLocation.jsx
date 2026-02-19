import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import emptyTruckLocationService from '../../services/emptyTruckLocationService';
import API_CONFIG from '../../config/api.js';
import { MapPin, Truck, Filter, Search, Edit, Navigation, Calendar, User, Package, X, History, Plus } from 'lucide-react';

// Searchable Dropdown Component
const SearchableDropdown = ({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  loading = false,
  className = "",
  searchPlaceholder = "Search..."
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOptions(filtered);
    }
  }, [searchTerm, options]);

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedOption = options.find(option => option.value === value);
  const hasError = className.includes('border-red');

  return (
    <div className={`relative ${className}`} ref={dropdownRef} style={{ zIndex: isOpen ? 9999 : 'auto' }}>
      <div
        className={`w-full px-4 py-2.5 border rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent cursor-pointer ${hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'} ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400'
          }`}
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
            {loading ? 'Loading...' : selectedOption ? selectedOption.label : placeholder}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && !disabled && !loading && (
    <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-lg max-h-60 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                autoFocus
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={index}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                  onClick={() => handleSelect(option)}
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-gray-500 text-sm text-center">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Empty Truck Location Component for CMT Users (DO Design Style)
 */
const EmptyTruckLocation = () => {
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [truckers, setTruckers] = useState([]);
  const [loadingTruckers, setLoadingTruckers] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [searchVehicleNo, setSearchVehicleNo] = useState('');
  const [filters, setFilters] = useState({
    city: '',
    state: '',
    truckerId: ''
  });
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [updateForm, setUpdateForm] = useState({
    vehicleNo: '',
    truckerId: '',
    city: '',
    state: '',
    zipcode: '',
    address: '',
    latitude: '',
    longitude: '',
    formattedAddress: '',
    notes: '',
    status: 'empty'
  });
  const [addForm, setAddForm] = useState({
    vehicleNo: '',
    truckerId: '',
    city: '',
    state: '',
    zipcode: '',
    address: '',
    latitude: '',
    longitude: '',
    formattedAddress: '',
    notes: '',
    status: 'empty'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchAllTrucks();
    fetchTruckers();
  }, []);

  const fetchTruckers = async () => {
    setLoadingTruckers(true);
    try {
      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/truckers`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const truckerList = (response.data?.data || []).filter(x => x.userType === 'trucker' && x.status === 'approved');
      truckerList.sort((a, b) => (a.compName || '').localeCompare(b.compName || ''));
      setTruckers(truckerList);
    } catch (error) {
      toast.error('Failed to load truckers list');
    } finally {
      setLoadingTruckers(false);
    }
  };

  const fetchVehiclesByTrucker = async (truckerId) => {
    if (!truckerId) {
      setVehicles([]);
      return;
    }
    setLoadingVehicles(true);
    try {
      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/vehicle/cmt/trucker/${truckerId}/vehicles`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (response.data?.success) {
        const truckerVehicles = response.data.vehicles || response.data.data || [];
        setVehicles(truckerVehicles);
      } else {
        setVehicles([]);
      }
    } catch (error) {
      toast.error('Failed to load vehicles');
      setVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  };

  const fetchAllTrucks = async (overrideFilters) => {
    const appliedFilters = overrideFilters || filters;
    setLoading(true);
    try {
      const response = await emptyTruckLocationService.getAllTrucksCMT(appliedFilters);
      if (response.success) {
        setTrucks(response.data || []);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to fetch trucks');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchByVehicle = async () => {
    if (!searchVehicleNo.trim()) {
      toast.error('Please enter a vehicle number');
      return;
    }
    setLoading(true);
    try {
      const response = await emptyTruckLocationService.getTruckByVehicleNoCMT(searchVehicleNo.trim());
      if (response.success && response.data) {
        setTrucks([response.data]);
        setSearchVehicleNo('');
      } else {
        toast.info('No truck found with that vehicle number');
        setTrucks([]);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to search truck');
      setTrucks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      toast.info('Getting your location...');
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUpdateForm(prev => ({
            ...prev,
            latitude: lat.toString(),
            longitude: lng.toString()
          }));
          
          // Reverse geocoding to get formatted address
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            if (data.address) {
              const addrParts = [];
              if (data.address.road) addrParts.push(data.address.road);
              if (data.address.city || data.address.town || data.address.village) {
                addrParts.push(data.address.city || data.address.town || data.address.village);
              }
              if (data.address.state) addrParts.push(data.address.state);
              if (data.address.postcode) addrParts.push(data.address.postcode);
              
              const formatted = addrParts.join(', ');
              setUpdateForm(prev => ({
                ...prev,
                formattedAddress: formatted,
                city: data.address.city || data.address.town || data.address.village || prev.city,
                state: data.address.state || prev.state,
                zipcode: data.address.postcode || prev.zipcode,
                address: data.address.road || prev.address
              }));
            }
          } catch (err) {
            // Silently fail - user can enter manually
          }
          
          toast.success('Location captured successfully');
        },
        (error) => {
          toast.error('Failed to get location: ' + error.message);
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    fetchAllTrucks();
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      city: '',
      state: '',
      truckerId: ''
    };
    setFilters(clearedFilters);
    setSearchVehicleNo('');
    setCurrentPage(1);
    fetchAllTrucks(clearedFilters);
  };

  const handleViewHistory = (truck) => {
    setSelectedTruck(truck);
    setShowHistoryModal(true);
  };

  const handleAddClick = () => {
    setAddForm({
      vehicleNo: '',
      truckerId: '',
      city: '',
      state: '',
      zipcode: '',
      address: '',
      latitude: '',
      longitude: '',
      formattedAddress: '',
      notes: '',
      status: 'empty'
    });
    setVehicles([]);
    setShowAddModal(true);
  };

  const handleAddFormChange = (e) => {
    const { name, value } = e.target;
    setAddForm(prev => {
      const updated = { ...prev, [name]: value };
      // If truckerId changes, fetch vehicles for that trucker
      if (name === 'truckerId') {
        fetchVehiclesByTrucker(value);
        updated.vehicleNo = ''; // Reset vehicle number when trucker changes
      }
      return updated;
    });
  };

  const handleGetCurrentLocationForAdd = () => {
    if (navigator.geolocation) {
      toast.info('Getting your location...');
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setAddForm(prev => ({
            ...prev,
            latitude: lat.toString(),
            longitude: lng.toString()
          }));
          
          // Reverse geocoding to get formatted address
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            if (data.address) {
              const addrParts = [];
              if (data.address.road) addrParts.push(data.address.road);
              if (data.address.city || data.address.town || data.address.village) {
                addrParts.push(data.address.city || data.address.town || data.address.village);
              }
              if (data.address.state) addrParts.push(data.address.state);
              if (data.address.postcode) addrParts.push(data.address.postcode);
              
              const formatted = addrParts.join(', ');
              setAddForm(prev => ({
                ...prev,
                formattedAddress: formatted,
                city: data.address.city || data.address.town || data.address.village || prev.city,
                state: data.address.state || prev.state,
                zipcode: data.address.postcode || prev.zipcode,
                address: data.address.road || prev.address
              }));
            }
          } catch (err) {
            // Silently fail - user can enter manually
          }
          
          toast.success('Location captured successfully');
        },
        (error) => {
          toast.error('Failed to get location: ' + error.message);
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
    }
  };

  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    
    if (!addForm.vehicleNo || !addForm.truckerId || !addForm.city || !addForm.state) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await emptyTruckLocationService.updateLocationCMT(addForm);
      if (response.success) {
        toast.success('Empty truck location added successfully');
        setShowAddModal(false);
        setAddForm({
          vehicleNo: '',
          truckerId: '',
          city: '',
          state: '',
          zipcode: '',
          address: '',
          latitude: '',
          longitude: '',
          formattedAddress: '',
          notes: '',
          status: 'empty'
        });
        setVehicles([]);
        fetchAllTrucks();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to add truck location');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClick = (truck) => {
    setSelectedTruck(truck);
    setUpdateForm({
      vehicleNo: truck.vehicleNo || '',
      truckerId: truck.truckerId?._id || '',
      city: truck.location?.city || '',
      state: truck.location?.state || '',
      zipcode: truck.location?.zipcode || '',
      address: truck.location?.address || '',
      latitude: truck.location?.coordinates?.latitude || '',
      longitude: truck.location?.coordinates?.longitude || '',
      formattedAddress: truck.location?.formattedAddress || '',
      notes: truck.notes || '',
      status: truck.status || 'empty'
    });
    setShowUpdateModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setUpdateForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitUpdate = async (e) => {
    e.preventDefault();
    
    if (!updateForm.vehicleNo || !updateForm.truckerId || !updateForm.city || !updateForm.state) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await emptyTruckLocationService.updateLocationCMT(updateForm);
      if (response.success) {
        toast.success('Truck location updated successfully');
        setShowUpdateModal(false);
        fetchAllTrucks();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update truck location');
    } finally {
      setLoading(false);
    }
  };

  const filteredTrucks = trucks.filter((truck) => {
    const term = searchVehicleNo.trim().toLowerCase();
    if (!term) return true;
    const composite = `${truck.vehicleNo || ''} ${truck.vehicleId?.vehicleType || ''} ${truck.truckerId?.compName || ''} ${truck.location?.city || ''} ${truck.location?.state || ''} ${truck.status || ''}`.toLowerCase();
    return composite.includes(term);
  });

  const totalPages = Math.max(1, Math.ceil(filteredTrucks.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredTrucks.length);
  const currentTrucks = filteredTrucks.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const maxVisible = 7;
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [];
    const halfVisible = Math.floor(maxVisible / 2);

    if (currentPage <= halfVisible + 1) {
      for (let i = 1; i <= maxVisible - 1; i++) {
        pages.push(i);
      }
      pages.push(totalPages);
    } else if (currentPage >= totalPages - halfVisible) {
      pages.push(1);
      for (let i = totalPages - (maxVisible - 2); i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      for (let i = currentPage - halfVisible + 1; i <= currentPage + halfVisible - 1; i++) {
        pages.push(i);
      }
      pages.push(totalPages);
    }

    return pages;
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      empty: { bg: 'bg-[#DFF6DD]', text: 'text-[#107C10]', label: 'Empty' },
      assigned: { bg: 'bg-[#E1F5FE]', text: 'text-[#0277BD]', label: 'Assigned' },
      in_transit: { bg: 'bg-[#FFF9C4]', text: 'text-[#F57F17]', label: 'In Transit' },
      maintenance: { bg: 'bg-[#FFEBEE]', text: 'text-[#C62828]', label: 'Maintenance' }
    };
    const s = statusMap[status] || statusMap.empty;
    return (
      <span className={`px-4 py-2 rounded-full text-sm font-semibold ${s.bg} ${s.text}`}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="p-6">
     

      {/* Filters Section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6" style={{ overflow: 'visible' }}>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Total Trucks */}
          <div className="p-4 border border-gray-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-4 w-full">
              <div className="w-14 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl">
                {trucks.length}
              </div>
              <span className="text-gray-600 font-medium text-lg flex-1 text-center">Total Trucks</span>
            </div>
          </div>

          {/* Empty Trucks */}
          <div className="p-4 border border-gray-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-4 w-full">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600 font-bold text-2xl">
                {trucks.filter(truck => truck.status === 'empty').length}
              </div>
              <span className="text-gray-600 font-medium text-lg flex-1 text-center">Empty Trucks</span>
            </div>
          </div>
        </div>

        {/* Filter Header */}
        {/* <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Filter className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Search & Filter</h2>
              <p className="text-xs text-gray-500 mt-0.5">Find trucks by location, vehicle, or trucker</p>
            </div>
          </div>
        </div> */}

        {/* Filter Content */}
        <div className="pt-0 overflow-visible">
          {/* Vehicle search + Add Location */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            {/* Vehicle Number */}
            <div className="flex-1 min-w-[200px]">
              {/* <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Search className="inline w-4 h-4 mr-1.5 text-gray-500" />
                Vehicle Number
              </label> */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchVehicleNo}
                  onChange={(e) => setSearchVehicleNo(e.target.value)}
                  placeholder="Search Vehicle Number"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-base"
                />
              </div>
            </div>

            {/* Add Location Button */}
            <button
              onClick={handleAddClick}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors cursor-pointer"
            >
              <Plus size={18} strokeWidth={4} />
              <span>Add Location</span>
            </button>
          </div>

          
        </div>
      </div>

       <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6" style={{ overflow: 'visible' }}>
           {/* Remaining Filters + Actions */}
          <div className="flex flex-wrap items-end gap-4">
            {/* City */}
            <div className="flex-1 min-w-[180px]">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <MapPin className="inline w-4 h-4 mr-1.5 text-gray-500" />
                City
              </label>
              <input
                type="text"
                name="city"
                value={filters.city}
                onChange={handleFilterChange}
                placeholder="Enter city name"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-base"
              />
            </div>

            {/* State */}
            <div className="flex-1 min-w-[180px]">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <MapPin className="inline w-4 h-4 mr-1.5 text-gray-500" />
                State
              </label>
              <input
                type="text"
                name="state"
                value={filters.state}
                onChange={handleFilterChange}
                placeholder="Enter state name"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-base"
              />
            </div>

            {/* Trucker */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Truck className="inline w-4 h-4 mr-1.5 text-gray-500" />
                Trucker
              </label>
              <SearchableDropdown
                value={filters.truckerId}
                onChange={(value) => handleFilterChange({ target: { name: 'truckerId', value } })}
                options={[
                  { value: '', label: 'All Truckers' },
                  ...truckers.map((trucker) => ({
                    value: trucker._id,
                    label: trucker.compName || trucker.name || 'N/A'
                  }))
                ]}
                placeholder="Select Trucker"
                disabled={loadingTruckers}
                loading={loadingTruckers}
                searchPlaceholder="Search truckers..."
                className="w-full"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-2 px-4 py-3 text-gray-600 hover:text-red-600 hover:bg-red-50 border border-gray-200 rounded-xl transition-colors font-medium"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </button>
              <button
                onClick={handleApplyFilters}
                className="flex items-center gap-2 px-4 py-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 border border-gray-200 rounded-xl transition-colors font-medium"
              >
                <Search className="w-4 h-4" />
                Apply Filters
              </button>
            </div>
          </div>
          </div>
      

      {/* Data Table Section */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Loading trucks...</p>
          </div>
        ) : (
          <div className="overflow-x-auto p-4">
            <table className="min-w-full text-left border-separate border-spacing-y-4">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y first:border-l border-gray-200 rounded-l-lg align-middle">
                    S.No
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200 align-middle">
                    Vehicle No
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200 align-middle">
                    Vehicle Type
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200 align-middle">
                    Trucker
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200 align-middle">
                    Location
                  </th>
                  <th className="px-8 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200 text-center align-middle">
                    Status
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200 align-middle">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y last:border-r border-gray-200 rounded-r-lg text-center align-middle">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTrucks.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-4 py-12 text-center border-y first:border-l last:border-r border-gray-200 first:rounded-l-lg last:rounded-r-lg"
                    >
                      <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">
                        {searchVehicleNo || filters.city || filters.state || filters.truckerId
                          ? 'No trucks found matching your search'
                          : 'No trucks found'}
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        {searchVehicleNo || filters.city || filters.state || filters.truckerId
                          ? 'Try adjusting your filters'
                          : 'Create your first truck location to get started'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  currentTrucks.map((truck, index) => (
                    <tr key={truck._id} className="bg-white hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 border-y first:border-l border-gray-200 first:rounded-l-lg align-middle">
                        <span className="font-medium text-gray-700">{startIndex + index + 1}</span>
                      </td>
                      <td className="px-4 py-4 border-y border-gray-200 align-middle">
                        <span className="font-medium text-gray-700">{truck.vehicleNo}</span>
                      </td>
                      <td className="px-4 py-4 border-y border-gray-200 align-middle">
                        <span className="font-medium text-gray-700">
                          {truck.vehicleId?.vehicleType || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-4 border-y border-gray-200 align-middle">
                        <div>
                          <span className="font-medium text-gray-700">
                            {truck.truckerId?.compName || 'N/A'}
                          </span>
                          {truck.truckerId?.mc_dot_no && (
                            <p className="text-sm text-gray-500 mt-1">MC: {truck.truckerId.mc_dot_no}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 border-y border-gray-200 align-middle">
                        <div>
                          <span className="font-medium text-gray-700">
                            {truck.location?.city || 'N/A'}, {truck.location?.state || 'N/A'}
                          </span>
                          {truck.location?.address && (
                            <p className="text-sm text-gray-500 mt-1">{truck.location.address}</p>
                          )}
                          {truck.location?.zipcode && (
                            <p className="text-sm text-gray-500">ZIP: {truck.location.zipcode}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 border-y border-gray-200 text-center align-middle">
                        {getStatusBadge(truck.status)}
                      </td>
                      <td className="px-4 py-4 border-y border-gray-200 align-middle">
                        <div>
                          <span className="font-medium text-gray-700">
                            {new Date(truck.lastUpdatedAt).toLocaleDateString()}
                          </span>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(truck.lastUpdatedAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 border-y last:border-r border-gray-200 last:rounded-r-lg align-middle">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleViewHistory(truck)}
                            className="inline-flex items-center justify-center px-5 py-1.5 rounded-full text-sm font-medium border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors cursor-pointer"
                          >
                            History
                          </button>
                          <button
                            onClick={() => handleUpdateClick(truck)}
                            className="inline-flex items-center justify-center px-5 py-1.5 rounded-full text-sm font-medium border border-green-300 text-green-700 bg-green-50 hover:bg-green-600 hover:text-white hover:border-green-600 transition-colors cursor-pointer"
                          >
                            Update
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filteredTrucks.length > 0 && totalPages > 1 && (
        <div className="mt-4 flex justify-between items-center px-4 border border-gray-200 p-2 rounded-xl bg-white">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {endIndex} of {filteredTrucks.length} trucks
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-base font-medium text-gray-600 hover:text-gray-900"
            >
              Previous
            </button>
            <div className="flex gap-1">
              {getPageNumbers().map((page, idx, arr) => {
                const showEllipsisBefore = idx > 0 && page - arr[idx - 1] > 1;
                return (
                  <React.Fragment key={page}>
                    {showEllipsisBefore && (
                      <span className="px-2 text-gray-400">...</span>
                    )}
                    <button
                      onClick={() => handlePageChange(page)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                        currentPage === page
                          ? 'border border-gray-900 text-gray-900 bg-white'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-base font-medium text-gray-600 hover:text-gray-900"
            >
              Next
            </button>
          </div>
        </div>
      )}
      {/* Update Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[95vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Edit className="text-white" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Update Truck Location</h3>
                    <p className="text-blue-100 text-sm">Update the existing truck location</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmitUpdate} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vehicle Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="vehicleNo"
                    value={updateForm.vehicleNo}
                    onChange={handleFormChange}
                    required
                    placeholder="e.g., MH12AB1234"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Trucker Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trucker <span className="text-red-500">*</span>
                  </label>
                  <SearchableDropdown
                    value={updateForm.truckerId}
                    onChange={(value) => handleFormChange({ target: { name: 'truckerId', value } })}
                    options={truckers.map((trucker) => ({
                      value: trucker._id,
                      label: trucker.compName || trucker.name || 'N/A'
                    }))}
                    placeholder="Select Trucker"
                    disabled={loadingTruckers}
                    loading={loadingTruckers}
                    searchPlaceholder="Search truckers..."
                    className="w-full"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={updateForm.city}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* State */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={updateForm.state}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Zipcode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zipcode</label>
                  <input
                    type="text"
                    name="zipcode"
                    value={updateForm.zipcode}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={updateForm.address}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Formatted Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Formatted Address</label>
                  <input
                    type="text"
                    name="formattedAddress"
                    value={updateForm.formattedAddress}
                    onChange={handleFormChange}
                    placeholder="Full formatted address (auto-filled from GPS)"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* GPS Coordinates */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">GPS Coordinates</label>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="number"
                      step="any"
                      name="latitude"
                      value={updateForm.latitude}
                      onChange={handleFormChange}
                      placeholder="Latitude"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="number"
                      step="any"
                      name="longitude"
                      value={updateForm.longitude}
                      onChange={handleFormChange}
                      placeholder="Longitude"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={updateForm.notes}
                    onChange={handleFormChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="px-6 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Updating...' : 'Update Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[95vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Plus className="text-white" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Add Empty Truck Location</h3>
                    <p className="text-blue-100 text-sm">Create a new truck location entry</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setAddForm({
                      vehicleNo: '',
                      truckerId: '',
                      city: '',
                      state: '',
                      zipcode: '',
                      address: '',
                      latitude: '',
                      longitude: '',
                      formattedAddress: '',
                      notes: '',
                      status: 'empty'
                    });
                    setVehicles([]);
                  }}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmitAdd} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Trucker Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trucker <span className="text-red-500">*</span>
                  </label>
                  <SearchableDropdown
                    value={addForm.truckerId}
                    onChange={(value) => handleAddFormChange({ target: { name: 'truckerId', value } })}
                    options={truckers.map((trucker) => ({
                      value: trucker._id,
                      label: trucker.compName || trucker.name || 'N/A'
                    }))}
                    placeholder="Select Trucker"
                    disabled={loadingTruckers}
                    loading={loadingTruckers}
                    searchPlaceholder="Search truckers..."
                    className="w-full"
                  />
                </div>

                {/* Vehicle Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Number <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="vehicleNo"
                    value={addForm.vehicleNo}
                    onChange={handleAddFormChange}
                    required
                    disabled={!addForm.truckerId || loadingVehicles}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="">{addForm.truckerId ? (loadingVehicles ? 'Loading vehicles...' : 'Select Vehicle') : 'Select Trucker First'}</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle._id} value={vehicle.vehicleNo}>
                        {vehicle.vehicleNo} - {vehicle.vehicleType || 'N/A'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={addForm.city}
                    onChange={handleAddFormChange}
                    required
                    placeholder="e.g., Mumbai"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* State */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={addForm.state}
                    onChange={handleAddFormChange}
                    required
                    placeholder="e.g., Maharashtra"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Zipcode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zipcode</label>
                  <input
                    type="text"
                    name="zipcode"
                    value={addForm.zipcode}
                    onChange={handleAddFormChange}
                    placeholder="e.g., 400001"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={addForm.address}
                    onChange={handleAddFormChange}
                    placeholder="e.g., Near XYZ Warehouse, Andheri"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Formatted Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Formatted Address</label>
                  <input
                    type="text"
                    name="formattedAddress"
                    value={addForm.formattedAddress}
                    onChange={handleAddFormChange}
                    placeholder="Full formatted address (auto-filled from GPS)"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* GPS Coordinates */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">GPS Coordinates</label>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="number"
                      step="any"
                      name="latitude"
                      value={addForm.latitude}
                      onChange={handleAddFormChange}
                      placeholder="Latitude"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="number"
                      step="any"
                      name="longitude"
                      value={addForm.longitude}
                      onChange={handleAddFormChange}
                      placeholder="Longitude"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={addForm.notes}
                    onChange={handleAddFormChange}
                    rows="3"
                    placeholder="e.g., Available for immediate pickup"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setAddForm({
                      vehicleNo: '',
                      truckerId: '',
                      city: '',
                      state: '',
                      zipcode: '',
                      address: '',
                      latitude: '',
                      longitude: '',
                      formattedAddress: '',
                      notes: '',
                      status: 'empty'
                    });
                    setVehicles([]);
                  }}
                  className="px-6 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Adding...' : 'Add Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedTruck && (
        <div className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <History className="text-white" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Update History</h3>
                    <p className="text-blue-100 text-sm">Location history for {selectedTruck.vehicleNo}</p>
                  </div>
                </div>
                <button onClick={() => setShowHistoryModal(false)} className="text-white hover:text-gray-200 text-2xl font-bold">
                  ×
                </button>
              </div>
            </div>
            
            {/* Form Body with Scroll */}
            <div className="p-6 overflow-y-auto">
              <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
              `}</style>
              <div className="space-y-6">
                {/* SECTION 1: Current Location */}
                <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="text-blue-500" size={20} />
                    <h4 className="text-lg font-bold text-blue-700">Current Location</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">City</label>
                      <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800">
                        {selectedTruck.location?.city || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">State</label>
                      <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800">
                        {selectedTruck.location?.state || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">ZIP Code</label>
                      <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800">
                        {selectedTruck.location?.zipcode || 'N/A'}
                      </div>
                    </div>
                  </div>
                  {selectedTruck.location?.address && (
                    <div className="mt-4">
                      <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Address</label>
                      <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800">
                        {selectedTruck.location.address}
                      </div>
                    </div>
                  )}
                  {selectedTruck.location?.formattedAddress && (
                    <div className="mt-4">
                      <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Formatted Address</label>
                      <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800">
                        {selectedTruck.location.formattedAddress}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Status</label>
                      <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800">
                        {getStatusBadge(selectedTruck.status)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Last Updated</label>
                      <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800">
                        {new Date(selectedTruck.lastUpdatedAt).toLocaleString()}
                      </div>
                    </div>
                    {selectedTruck.updatedBy && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Updated By</label>
                        <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800">
                          {selectedTruck.updatedBy.userName} ({selectedTruck.updatedBy.userType})
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION 2: Update History */}
                {selectedTruck.updateHistory && selectedTruck.updateHistory.length > 0 ? (
                  <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                      <History className="text-green-500" size={20} />
                      <h4 className="text-lg font-bold text-green-700">
                        Previous Locations ({selectedTruck.updateHistory.length})
                      </h4>
                    </div>
                    <div className="space-y-4">
                      {selectedTruck.updateHistory.map((history, index) => (
                        <div key={index} className="bg-white p-4 rounded-lg border border-green-200">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">City</label>
                              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800">
                                {history.location?.city || 'N/A'}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">State</label>
                              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800">
                                {history.location?.state || 'N/A'}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">ZIP Code</label>
                              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800">
                                {history.location?.zipcode || 'N/A'}
                              </div>
                            </div>
                          </div>
                          {history.location?.address && (
                            <div className="mt-4">
                              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Address</label>
                              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800">
                                {history.location.address}
                              </div>
                            </div>
                          )}
                          {history.notes && (
                            <div className="mt-4">
                              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Notes</label>
                              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800">
                                {history.notes}
                              </div>
                            </div>
                          )}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-4">
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Status</label>
                              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800">
                                {getStatusBadge(history.status)}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Updated</label>
                              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800">
                                {new Date(history.updatedAt).toLocaleString()}
                              </div>
                            </div>
                            {history.updatedBy && (
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Updated By</label>
                                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800">
                                  {history.updatedBy.userName} ({history.updatedBy.userType})
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-center py-8">
                    <p className="text-gray-500 font-medium">No update history available</p>
                  </div>
                )}
                
                {/* Close Button */}
                <div className="pt-6 border-t border-gray-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowHistoryModal(false)}
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmptyTruckLocation;
