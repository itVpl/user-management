import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import emptyTruckLocationService from '../../services/emptyTruckLocationService';
import { MapPin, Truck, Plus, Edit2, Navigation, Calendar, X, Filter, Search } from 'lucide-react';

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
 * Trucker Empty Location Component (DO Design Style)
 */
const TruckerEmptyLocation = () => {
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchVehicleNo, setSearchVehicleNo] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    city: '',
    state: ''
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [locationForm, setLocationForm] = useState({
    vehicleNo: '',
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
    fetchMyTrucks();
  }, []);

  const fetchMyTrucks = async () => {
    setLoading(true);
    try {
      const response = await emptyTruckLocationService.getMyTrucks(filters);
      if (response.success) {
        setTrucks(response.data || []);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to fetch trucks');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = () => {
    fetchMyTrucks();
  };

  const handleClearFilters = () => {
    setFilters({
      status: '',
      city: '',
      state: ''
    });
    setSearchVehicleNo('');
    fetchMyTrucks();
  };

  const handleSearchByVehicle = async () => {
    if (!searchVehicleNo.trim()) {
      toast.error('Please enter a vehicle number');
      return;
    }
    setLoading(true);
    try {
      const response = await emptyTruckLocationService.getTruckByVehicleNo(searchVehicleNo.trim());
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

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setLocationForm(prev => ({ ...prev, [name]: value }));
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      toast.info('Getting your location...');
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocationForm(prev => ({
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
              setLocationForm(prev => ({
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!locationForm.vehicleNo || !locationForm.city || !locationForm.state) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await emptyTruckLocationService.updateLocation(locationForm);
      if (response.success) {
        toast.success('Truck location updated successfully');
        setShowAddModal(false);
        setLocationForm({
          vehicleNo: '',
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
        fetchMyTrucks();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update truck location');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTruck = (truck) => {
    setLocationForm({
      vehicleNo: truck.vehicleNo || '',
      city: truck.location?.city || '',
      state: truck.location?.state || '',
      zipcode: truck.location?.zipcode || '',
      address: truck.location?.address || '',
      latitude: truck.location?.coordinates?.latitude?.toString() || '',
      longitude: truck.location?.coordinates?.longitude?.toString() || '',
      formattedAddress: truck.location?.formattedAddress || '',
      notes: truck.notes || '',
      status: truck.status || 'empty'
    });
    setShowAddModal(true);
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
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-green-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header with DO Design */}
        <div className={SOFT.header + " mb-6"}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Truck className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">My Empty Trucks</h1>
                <p className="text-blue-100 text-sm">Manage your empty truck locations</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className={`${MS.primaryBtn} px-4 py-2 rounded-lg flex items-center gap-2`}
            >
              <Plus className="w-5 h-5" />
              Update Location
            </button>
          </div>
        </div>

        {/* Search by Vehicle Number */}
        <div className={SOFT.cardButter + " mb-4"}>
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-orange-600" />
            <input
              type="text"
              value={searchVehicleNo}
              onChange={(e) => setSearchVehicleNo(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchByVehicle()}
              placeholder="Search by Vehicle Number (e.g., MH12AB1234)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={handleSearchByVehicle}
              disabled={loading || !searchVehicleNo.trim()}
              className={`${MS.primaryBtn} px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50`}
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </div>
        </div>

        {/* Filters Card */}
        <div className={SOFT.cardBlue + " mb-6"}>
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="empty">Empty</option>
                <option value="assigned">Assigned</option>
                <option value="in_transit">In Transit</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                name="city"
                value={filters.city}
                onChange={handleFilterChange}
                placeholder="Enter city"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                name="state"
                value={filters.state}
                onChange={handleFilterChange}
                placeholder="Enter state"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={handleApplyFilters}
                className={`${MS.primaryBtn} flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2`}
              >
                <Search className="w-4 h-4" />
                Apply
              </button>
              <button
                onClick={handleClearFilters}
                className={`${MS.subtleBtn} px-4 py-2 rounded-lg`}
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Trucks Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Loading trucks...</p>
          </div>
        ) : trucks.length === 0 ? (
          <div className={SOFT.cardBlue + " text-center py-12"}>
            <Truck className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">No truck locations found</p>
            <button
              onClick={() => setShowAddModal(true)}
              className={`${MS.primaryBtn} px-6 py-3 rounded-lg`}
            >
              Add First Location
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trucks.map((truck) => (
              <div key={truck._id} className={SOFT.cardMint}>
                {/* Vehicle Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Truck className="w-6 h-6 text-green-600" />
                    <div>
                      <h3 className="font-bold text-gray-800">{truck.vehicleNo}</h3>
                      <p className="text-xs text-gray-500">{truck.vehicleId?.vehicleType || 'N/A'}</p>
                    </div>
                  </div>
                  {getStatusBadge(truck.status)}
                </div>

                {/* Location Info */}
                <div className={SOFT.insetWhite + " mb-3"}>
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-700">Location</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800">
                    {truck.location?.city}, {truck.location?.state}
                  </p>
                  {truck.location?.address && (
                    <p className="text-xs text-gray-500 mt-1">{truck.location.address}</p>
                  )}
                  {truck.location?.zipcode && (
                    <p className="text-xs text-gray-500">ZIP: {truck.location.zipcode}</p>
                  )}
                  {truck.location?.coordinates?.latitude && (
                    <p className="text-xs text-gray-400 mt-1">
                      GPS: {truck.location.coordinates.latitude.toFixed(4)}, {truck.location.coordinates.longitude.toFixed(4)}
                    </p>
                  )}
                </div>

                {/* Notes */}
                {truck.notes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-3">
                    <p className="text-xs text-gray-700">{truck.notes}</p>
                  </div>
                )}

                {/* Last Updated */}
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                  <Calendar className="w-3 h-3" />
                  <span>Updated: {new Date(truck.lastUpdatedAt).toLocaleString()}</span>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleEditTruck(truck)}
                  className={`${MS.primaryBtn} w-full px-3 py-2 rounded-lg flex items-center justify-center gap-2`}
                >
                  <Edit2 className="w-4 h-4" />
                  Update Location
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Update Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className={SOFT.header}>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Update Truck Location</h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setLocationForm({
                      vehicleNo: '',
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
                  }}
                  className="text-white hover:bg-white/20 rounded-lg p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vehicle Number */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="vehicleNo"
                    value={locationForm.vehicleNo}
                    onChange={handleFormChange}
                    required
                    placeholder="e.g., MH12AB1234"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    value={locationForm.city}
                    onChange={handleFormChange}
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
                    value={locationForm.state}
                    onChange={handleFormChange}
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
                    value={locationForm.zipcode}
                    onChange={handleFormChange}
                    placeholder="e.g., 400001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={locationForm.status}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="empty">Empty</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_transit">In Transit</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={locationForm.address}
                    onChange={handleFormChange}
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
                    value={locationForm.formattedAddress}
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
                      value={locationForm.latitude}
                      onChange={handleFormChange}
                      placeholder="Latitude"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      step="any"
                      name="longitude"
                      value={locationForm.longitude}
                      onChange={handleFormChange}
                      placeholder="Longitude"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    className={`${MS.subtleBtn} mt-2 px-3 py-2 rounded-lg flex items-center gap-2`}
                  >
                    <Navigation className="w-4 h-4" />
                    Use Current Location
                  </button>
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={locationForm.notes}
                    onChange={handleFormChange}
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
                    setLocationForm({
                      vehicleNo: '',
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
                  {loading ? 'Updating...' : 'Update Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TruckerEmptyLocation;
