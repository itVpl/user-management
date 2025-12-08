import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import emptyTruckLocationService from '../../services/emptyTruckLocationService';
import API_CONFIG from '../../config/api.js';
import { MapPin, Truck, Filter, Search, Edit, Navigation, Calendar, User, Package, X, History, Plus } from 'lucide-react';

/* ====================== Soft Theme (DO Design) ====================== */
const SOFT = {
  header: 'rounded-2xl bg-gradient-to-r from-[#6D5DF6] via-[#7A5AF8] to-[#19C3FB] text-white px-5 py-4 shadow',
  cardMint: 'p-4 rounded-2xl border bg-[#F3FBF6] border-[#B9E6C9]',
  cardPink: 'p-4 rounded-2xl border bg-[#FFF3F7] border-[#F7CADA]',
  cardBlue: 'p-4 rounded-2xl border bg-[#EEF4FF] border-[#C9D5FF]',
  cardButter: 'p-4 rounded-2xl border bg-[#FFF7E6] border-[#FFE2AD]',
  insetWhite: 'p-3 rounded-xl border bg-white',
};

const MS = {
  primaryBtn: 'bg-[#0078D4] hover:bg-[#106EBE] focus:ring-2 focus:ring-[#9CCCF5] text-white',
  subtleBtn: 'bg-white border border-[#D6D6D6] hover:bg-[#F5F5F5]',
  successPill: 'bg-[#DFF6DD] text-[#107C10]',
  neutralPill: 'bg-[#F3F2F1] text-[#323130]',
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

  const fetchAllTrucks = async () => {
    setLoading(true);
    try {
      const response = await emptyTruckLocationService.getAllTrucksCMT(filters);
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
    if (searchVehicleNo.trim()) {
      handleSearchByVehicle();
    } else {
      fetchAllTrucks();
    }
  };

  const handleClearFilters = () => {
    setFilters({
      city: '',
      state: '',
      truckerId: ''
    });
    setSearchVehicleNo('');
    fetchAllTrucks();
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
    <div className="p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-[95%] mx-auto">
        {/* Header with DO Design */}
        <div className={SOFT.header + " mb-6"}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Truck className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Empty Truck Locations</h1>
                <p className="text-blue-100 text-sm">Track and manage empty truck locations</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards and Add Button */}
        <div className="flex items-center gap-6 mb-6">
          {/* Total Trucks Card */}
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Total Trucks</p>
                <p className="text-xl font-bold text-gray-900">{trucks.length}</p>
              </div>
            </div>
          </div>

          {/* Empty Trucks Card */}
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Empty Trucks</p>
                <p className="text-xl font-bold text-green-600">
                  {trucks.filter(truck => truck.status === 'empty').length}
                </p>
              </div>
            </div>
          </div>

          {/* Add Location Button */}
          <button
            onClick={handleAddClick}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
            </svg>
            <span>Add Location</span>
          </button>
        </div>

        {/* Filters Card */}
        <div className={SOFT.cardBlue + " mb-6 p-6"}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Filter className="w-6 h-6 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-800">Filters:</h2>
            </div>
            
            <div className="flex items-center gap-4 flex-1">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Number</label>
                <input
                  type="text"
                  value={searchVehicleNo}
                  onChange={(e) => setSearchVehicleNo(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchByVehicle()}
                  placeholder="e.g., MH12AB1234"
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  name="city"
                  value={filters.city}
                  onChange={handleFilterChange}
                  placeholder="Enter city"
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                <input
                  type="text"
                  name="state"
                  value={filters.state}
                  onChange={handleFilterChange}
                  placeholder="Enter state"
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex-1 min-w-[180px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">Trucker</label>
                <select
                  name="truckerId"
                  value={filters.truckerId}
                  onChange={handleFilterChange}
                  disabled={loadingTruckers}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">All Truckers</option>
                  {truckers.map((trucker) => (
                    <option key={trucker._id} value={trucker._id}>
                      {trucker.compName || trucker.name || 'N/A'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end gap-3">
                <button
                  onClick={handleApplyFilters}
                  className={`${MS.primaryBtn} px-6 py-3 text-base rounded-lg flex items-center justify-center gap-2 font-semibold`}
                  style={{ height: '52px' }}
                >
                  <Search className="w-5 h-5" />
                  Apply
                </button>
                <button
                  onClick={handleClearFilters}
                  className={`${MS.subtleBtn} px-6 py-3 text-base rounded-lg font-semibold`}
                  style={{ height: '52px' }}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table Section */}
        <div className="overflow-x-auto bg-white rounded-2xl shadow-xl border border-gray-100">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">Loading trucks...</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-200">
                <tr>
                  <th className="text-left py-3 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">S.NO</th>
                  <th className="text-left py-3 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">VEHICLE NO</th>
                  <th className="text-left py-3 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">VEHICLE TYPE</th>
                  <th className="text-left py-3 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">TRUCKER</th>
                  <th className="text-left py-3 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">LOCATION</th>
                  <th className="text-center py-3 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">STATUS</th>
                  <th className="text-left py-3 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">LAST UPDATED</th>
                  <th className="text-center py-3 px-6 text-gray-800 font-bold text-sm uppercase tracking-wide">ACTION</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {trucks.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <Truck className="w-12 h-12 text-gray-400 mb-3" />
                        <p className="text-lg font-medium text-gray-600">No trucks found</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {searchVehicleNo || filters.city || filters.state || filters.truckerId
                            ? 'Try adjusting your filters'
                            : 'Get started by adding your first truck location'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  trucks.map((truck, index) => (
                    <tr key={truck._id} className="transition duration-100 border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-3 py-4 whitespace-nowrap text-base font-medium text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Truck className="w-6 h-6 text-green-600" />
                          <div>
                            <p className="text-base font-semibold text-gray-900">{truck.vehicleNo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-base font-semibold text-gray-700">
                        {truck.vehicleId?.vehicleType || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-base font-semibold text-gray-700">{truck.truckerId?.compName || 'N/A'}</p>
                          {truck.truckerId?.mc_dot_no && (
                            <p className="text-sm text-gray-500 mt-1">MC: {truck.truckerId.mc_dot_no}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-base font-semibold text-gray-700">
                            {truck.location?.city || 'N/A'}, {truck.location?.state || 'N/A'}
                          </p>
                          {truck.location?.address && (
                            <p className="text-sm text-gray-500 mt-1">{truck.location.address}</p>
                          )}
                          {truck.location?.zipcode && (
                            <p className="text-sm text-gray-500">ZIP: {truck.location.zipcode}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle text-center">
                        <div className="flex items-center justify-center">
                          {getStatusBadge(truck.status)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-base">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold text-gray-700">{new Date(truck.lastUpdatedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1 ml-6">
                          {new Date(truck.lastUpdatedAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewHistory(truck)}
                            className="flex items-center gap-1 bg-transparent text-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-500/30 transition border border-blue-200"
                          >
                            <History className="w-3.5 h-3.5" />
                            History
                          </button>
                          <button
                            onClick={() => handleUpdateClick(truck)}
                            className="flex items-center gap-1 bg-transparent text-green-600 px-3 py-1 rounded text-sm hover:bg-green-500/30 transition border border-green-200"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Update
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Update Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className={SOFT.header}>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Update Truck Location</h3>
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-1"
                >
                  <X className="w-6 h-6" />
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Trucker Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trucker <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="truckerId"
                    value={updateForm.truckerId}
                    onChange={handleFormChange}
                    required
                    disabled={loadingTruckers}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">Select Trucker</option>
                    {truckers.map((trucker) => (
                      <option key={trucker._id} value={trucker._id}>
                        {trucker.compName || trucker.name || 'N/A'}
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
                    value={updateForm.city}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      step="any"
                      name="longitude"
                      value={updateForm.longitude}
                      onChange={handleFormChange}
                      placeholder="Longitude"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className={`${MS.subtleBtn} px-6 py-2 rounded-lg`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`${MS.primaryBtn} px-6 py-2 rounded-lg disabled:opacity-50`}
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className={SOFT.header}>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Add Empty Truck Location</h3>
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
                  className="text-white hover:bg-white/20 rounded-lg p-1"
                >
                  <X className="w-6 h-6" />
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
                  <select
                    name="truckerId"
                    value={addForm.truckerId}
                    onChange={handleAddFormChange}
                    required
                    disabled={loadingTruckers}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">Select Trucker</option>
                    {truckers.map((trucker) => (
                      <option key={trucker._id} value={trucker._id}>
                        {trucker.compName || trucker.name || 'N/A'}
                      </option>
                    ))}
                  </select>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      step="any"
                      name="longitude"
                      value={addForm.longitude}
                      onChange={handleAddFormChange}
                      placeholder="Longitude"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className={`${MS.subtleBtn} px-6 py-2 rounded-lg`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`${MS.primaryBtn} px-6 py-2 rounded-lg disabled:opacity-50`}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md transition-opacity" onClick={() => setShowHistoryModal(false)} />
          <div 
            className="relative w-full max-w-6xl max-h-[95vh] bg-white rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden flex flex-col transform transition-all duration-300 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 flex justify-between items-center text-white shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Update History</h3>
                  <p className="text-sm text-blue-100 mt-1">Location history for {selectedTruck.vehicleNo}</p>
                </div>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-xl transition-all duration-200">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Form Body with Scroll */}
            <div className="p-6 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch]">
              <style jsx>{`
                .hide-scrollbar::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              <div className="hide-scrollbar space-y-6">
                {/* SECTION 1: Current Location - Blue Background */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="text-lg font-bold text-white border-b border-white pb-2 mb-4 -mt-4 bg-blue-600 px-3 py-2 rounded-t-lg -mx-4 mb-4">Current Location</h4>
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

                {/* SECTION 2: Update History - Green Background */}
                {selectedTruck.updateHistory && selectedTruck.updateHistory.length > 0 ? (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h4 className="text-lg font-bold text-white border-b border-white pb-2 mb-4 -mt-4 bg-green-600 px-3 py-2 rounded-t-lg -mx-4 mb-4">
                      Previous Locations ({selectedTruck.updateHistory.length})
                    </h4>
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
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-center py-8">
                    <p className="text-gray-500 font-medium">No update history available</p>
                  </div>
                )}
                
                {/* Close Button */}
                <div className="pt-6 border-t border-gray-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowHistoryModal(false)}
                    className="px-5 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition duration-150 shadow-sm"
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
