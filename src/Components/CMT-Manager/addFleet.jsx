import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaTruck, FaBox, FaCalendar, FaClock, FaUser, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaSearch, FaEdit, FaEye, FaUserCheck, FaPlus, FaCar } from 'react-icons/fa';
import API_CONFIG from '../../config/api.js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const getAuthToken = () =>
    localStorage.getItem('authToken') ||
    sessionStorage.getItem('authToken') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('token');

export default function AddFleet() {
    const [fleets, setFleets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedFleet, setSelectedFleet] = useState(null);
    const [viewLoading, setViewLoading] = useState(false);
    const [assignModal, setAssignModal] = useState({ visible: false, fleet: null });
     const [cmtUsers, setCmtUsers] = useState([]);
     const [selectedCmtUser, setSelectedCmtUser] = useState('');
     const [assignDescription, setAssignDescription] = useState('');
     const [assignSubmitting, setAssignSubmitting] = useState(false);
     const [cmtUserSearch, setCmtUserSearch] = useState('');
     const [isCmtDropdownOpen, setIsCmtDropdownOpen] = useState(false);
     const [showAddModal, setShowAddModal] = useState(false);
     const [truckers, setTruckers] = useState([]);
     const [truckerSearch, setTruckerSearch] = useState('');
     const [isTruckerDropdownOpen, setIsTruckerDropdownOpen] = useState(false);
     const [selectedTruckerName, setSelectedTruckerName] = useState('');
     const [newFleet, setNewFleet] = useState({
         truckerId: '',
         vehicleNo: '',
         chassisNo: '',
         engineNo: '',
         modelYear: '',
         vehicleType: '',
         make: '',
         model: '',
         fuelType: ''
     });

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9;

    // Fetch fleets from API
    const fetchFleets = async () => {
        try {
            setLoading(true);

            // Get authentication token
            const token = getAuthToken();

            if (!token) {
                toast.error('Authentication required. Please login again.');
                return;
            }

            // Fetch data from the API endpoint for fleet management
            const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/vehicle/cmt/all-vehicles`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('API Response:', response);
            console.log('Response Data:', response.data);

             // Check if response has data property
             if (response.data && response.data.success) {
                 const vehiclesData = response.data.vehicles || [];
                 console.log('Vehicles Data:', vehiclesData);

                 if (Array.isArray(vehiclesData)) {
                     const transformedData = vehiclesData.map((vehicle, index) => {
                         return {
                             id: vehicle._id || index,
                             sNo: index + 1,
                             vehicleId: vehicle._id,
                             vehicleNo: vehicle.vehicleNo || 'N/A',
                             chassisNo: vehicle.chassisNo || 'N/A',
                             engineNo: vehicle.engineNo || 'N/A',
                             modelYear: vehicle.modelYear || 'N/A',
                             vehicleType: vehicle.vehicleType || 'N/A',
                             make: vehicle.make || 'N/A',
                             model: vehicle.model || 'N/A',
                             capacity: vehicle.capacity || 0,
                             fuelType: vehicle.fuelType || 'N/A',
                             truckerId: vehicle.truckerId?.compName || vehicle.truckerId || 'N/A',
                             status: vehicle.status || 'N/A',
                             createdAt: vehicle.createdAt || new Date().toISOString().split('T')[0],
                             updatedAt: vehicle.updatedAt,
                             // CMT Assignment details
                             assignedTo: vehicle.assignedTo,
                             cmtAssignment: vehicle.cmtAssignment || null,
                             addedBy: vehicle.addedBy || {},
                             approvalStatus: vehicle.approvalStatus || 'N/A',
                             cmtApprovals: vehicle.cmtApprovals || [],
                             isActive: vehicle.isActive || true
                         };
                     });

                     console.log('Transformed Data:', transformedData);
                     setFleets(transformedData);
                 } else {
                     console.log('Vehicles data is not an array:', vehiclesData);
                     toast.error('API returned data is not in expected format');
                 }
             } else {
                 console.log('Unexpected response structure:', response.data);
                 toast.error('Unexpected response structure from API');
             }
        } catch (error) {
            console.error('Error fetching fleets:', error);
            console.error('Error response:', error.response);
            console.error('Error message:', error.message);

            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
                toast.error(`Error: ${error.response.data?.message || `HTTP ${error.response.status}`}`);
            } else if (error.request) {
                console.error('Request error:', error.request);
                toast.error('Network error. Please check your connection.');
            } else {
                console.error('Other error:', error.message);
                toast.error(`Error: ${error.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

     // Fetch CMT users from API
     const fetchCmtUsers = async () => {
         try {
             const token = getAuthToken();
             if (!token) {
                 toast.error('Please login to access this resource');
                 return;
             }
             const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
             const res = await axios.get(
                 `${API_CONFIG.BASE_URL}/api/v1/inhouseUser/department/CMT`,
                 { headers }
             );
             setCmtUsers(res.data?.employees || []);
         } catch (error) {
             console.error('Error fetching CMT users:', error);
             if (error.response?.data?.message) toast.error(error.response.data.message);
             else toast.error('Failed to fetch CMT users data');
         }
     };

     // Fetch Truckers from API
     const fetchTruckers = async () => {
         try {
             const token = getAuthToken();
             if (!token) {
                 toast.error('Please login to access this resource');
                 return;
             }
             const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
             const res = await axios.get(
                 `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/truckers`,
                 { headers }
             );
             setTruckers(res.data?.data || []);
         } catch (error) {
             console.error('Error fetching truckers:', error);
             if (error.response?.data?.message) toast.error(error.response.data.message);
             else toast.error('Failed to fetch truckers data');
         }
     };

    useEffect(() => {
        fetchFleets();
        fetchCmtUsers();
        fetchTruckers();
    }, []);

     // Close CMT dropdown when clicking outside
     useEffect(() => {
         const handleClickOutside = (event) => {
             if (isCmtDropdownOpen && !event.target.closest('.cmt-dropdown-container')) {
                 setIsCmtDropdownOpen(false);
             }
             if (isTruckerDropdownOpen && !event.target.closest('.trucker-dropdown-container')) {
                 setIsTruckerDropdownOpen(false);
             }
         };

         document.addEventListener('mousedown', handleClickOutside);
         return () => {
             document.removeEventListener('mousedown', handleClickOutside);
         };
     }, [isCmtDropdownOpen, isTruckerDropdownOpen]);

    // Filter CMT users based on search
    const filteredCmtUsers = React.useMemo(() => {
        if (!cmtUserSearch.trim()) return cmtUsers.filter(user => user.status === 'active');
        return cmtUsers.filter(user =>
            user.status === 'active' && (
                user.employeeName?.toLowerCase().includes(cmtUserSearch.toLowerCase()) ||
                user.empId?.toLowerCase().includes(cmtUserSearch.toLowerCase()) ||
                user.designation?.toLowerCase().includes(cmtUserSearch.toLowerCase()) ||
                user.email?.toLowerCase().includes(cmtUserSearch.toLowerCase())
            )
        );
    }, [cmtUsers, cmtUserSearch]);

     // Get selected CMT user name for display
     const selectedCmtUserName = React.useMemo(() => {
         const user = cmtUsers.find(u => u._id === selectedCmtUser);
         return user ? `${user.employeeName} (${user.empId}) - ${user.designation}` : '';
     }, [cmtUsers, selectedCmtUser]);

     // Filter truckers based on search
     const filteredTruckers = React.useMemo(() => {
         if (!truckerSearch.trim()) return truckers.filter(trucker => trucker.status === 'approved');
         return truckers.filter(trucker => 
             trucker.status === 'approved' && (
                 trucker.compName?.toLowerCase().includes(truckerSearch.toLowerCase()) ||
                 trucker.mc_dot_no?.toLowerCase().includes(truckerSearch.toLowerCase()) ||
                 trucker.carrierType?.toLowerCase().includes(truckerSearch.toLowerCase()) ||
                 trucker.email?.toLowerCase().includes(truckerSearch.toLowerCase()) ||
                 trucker.phoneNo?.toLowerCase().includes(truckerSearch.toLowerCase())
             )
         );
     }, [truckers, truckerSearch]);

    const handleCmtUserSelect = (userId, userName) => {
        setSelectedCmtUser(userId);
        setCmtUserSearch(userName);
        setIsCmtDropdownOpen(false);
    };

    const handleTruckerSelect = (truckerId, truckerName) => {
        setNewFleet({...newFleet, truckerId});
        setTruckerSearch(truckerName);
        setSelectedTruckerName(truckerName);
        setIsTruckerDropdownOpen(false);
    };

     // Handle view fleet details
     const handleViewFleet = async (fleet) => {
         try {
             setViewLoading(true);
             setSelectedFleet(fleet);
             setShowViewModal(true);
         } catch (error) {
             console.error('Error opening fleet view:', error);
             toast.error('Failed to load fleet details');
         } finally {
             setViewLoading(false);
         }
     };

    // Handle Assign Fleet
    const handleAssignFleet = (fleet) => {
        setAssignModal({ visible: true, fleet });
        setSelectedCmtUser('');
        setAssignDescription('');
        setCmtUserSearch('');
        setIsCmtDropdownOpen(false);
    };

    const closeAssignModal = () => {
        setAssignModal({ visible: false, fleet: null });
        setSelectedCmtUser('');
        setAssignDescription('');
        setAssignSubmitting(false);
        setCmtUserSearch('');
        setIsCmtDropdownOpen(false);
    };

    const handleAssignSubmit = async () => {
        if (!selectedCmtUser) {
            toast.error('Please select a CMT user to assign the fleet to');
            return;
        }

        if (!assignDescription.trim()) {
            toast.error('Please provide a description for assignment');
            return;
        }

        try {
            setAssignSubmitting(true);
            const token = getAuthToken();
            const empId = localStorage.getItem('empId') || sessionStorage.getItem('empId');

            if (!token || !empId) {
                toast.error('Missing token or empId. Please log in again.');
                return;
            }

            // Get the selected CMT user details
            const selectedUser = cmtUsers.find(user => user._id === selectedCmtUser);
            if (!selectedUser) {
                toast.error('Selected CMT user not found');
                return;
            }

            // Prepare API payload
            const payload = {
                fleetId: assignModal.fleet?.fleetId || assignModal.fleet?._id,
                cmtEmpId: selectedUser.empId,
                reason: assignDescription.trim()
            };

            console.log('Assign payload:', payload);

            // Make API call to assign fleet
            const response = await axios.post(
                `${API_CONFIG.BASE_URL}/api/v1/fleet/assign`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.success || response.status === 200) {
                toast.success(`Fleet assigned successfully to ${selectedUser.employeeName}!`);

                closeAssignModal();

                // Refresh the data immediately and then again after a delay to ensure updated data
                console.log('Refreshing data after assignment...');
                fetchFleets();
                setTimeout(() => {
                    console.log('Second refresh after assignment...');
                    fetchFleets();
                }, 2000);
            } else {
                toast.error(response.data.message || 'Failed to assign fleet');
            }

        } catch (error) {
            console.error('Assign error:', error);
            if (error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error('Failed to assign fleet. Please try again.');
            }
        } finally {
            setAssignSubmitting(false);
        }
    };

     // Handle Add New Fleet
     const handleAddFleet = () => {
         setShowAddModal(true);
         setNewFleet({
             truckerId: '',
             vehicleNo: '',
             chassisNo: '',
             engineNo: '',
             modelYear: '',
             vehicleType: '',
             make: '',
             model: '',
             fuelType: ''
         });
         setTruckerSearch('');
         setSelectedTruckerName('');
         setIsTruckerDropdownOpen(false);
     };

    const closeAddModal = () => {
        setShowAddModal(false);
        setNewFleet({
            truckerId: '',
            vehicleNo: '',
            chassisNo: '',
            engineNo: '',
            modelYear: '',
            vehicleType: '',
            make: '',
            model: '',
            fuelType: ''
        });
        setTruckerSearch('');
        setSelectedTruckerName('');
        setIsTruckerDropdownOpen(false);
    };

    const handleAddFleetSubmit = async () => {
        if (!newFleet.vehicleNo.trim()) {
            toast.error('Please enter vehicle number');
            return;
        }
        if (!newFleet.vehicleType.trim()) {
            toast.error('Please enter vehicle type');
            return;
        }
        if (!newFleet.truckerId.trim()) {
            toast.error('Please enter trucker ID');
            return;
        }
        if (!newFleet.chassisNo.trim()) {
            toast.error('Please enter chassis number');
            return;
        }
        if (!newFleet.engineNo.trim()) {
            toast.error('Please enter engine number');
            return;
        }
        if (!newFleet.make.trim()) {
            toast.error('Please enter vehicle make');
            return;
        }
        if (!newFleet.model.trim()) {
            toast.error('Please enter vehicle model');
            return;
        }
        if (!newFleet.fuelType.trim()) {
            toast.error('Please select fuel type');
            return;
        }

        try {
            setAssignSubmitting(true);
            const token = getAuthToken();

            if (!token) {
                toast.error('Missing token. Please log in again.');
                return;
            }

            // Make API call to add vehicle
            const response = await axios.post(
                `${API_CONFIG.BASE_URL}/api/v1/vehicle/cmt/add`,
                newFleet,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.success || response.status === 200) {
                toast.success('Vehicle added successfully!');
                closeAddModal();
                fetchFleets();
            } else {
                toast.error(response.data.message || 'Failed to add vehicle');
            }

        } catch (error) {
            console.error('Add vehicle error:', error);
            if (error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error('Failed to add vehicle. Please try again.');
            }
        } finally {
            setAssignSubmitting(false);
        }
    };

    // Filter vehicles based on search term and sort by creation date (latest first - LIFO)
    const filteredFleets = fleets
        .filter(vehicle =>
            vehicle.vehicleNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehicle.vehicleType.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehicle.chassisNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehicle.engineNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (vehicle.cmtAssignment?.empName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (vehicle.cmtAssignment?.empId || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination calculations
    const totalPages = Math.ceil(filteredFleets.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentFleets = filteredFleets.slice(startIndex, endIndex);

    // Handle page change
    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    // Reset to first page when search term changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Get status color
    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'available': return 'bg-green-100 text-green-800 border border-green-200';
            case 'assigned': return 'bg-blue-100 text-blue-800 border border-blue-200';
            case 'in_transit': return 'bg-purple-100 text-purple-800 border border-purple-200';
            case 'maintenance': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
            case 'inactive': return 'bg-red-100 text-red-800 border border-red-200';
            case 'active': return 'bg-green-100 text-green-800 border border-green-200';
            default: return 'bg-gray-100 text-gray-800 border border-gray-200';
        }
    };

    // Get approval status color
    const getApprovalStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'approved': return 'bg-green-100 text-green-800 border border-green-200';
            case 'pending': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
            case 'rejected': return 'bg-red-100 text-red-800 border border-red-200';
            default: return 'bg-gray-100 text-gray-800 border border-gray-200';
        }
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return 'N/A';
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Stats and Actions */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-6">
                    <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                <FaTruck className="text-blue-600" size={20} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total Fleet</p>
                                <p className="text-xl font-bold text-gray-800">{fleets.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                <FaCheckCircle className="text-green-600" size={20} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Available</p>
                                <p className="text-xl font-bold text-gray-800">{fleets.filter(f => f.status === 'available').length}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search fleet..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <button
                        onClick={handleAddFleet}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all duration-200 flex items-center gap-2"
                    >
                        <FaPlus size={16} />
                        Add Fleet
                    </button>
                    <button
                        onClick={fetchFleets}
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {/* Fleet Table */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-gray-500 text-lg">Loading fleet...</p>
                        <p className="text-gray-400 text-sm">Please wait while we fetch the data</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                 <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                                     <tr>
                                         <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide w-16">S.No</th>
                                         <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide w-32">Vehicle No</th>
                                         <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide w-40">Make/Model</th>
                                         <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide w-24">Type</th>
                                         <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide w-24">Year</th>
                                         <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide w-32">Created By</th>
                                         <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide w-24">Action</th>
                                     </tr>
                                 </thead>
                                <tbody>
                                    {currentFleets.map((vehicle, index) => (
                                        <tr key={vehicle.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                                            <td className="py-2 px-3">
                                                <span className="font-medium text-gray-700">{vehicle.sNo}</span>
                                            </td>
                                            <td className="py-2 px-3">
                                                <span className="font-medium text-gray-700">{vehicle.vehicleNo}</span>
                                            </td>
                                            <td className="py-2 px-3">
                                                <div>
                                                    <span className="font-medium text-gray-700">{vehicle.make}</span>
                                                    <p className="text-xs text-gray-500">{vehicle.model}</p>
                                                </div>
                                            </td>
                                            <td className="py-2 px-3">
                                                <span className="font-medium text-gray-700 text-sm">{vehicle.vehicleType}</span>
                                            </td>
                                            <td className="py-2 px-3">
                                                <span className="font-medium text-gray-700">{vehicle.modelYear}</span>
                                            </td>
                                            <td className="py-2 px-3">
                                                <div>
                                                    <span className="font-medium text-gray-700 text-sm">{vehicle.addedBy?.employeeName || 'N/A'}</span>
                                                    <p className="text-xs text-gray-500">{vehicle.addedBy?.empId || 'N/A'}</p>
                                                </div>
                                            </td>
                                            <td className="py-2 px-3">
                                                <button
                                                    onClick={() => handleViewFleet(vehicle)}
                                                    className="px-3 py-1 text-blue-600 text-xs rounded-md transition-colors border border-blue-300 hover:bg-blue-50"
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredFleets.length === 0 && (
                            <div className="text-center py-12">
                                <FaTruck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 text-lg">
                                    {searchTerm ? 'No fleet found matching your search' : 'No fleet found'}
                                </p>
                                <p className="text-gray-400 text-sm">
                                    {searchTerm ? 'Try adjusting your search terms' : 'No fleet available'}
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && filteredFleets.length > 0 && (
                <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                    <div className="text-sm text-gray-600">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredFleets.length)} of {filteredFleets.length} fleets
                        {searchTerm && ` (filtered from ${fleets.length} total)`}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                        >
                            Previous
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

             {/* View Details Modal */}
             {showViewModal && selectedFleet && (
                 <div 
                     className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4"
                     onClick={() => setShowViewModal(false)}
                 >
                     <div 
                         className="bg-white rounded-3xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-y-auto scrollbar-hide"
                         onClick={(e) => e.stopPropagation()}
                     >
                         {/* Header */}
                         <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
                             <div className="flex justify-between items-center">
                                 <div className="flex items-center gap-4">
                                     <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                         <FaTruck className="text-white" size={28} />
                                     </div>
                                     <div>
                                         <h2 className="text-2xl font-bold">Vehicle Details</h2>
                                         <p className="text-blue-100 text-lg">{selectedFleet.vehicleNo} - {selectedFleet.make} {selectedFleet.model}</p>
                                     </div>
                                 </div>
                                 <button
                                     onClick={() => setShowViewModal(false)}
                                     className="text-white hover:text-gray-200 text-3xl font-bold transition-colors"
                                 >
                                     ×
                                 </button>
                             </div>
                         </div>

                         {/* Content */}
                         <div className="p-8">
                             {viewLoading ? (
                                 <div className="text-center py-12">
                                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                                     <p className="text-gray-500 text-lg">Loading vehicle details...</p>
                                 </div>
                             ) : (
                                 <>
                                     {/* Vehicle Information Cards */}
                                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                                         {/* Basic Information */}
                                         <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200">
                                             <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                                                 <FaTruck className="text-blue-600" size={20} />
                                                 Vehicle Information
                                             </h3>
                                             <div className="grid grid-cols-1 gap-3">
                                                 <div className="flex justify-between items-center py-2 border-b border-blue-200">
                                                     <span className="font-medium text-gray-700">Vehicle Number:</span>
                                                     <span className="font-bold text-gray-900">{selectedFleet.vehicleNo}</span>
                                                 </div>
                                                 <div className="flex justify-between items-center py-2 border-b border-blue-200">
                                                     <span className="font-medium text-gray-700">Make/Model:</span>
                                                     <span className="font-bold text-gray-900">{selectedFleet.make} {selectedFleet.model}</span>
                                                 </div>
                                                 <div className="flex justify-between items-center py-2 border-b border-blue-200">
                                                     <span className="font-medium text-gray-700">Vehicle Type:</span>
                                                     <span className="font-bold text-gray-900">{selectedFleet.vehicleType}</span>
                                                 </div>
                                                 <div className="flex justify-between items-center py-2 border-b border-blue-200">
                                                     <span className="font-medium text-gray-700">Model Year:</span>
                                                     <span className="font-bold text-gray-900">{selectedFleet.modelYear}</span>
                                                 </div>
                                                 <div className="flex justify-between items-center py-2 border-b border-blue-200">
                                                     <span className="font-medium text-gray-700">Fuel Type:</span>
                                                     <span className="font-bold text-gray-900">{selectedFleet.fuelType}</span>
                                                 </div>
                                                 <div className="flex justify-between items-center py-2">
                                                     <span className="font-medium text-gray-700">Status:</span>
                                                     <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(selectedFleet.status)}`}>
                                                         {selectedFleet.status}
                                                     </span>
                                                 </div>
                                             </div>
                                         </div>

                                         {/* Technical Details */}
                                         <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl border border-green-200">
                                             <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                                                 <FaCar className="text-green-600" size={20} />
                                                 Technical Details
                                             </h3>
                                             <div className="grid grid-cols-1 gap-3">
                                                 <div className="flex justify-between items-center py-2 border-b border-green-200">
                                                     <span className="font-medium text-gray-700">Chassis Number:</span>
                                                     <span className="font-bold text-gray-900 text-sm">{selectedFleet.chassisNo}</span>
                                                 </div>
                                                 <div className="flex justify-between items-center py-2 border-b border-green-200">
                                                     <span className="font-medium text-gray-700">Engine Number:</span>
                                                     <span className="font-bold text-gray-900 text-sm">{selectedFleet.engineNo}</span>
                                                 </div>
                                                 <div className="flex justify-between items-center py-2 border-b border-green-200">
                                                     <span className="font-medium text-gray-700">Capacity:</span>
                                                     <span className="font-bold text-gray-900">{selectedFleet.capacity} Tons</span>
                                                 </div>
                                                 <div className="flex justify-between items-center py-2 border-b border-green-200">
                                                     <span className="font-medium text-gray-700">Vehicle ID:</span>
                                                     <span className="font-bold text-gray-900">{selectedFleet.vehicleId ? `V-${selectedFleet.vehicleId.slice(-5)}` : 'N/A'}</span>
                                                 </div>
                                                 <div className="flex justify-between items-center py-2">
                                                     <span className="font-medium text-gray-700">Trucker:</span>
                                                     <span className="font-bold text-gray-900 text-sm">{selectedFleet.truckerId}</span>
                                                 </div>
                                             </div>
                                         </div>
                                     </div>

                                     {/* Additional Information */}
                                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                                         {/* Created By Information */}
                                         <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200">
                                             <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                                                 <FaUser className="text-purple-600" size={20} />
                                                 Created By
                                             </h3>
                                             <div className="space-y-3">
                                                 <div className="flex justify-between items-center py-2 border-b border-purple-200">
                                                     <span className="font-medium text-gray-700">Employee Name:</span>
                                                     <span className="font-bold text-gray-900">{selectedFleet.addedBy?.employeeName || 'N/A'}</span>
                                                 </div>
                                                 <div className="flex justify-between items-center py-2 border-b border-purple-200">
                                                     <span className="font-medium text-gray-700">Employee ID:</span>
                                                     <span className="font-bold text-gray-900">{selectedFleet.addedBy?.empId || 'N/A'}</span>
                                                 </div>
                                                 <div className="flex justify-between items-center py-2">
                                                     <span className="font-medium text-gray-700">Department:</span>
                                                     <span className="font-bold text-gray-900">{selectedFleet.addedBy?.department || 'N/A'}</span>
                                                 </div>
                                             </div>
                                         </div>

                                         {/* Timestamps */}
                                         <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl border border-orange-200">
                                             <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                                                 <FaCalendar className="text-orange-600" size={20} />
                                                 Timestamps
                                             </h3>
                                             <div className="space-y-3">
                                                 <div className="flex justify-between items-center py-2 border-b border-orange-200">
                                                     <span className="font-medium text-gray-700">Created:</span>
                                                     <span className="font-bold text-gray-900">{formatDate(selectedFleet.createdAt)}</span>
                                                 </div>
                                                 <div className="flex justify-between items-center py-2 border-b border-orange-200">
                                                     <span className="font-medium text-gray-700">Last Updated:</span>
                                                     <span className="font-bold text-gray-900">{formatDate(selectedFleet.updatedAt)}</span>
                                                 </div>
                                                 <div className="flex justify-between items-center py-2">
                                                     <span className="font-medium text-gray-700">Active:</span>
                                                     <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedFleet.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                         {selectedFleet.isActive ? 'Yes' : 'No'}
                                                     </span>
                                                 </div>
                                             </div>
                                         </div>
                                     </div>

                                     {/* CMT Assignment Details */}
                                     {selectedFleet.cmtAssignment && (
                                         <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-2xl border border-indigo-200">
                                             <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                                                 <FaUserCheck className="text-indigo-600" size={20} />
                                                 CMT Assignment Details
                                             </h3>
                                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                 <div className="space-y-3">
                                                     <div className="flex justify-between items-center py-2 border-b border-indigo-200">
                                                         <span className="font-medium text-gray-700">Assigned To:</span>
                                                         <span className="font-bold text-gray-900">{selectedFleet.cmtAssignment.displayName || selectedFleet.cmtAssignment.empName}</span>
                                                     </div>
                                                     <div className="flex justify-between items-center py-2 border-b border-indigo-200">
                                                         <span className="font-medium text-gray-700">Employee ID:</span>
                                                         <span className="font-bold text-gray-900">{selectedFleet.cmtAssignment.empId}</span>
                                                     </div>
                                                     <div className="flex justify-between items-center py-2">
                                                         <span className="font-medium text-gray-700">Email:</span>
                                                         <span className="font-bold text-gray-900 text-sm">{selectedFleet.cmtAssignment.email}</span>
                                                     </div>
                                                 </div>
                                                 <div className="space-y-3">
                                                     <div className="flex justify-between items-center py-2 border-b border-indigo-200">
                                                         <span className="font-medium text-gray-700">Department:</span>
                                                         <span className="font-bold text-gray-900">{selectedFleet.cmtAssignment.department}</span>
                                                     </div>
                                                     <div className="flex justify-between items-center py-2 border-b border-indigo-200">
                                                         <span className="font-medium text-gray-700">Assigned At:</span>
                                                         <span className="font-bold text-gray-900">{formatDate(selectedFleet.cmtAssignment.assignedAt)}</span>
                                                     </div>
                                                     <div className="flex justify-between items-center py-2">
                                                         <span className="font-medium text-gray-700">Status:</span>
                                                         <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(selectedFleet.cmtAssignment.status)}`}>
                                                             {selectedFleet.cmtAssignment.status}
                                                         </span>
                                                     </div>
                                                 </div>
                                             </div>
                                         </div>
                                     )}
                                 </>
                             )}
                         </div>
                     </div>
                 </div>
             )}

             {/* Add Fleet Modal */}
            {showAddModal && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300 p-4"
                    // onClick={() => setShowAddModal(false)}
                >
                     <div 
                         className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-hide border border-green-100"
                         onClick={(e) => e.stopPropagation()}
                     >
                        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-blue-500 text-white px-6 py-4 rounded-t-3xl shadow mb-6 flex justify-between items-center z-10">
                            <div>
                                <h2 className="text-2xl font-semibold flex items-center gap-2">
                                    <FaPlus className="text-white" size={20} />
                                    Add New Fleet
                                </h2>
                                <p className="text-sm text-green-100 mt-1">
                                    Enter fleet details to add a new vehicle
                                </p>
                            </div>
                            <button
                                onClick={closeAddModal}
                                type="button"
                                className="text-white text-3xl hover:text-gray-200"
                            >
                                ×
                            </button>
                        </div>

                        <div className="px-6 pb-6">
                            <div className="space-y-6 mb-6">
                                 {/* Trucker Searchable Dropdown - Full Width */}
                                 <div>
                                     <label className="block text-gray-700 text-sm font-medium mb-2">
                                         Trucker <span className="text-red-500">*</span>
                                     </label>
                                     <div className="relative trucker-dropdown-container">
                                         <input
                                             type="text"
                                             value={truckerSearch}
                                             onChange={(e) => {
                                                 setTruckerSearch(e.target.value);
                                                 setIsTruckerDropdownOpen(true);
                                             }}
                                             onFocus={() => setIsTruckerDropdownOpen(true)}
                                             onClick={() => setIsTruckerDropdownOpen(true)}
                                             placeholder="Search trucker by company name, MC/DOT number, or email..."
                                             className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 cursor-pointer"
                                         />
                                         <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                             <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                             </svg>
                                         </div>
                                         
                                         {isTruckerDropdownOpen && (
                                             <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                                 {/* Clear/Unselect option */}
                                                 {newFleet.truckerId && (
                                                     <div
                                                         onClick={() => {
                                                             setNewFleet({...newFleet, truckerId: ''});
                                                             setTruckerSearch('');
                                                             setSelectedTruckerName('');
                                                             setIsTruckerDropdownOpen(false);
                                                         }}
                                                         className="px-4 py-3 hover:bg-red-50 cursor-pointer border-b border-gray-100 transition-colors duration-150"
                                                     >
                                                         <div className="font-medium text-red-600 flex items-center gap-2">
                                                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                             </svg>
                                                             Clear Selection
                                                         </div>
                                                     </div>
                                                 )}
                                                 
                                                 {filteredTruckers.length > 0 ? (
                                                     filteredTruckers.map((trucker) => (
                                                         <div
                                                             key={trucker._id}
                                                             onClick={() => handleTruckerSelect(trucker._id, `${trucker.compName} (${trucker.mc_dot_no}) - ${trucker.carrierType}`)}
                                                             className={`px-4 py-3 hover:bg-green-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150 ${
                                                                 newFleet.truckerId === trucker._id ? 'bg-green-50' : ''
                                                             }`}
                                                         >
                                                             <div className="font-medium text-gray-900">{trucker.compName}</div>
                                                             <div className="text-sm text-gray-600">{trucker.mc_dot_no} - {trucker.carrierType}</div>
                                                             <div className="text-sm text-gray-500">{trucker.email}</div>
                                                             <div className="text-xs text-gray-400">Fleet Size: {trucker.fleetsize} | Phone: {trucker.phoneNo}</div>
                                                         </div>
                                                     ))
                                                 ) : (
                                                     <div className="px-4 py-3 text-gray-500 text-center">
                                                         No truckers found matching "{truckerSearch}"
                                                     </div>
                                                 )}
                                             </div>
                                         )}
                                     </div>
                                     
                                     {newFleet.truckerId && selectedTruckerName && (
                                         <div className="mt-3 p-3 bg-green-50 border-2 border-green-200 rounded-xl">
                                             <div className="flex items-center justify-between">
                                                 <div className="flex items-center gap-2">
                                                     <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                     <div className="text-sm text-green-800">
                                                         <span className="font-semibold">Selected:</span> {selectedTruckerName}
                                                     </div>
                                                 </div>
                                                 <button
                                                     type="button"
                                                     onClick={() => {
                                                         setNewFleet({...newFleet, truckerId: ''});
                                                         setTruckerSearch('');
                                                         setSelectedTruckerName('');
                                                     }}
                                                     className="text-red-600 hover:text-red-800 hover:bg-red-100 p-2 rounded-lg transition-all duration-150"
                                                     title="Clear Selection"
                                                 >
                                                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                     </svg>
                                                 </button>
                                             </div>
                                         </div>
                                     )}
                                 </div>

                                {/* Row 1: Vehicle No and Chassis No */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-700 text-sm font-medium mb-2">
                                            Vehicle No <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={newFleet.vehicleNo}
                                            onChange={(e) => setNewFleet({ ...newFleet, vehicleNo: e.target.value })}
                                            placeholder="Enter vehicle number"
                                            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 text-sm font-medium mb-2">
                                            Chassis No <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={newFleet.chassisNo}
                                            onChange={(e) => setNewFleet({ ...newFleet, chassisNo: e.target.value })}
                                            placeholder="Enter chassis number"
                                            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                                        />
                                    </div>
                                </div>

                                {/* Row 2: Engine No and Model Year */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-700 text-sm font-medium mb-2">
                                            Engine No <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={newFleet.engineNo}
                                            onChange={(e) => setNewFleet({ ...newFleet, engineNo: e.target.value })}
                                            placeholder="Enter engine number"
                                            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 text-sm font-medium mb-2">
                                            Model Year <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            value={newFleet.modelYear}
                                            onChange={(e) => setNewFleet({ ...newFleet, modelYear: e.target.value })}
                                            placeholder="Enter model year"
                                            min="1900"
                                            max="2030"
                                            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                                        />
                                    </div>
                                </div>

                                {/* Row 3: Vehicle Type and Make */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-700 text-sm font-medium mb-2">
                                            Vehicle Type <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={newFleet.vehicleType}
                                            onChange={(e) => setNewFleet({ ...newFleet, vehicleType: e.target.value })}
                                            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                                        >
                                            <option value="">Select vehicle type</option>
                                            <option value="Dry Van">Dry Van</option>
                                            <option value="Flatbed">Flatbed</option>
                                            <option value="Refrigerated">Refrigerated</option>
                                            <option value="Container">Container</option>
                                            <option value="Tanker">Tanker</option>
                                            <option value="Car Carrier">Car Carrier</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 text-sm font-medium mb-2">
                                            Make <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={newFleet.make}
                                            onChange={(e) => setNewFleet({ ...newFleet, make: e.target.value })}
                                            placeholder="Enter vehicle make"
                                            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                                        />
                                    </div>
                                </div>

                                 {/* Row 4: Model - Full Width */}
                                 <div>
                                     <label className="block text-gray-700 text-sm font-medium mb-2">
                                         Model <span className="text-red-500">*</span>
                                     </label>
                                     <input
                                         type="text"
                                         value={newFleet.model}
                                         onChange={(e) => setNewFleet({ ...newFleet, model: e.target.value })}
                                         placeholder="Enter vehicle model"
                                         className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                                     />
                                 </div>

                                {/* Row 4: Fuel Type - Full Width */}
                                <div>
                                    <label className="block text-gray-700 text-sm font-medium mb-2">
                                        Fuel Type <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={newFleet.fuelType}
                                        onChange={(e) => setNewFleet({ ...newFleet, fuelType: e.target.value })}
                                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                                    >
                                        <option value="">Select fuel type</option>
                                        <option value="Diesel">Diesel</option>
                                        <option value="Gasoline">Gasoline</option>
                                        <option value="Electric">Electric</option>
                                        <option value="Hybrid">Hybrid</option>
                                        <option value="CNG">CNG</option>
                                        <option value="LPG">LPG</option>
                                    </select>
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-4">
                                    <button
                                        type="button"
                                        onClick={closeAddModal}
                                        disabled={assignSubmitting}
                                        className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-all duration-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleAddFleetSubmit}
                                        disabled={assignSubmitting}
                                        className={`px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 ${assignSubmitting
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg hover:shadow-xl'
                                            }`}
                                    >
                                        {assignSubmitting ? (
                                            <div className="flex items-center gap-2">
                                                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                Adding...
                                            </div>
                                        ) : (
                                            'Add Fleet'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Fleet Modal */}
            {assignModal.visible && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300"
                    onClick={closeAssignModal}
                >
                    <div 
                        className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl w-full max-w-2xl p-8 border border-orange-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gradient-to-r from-orange-600 to-red-500 text-white px-6 py-4 rounded-xl shadow mb-6 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-semibold flex items-center gap-2">
                                    Assign Fleet
                                </h2>
                                <p className="text-sm text-orange-100 mt-1">
                                    Select a CMT user to assign this fleet
                                </p>
                            </div>
                            <button
                                onClick={closeAssignModal}
                                type="button"
                                className="text-white text-3xl hover:text-gray-200"
                            >
                                ×
                            </button>
                        </div>

                        {/* Vehicle Details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-700 bg-orange-50 px-4 py-3 rounded-lg mb-6">
                            <div>
                                <strong>Vehicle ID:</strong>
                                <br />
                                {assignModal.fleet?.vehicleId ? `V-${assignModal.fleet.vehicleId.slice(-5)}` : 'N/A'}
                            </div>
                            <div>
                                <strong>Vehicle No:</strong>
                                <br />
                                {assignModal.fleet?.vehicleNo || 'N/A'}
                            </div>
                            <div>
                                <strong>Make/Model:</strong>
                                <br />
                                {assignModal.fleet?.make || 'N/A'} {assignModal.fleet?.model || ''}
                            </div>
                            <div>
                                <strong>Type:</strong>
                                <br />
                                {assignModal.fleet?.vehicleType || 'N/A'}
                            </div>
                            <div>
                                <strong>Capacity:</strong>
                                <br />
                                {assignModal.fleet?.capacity || 0} Tons
                            </div>
                            <div>
                                <strong>Year:</strong>
                                <br />
                                {assignModal.fleet?.modelYear || 'N/A'}
                            </div>
                            <div>
                                <strong>Fuel Type:</strong>
                                <br />
                                {assignModal.fleet?.fuelType || 'N/A'}
                            </div>
                            <div>
                                <strong>Status:</strong>
                                <br />
                                {assignModal.fleet?.status || 'N/A'}
                            </div>
                        </div>

                        {/* CMT User Selection */}
                        <div className="mb-6">
                            <label className="block text-gray-700 text-sm font-medium mb-2">
                                Select CMT User <span className="text-red-500">*</span>
                            </label>
                            <div className="relative cmt-dropdown-container">
                                <input
                                    type="text"
                                    value={cmtUserSearch}
                                    onChange={(e) => {
                                        setCmtUserSearch(e.target.value);
                                        setIsCmtDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsCmtDropdownOpen(true)}
                                    onClick={() => setIsCmtDropdownOpen(true)}
                                    placeholder="Search CMT user by name, ID, designation, or email..."
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 cursor-pointer"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>

                                {isCmtDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                        {/* Clear/Unselect option */}
                                        {selectedCmtUser && (
                                            <div
                                                onClick={() => {
                                                    setSelectedCmtUser('');
                                                    setCmtUserSearch('');
                                                    setIsCmtDropdownOpen(false);
                                                }}
                                                className="px-4 py-3 hover:bg-red-50 cursor-pointer border-b border-gray-100 transition-colors duration-150"
                                            >
                                                <div className="font-medium text-red-600 flex items-center gap-2">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                    Clear Selection
                                                </div>
                                            </div>
                                        )}

                                        {filteredCmtUsers.length > 0 ? (
                                            filteredCmtUsers.map((user) => (
                                                <div
                                                    key={user._id}
                                                    onClick={() => handleCmtUserSelect(user._id, `${user.employeeName} (${user.empId}) - ${user.designation}`)}
                                                    className={`px-4 py-3 hover:bg-orange-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150 ${selectedCmtUser === user._id ? 'bg-orange-50' : ''
                                                        }`}
                                                >
                                                    <div className="font-medium text-gray-900">{user.employeeName}</div>
                                                    <div className="text-sm text-gray-600">{user.empId} - {user.designation}</div>
                                                    <div className="text-sm text-gray-500">{user.email}</div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="px-4 py-3 text-gray-500 text-center">
                                                No CMT users found matching "{cmtUserSearch}"
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {selectedCmtUser && (
                                <div className="mt-3 p-3 bg-orange-50 border-2 border-orange-200 rounded-xl">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                            <div className="text-sm text-orange-800">
                                                <span className="font-semibold">Selected:</span> {selectedCmtUserName}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedCmtUser('');
                                                setCmtUserSearch('');
                                            }}
                                            className="text-red-600 hover:text-red-800 hover:bg-red-100 p-2 rounded-lg transition-all duration-150"
                                            title="Clear Selection"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <div className="mb-6">
                            <label className="block text-gray-700 text-sm font-medium mb-2">
                                Description <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={assignDescription}
                                onChange={(e) => setAssignDescription(e.target.value)}
                                rows={4}
                                placeholder="Please provide a description for assigning this fleet..."
                                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 resize-none"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-4">
                            <button
                                type="button"
                                onClick={closeAssignModal}
                                disabled={assignSubmitting}
                                className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-all duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleAssignSubmit}
                                disabled={assignSubmitting}
                                className={`px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 ${assignSubmitting
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg hover:shadow-xl'
                                    }`}
                            >
                                {assignSubmitting ? (
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Assigning...
                                    </div>
                                ) : (
                                    'Assign Fleet'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


