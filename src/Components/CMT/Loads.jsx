import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaArrowLeft, FaDownload } from 'react-icons/fa';
import { User, Mail, Phone, Building, FileText, CheckCircle, XCircle, Clock, PlusCircle, MapPin, Truck, Calendar, DollarSign, Search,Plus } from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

export default function Loads() {
  const [loads, setLoads] = useState([]);
  const [viewDoc, setViewDoc] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [selectedLoad, setSelectedLoad] = useState(null);
  const [reason, setReason] = useState('');
  const [showAddLoadForm, setShowAddLoadForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // ✅ NEW STATES
const [showLoadCreationModal, setShowLoadCreationModal] = useState(false);
const [loadType, setLoadType] = useState("OTR");
const [shippers, setShippers] = useState([]);
const [loadForm, setLoadForm] = useState({
  shipperId: "", // Dynamic if needed
  fromCity: "",
  fromState: "",
  toCity: "",
  toState: "",
  weight: "",
  commodity: "",
  vehicleType: "",
  pickupDate: "",
  deliveryDate: "",
  returnDate: "",
  drayageLocation: "",
  rate: "",
  // rateType: "Flat Rate",
  bidDeadline: "",
  containerNo: "",
  poNumber: "",
  bolNumber: ""
});

// ✅ HANDLE CHANGE
const handleChange = (e) => {
  const { name, value } = e.target;
  setLoadForm((prev) => ({ ...prev, [name]: value }));
};

// ✅ HANDLE SUBMIT
const handleLoadSubmit = async (e) => {
  e.preventDefault();

  const token = sessionStorage.getItem("token"); // ✅ get from sessionStorage

  if (!token) {
    alertify.error("You're not logged in. Please login to continue.");
    return;
  }

  const payload = {
    ...loadForm,
    weight: parseInt(loadForm.weight),
    rate: parseInt(loadForm.rate),
    rateType: "Flat Rate",
    loadType,
  };

  console.log("🚀 Submitting Payload:", payload);

  try {
    const res = await axios.post(
      `${API_CONFIG.BASE_URL}/api/v1/load/create-by-sales`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // ✅ token from session
        },
      }
    );

    if (res.data.success) {
      alertify.success("✅ Load created successfully!");
      setShowLoadCreationModal(false);
      fetchLoads(); // Refresh list
    } else {
      alertify.error(res.data.message || "❌ Load creation failed.");
    }
  } catch (err) {
    console.error("❌ Error creating load:", err);
    alertify.error(err.response?.data?.message || "❌ API Error. Please try again.");
  }
};
useEffect(() => {
  const fetchShippers = async () => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      console.error("No token found");
      return;
    }

    try {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/shipper_driver/department/customers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("Shippers:", res.data);

      setShippers(res.data?.customers || []); // 👈 adjust based on actual key
    } catch (err) {
      console.error("❌ Error fetching shippers:", err.response?.data || err.message || err);
    }
  };

  fetchShippers();
}, []);






  // Form state for Add Load
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

  // Fetch data from API
  const fetchLoads = async () => {
    try {
      setLoading(true);
      console.log('Fetching loads from:', `${API_CONFIG.BASE_URL}/api/v1/load/inhouse-created`);
      
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/load/inhouse-created`, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true // Add this for authentication
      });
      
      console.log('API Response:', response);
      
      if (response.data && response.data.success && response.data.loads && Array.isArray(response.data.loads) && response.data.loads.length > 0) {
        // Transform API data to match our component structure
        const transformedLoads = response.data.loads.map((load, index) => {
          try {
            console.log(`Processing load ${index}:`, load);
            
            // Check if load has required properties
            if (!load || !load._id) {
              console.warn(`Load ${index} is missing required properties:`, load);
              return {
                id: `LD-ERROR-${index}`, 
                loadNum: 'Invalid Data', 
                shipmentNumber: 'N/A',
                origin: 'N/A',
                destination: 'N/A',
                rate: 0,
                truckerName: 'N/A',
                status: 'error',
                createdAt: 'N/A',
                createdBy: 'N/A',
                docUpload: 'sample-doc.jpg',
                remarks: 'Invalid load data'
              };
            }

            // Handle origin - could be string or object with city/state
            let originText = 'N/A';
            if (load.origin) {
              if (typeof load.origin === 'string') {
                originText = load.origin;
              } else if (load.origin.city && load.origin.state) {
                originText = `${load.origin.city}, ${load.origin.state}`;
              } else if (load.origin.city) {
                originText = load.origin.city;
              } else if (load.origin.addressLine1) {
                originText = load.origin.addressLine1;
              }
            }

            // Handle destination - could be string or object with city/state
            let destinationText = 'N/A';
            if (load.destination) {
              if (typeof load.destination === 'string') {
                destinationText = load.destination;
              } else if (load.destination.city && load.destination.state) {
                destinationText = `${load.destination.city}, ${load.destination.state}`;
              } else if (load.destination.city) {
                destinationText = load.destination.city;
              } else if (load.destination.addressLine1) {
                destinationText = load.destination.addressLine1;
              }
            }

            // Get trucker name from assignedTo or acceptedBid
            let truckerName = 'N/A';
            if (load.assignedTo) {
              if (typeof load.assignedTo === 'string') {
                truckerName = load.assignedTo;
              } else if (load.assignedTo.compName) {
                truckerName = load.assignedTo.compName;
              }
            } else if (load.acceptedBid && load.acceptedBid.driverName) {
              truckerName = load.acceptedBid.driverName;
            } else if (load.carrier && load.carrier.compName) {
              truckerName = load.carrier.compName;
            }

            // Map API status to component status
            let status = 'available';
            if (load.status) {
              switch (load.status.toLowerCase()) {
                case 'posted':
                case 'bidding':
                  status = 'available';
                  break;
                case 'assigned':
                  status = 'assigned';
                  break;
                case 'in transit':
                  status = 'in-transit';
                  break;
                case 'completed':
                case 'delivered':
                  status = 'completed';
                  break;
                default:
                  status = load.status.toLowerCase();
              }
            }

            const transformedLoad = {
              id: `LD-${load._id?.slice(-6) || '000000'}`, 
              loadNum: load._id || 'N/A', 
              shipmentNumber: load.shipmentNumber || 'N/A',
              origin: originText,
              destination: destinationText,
              rate: load.rate || 0,
              truckerName: truckerName,
              status: status,
              createdAt: load.pickupDate ? new Date(load.pickupDate).toISOString().split('T')[0] : 
                       load.createdAt ? new Date(load.createdAt).toISOString().split('T')[0] : 'N/A',
              createdBy: `Shipper: ${load.shipper?.compName || 'N/A'}`,
              docUpload: 'sample-doc.jpg',
              remarks: load.commodity || load.notes || ''
            };
            
            console.log(`Transformed load ${index}:`, transformedLoad);
            return transformedLoad;
          } catch (error) {
            console.error(`Error processing load ${index}:`, error, load);
            return {
              id: `LD-ERROR-${index}`, 
              loadNum: 'Error', 
              shipmentNumber: 'Error',
              origin: 'Error',
              destination: 'Error',
              rate: 0,
              truckerName: 'Error',
              status: 'error',
              createdAt: 'Error',
              createdBy: 'Error',
              docUpload: 'sample-doc.jpg',
              remarks: 'Error processing data'
            };
          }
        });
        
        console.log('Transformed loads:', transformedLoads);
        setLoads(transformedLoads);
      } else {
        console.error('API response format error:', response.data);
        console.log('Response data structure:', {
          success: response.data?.success,
          hasLoads: !!response.data?.loads,
          loadsLength: response.data?.loads?.length,
          loadsType: typeof response.data?.loads,
          dataKeys: response.data ? Object.keys(response.data) : []
        });
        
        // If API returns empty data, show empty state
        if (response.data && response.data.success && (!response.data.loads || response.data.loads.length === 0)) {
          console.log('API returned empty loads array');
          setLoads([]);
          return;
        }
        // Try alternative data structure
        if (response.data && response.data.data) {
          console.log('Trying alternative data structure:', response.data.data);
          const transformedLoads = response.data.data.map((load, index) => {
            try {
              // Handle origin
              let originText = 'N/A';
              if (load.origin) {
                if (typeof load.origin === 'string') {
                  originText = load.origin;
                } else if (load.origin.city && load.origin.state) {
                  originText = `${load.origin.city}, ${load.origin.state}`;
                } else if (load.origin.city) {
                  originText = load.origin.city;
                } else if (load.origin.addressLine1) {
                  originText = load.origin.addressLine1;
                }
              }

              // Handle destination
              let destinationText = 'N/A';
              if (load.destination) {
                if (typeof load.destination === 'string') {
                  destinationText = load.destination;
                } else if (load.destination.city && load.destination.state) {
                  destinationText = `${load.destination.city}, ${load.destination.state}`;
                } else if (load.destination.city) {
                  destinationText = load.destination.city;
                } else if (load.destination.addressLine1) {
                  destinationText = load.destination.addressLine1;
                }
              }

              // Get trucker name
              let truckerName = 'N/A';
              if (load.assignedTo) {
                if (typeof load.assignedTo === 'string') {
                  truckerName = load.assignedTo;
                } else if (load.assignedTo.compName) {
                  truckerName = load.assignedTo.compName;
                }
              } else if (load.acceptedBid && load.acceptedBid.driverName) {
                truckerName = load.acceptedBid.driverName;
              } else if (load.carrier && load.carrier.compName) {
                truckerName = load.carrier.compName;
              }

              // Map status
              let status = 'available';
              if (load.status) {
                switch (load.status.toLowerCase()) {
                  case 'posted':
                  case 'bidding':
                    status = 'available';
                    break;
                  case 'assigned':
                    status = 'assigned';
                    break;
                  case 'in transit':
                    status = 'in-transit';
                    break;
                  case 'completed':
                  case 'delivered':
                    status = 'completed';
                    break;
                  default:
                    status = load.status.toLowerCase();
                }
              }

              return {
                id: `LD-${load._id?.slice(-6) || '000000'}`, 
                loadNum: load._id || 'N/A', 
                shipmentNumber: load.shipmentNumber || 'N/A',
                origin: originText,
                destination: destinationText,
                rate: load.rate || 0,
                truckerName: truckerName,
                status: status,
                createdAt: load.pickupDate ? new Date(load.pickupDate).toISOString().split('T')[0] : 
                         load.createdAt ? new Date(load.createdAt).toISOString().split('T')[0] : 'N/A',
                createdBy: `Shipper: ${load.shipper?.compName || 'N/A'}`,
                docUpload: 'sample-doc.jpg',
                remarks: load.commodity || load.notes || ''
              };
            } catch (error) {
              console.error(`Error processing alternative load ${index}:`, error);
              return {
                id: `LD-ERROR-${index}`, 
                loadNum: 'Error', 
                shipmentNumber: 'Error',
                origin: 'Error',
                destination: 'Error',
                rate: 0,
                truckerName: 'Error',
                status: 'error',
                createdAt: 'Error',
                createdBy: 'Error',
                docUpload: 'sample-doc.jpg',
                remarks: 'Error processing data'
              };
            }
          });
          setLoads(transformedLoads);
        }
      }
    } catch (error) {
      console.error('Error fetching loads:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      });
      
      alertify.error(`Failed to load loads: ${error.response?.status || 'Network Error'}`);
      // Fallback to sample data if API fails
      const sampleLoads = [
        {
          id: 'LD-001',
          loadNum: '6884a05c28ae6f73d1db8759',
          shipmentNumber: 'SH-2024-001',
          origin: 'New York, NY',
          destination: 'Los Angeles, CA',
          rate: 2500,
          truckerName: 'John Trucker',
          status: 'available',
          createdAt: new Date().toISOString().split('T')[0],
          createdBy: 'Employee 1234',
          docUpload: 'sample-doc.jpg',
          remarks: 'Available load for long distance haul'
        }
      ];
      setLoads(sampleLoads);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoads();
  }, []);

  const handleStatusUpdate = async (status) => {
    try {
      const { id } = selectedLoad;
      // Simulate API call
      setTimeout(() => {
        setLoads(loads.map(load => 
          load.id === id ? { ...load, status } : load
        ));
        setModalType(null);
        setReason('');
        setSelectedLoad(null);
        setViewDoc(false);
      }, 1000);
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  // Status color helper
  const statusColor = (status) => {
    if (!status) return 'bg-yellow-100 text-yellow-700';
    if (status === 'available' || status === 'posted' || status === 'bidding') return 'bg-green-100 text-green-700';
    if (status === 'assigned') return 'bg-blue-100 text-blue-700';
    if (status === 'in-transit' || status === 'in transit') return 'bg-purple-100 text-purple-700';
    if (status === 'completed' || status === 'delivered') return 'bg-gray-100 text-gray-700';
    return 'bg-blue-100 text-blue-700';
  };

  // Filter loads based on search term
  const filteredLoads = loads.filter(load =>
    load.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    load.shipmentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    load.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
    load.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
    load.truckerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredLoads.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLoads = filteredLoads.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle file upload
  const handleFileChange = (e) => {
    setFormData(prev => ({
      ...prev,
      docs: e.target.files[0]
    }));
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
      const response = await axios.post(`${API_CONFIG.BASE_URL}/api/v1/load/create/`, submitData, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.data.success) {
        // Add the new load to the existing loads list
        const newLoad = {
          id: `LD-${response.data.data._id.slice(-6)}`,
          loadNum: response.data.data._id,
          shipmentNumber: response.data.data.shipmentNumber,
          origin: response.data.data.origin,
          destination: response.data.data.destination,
          rate: response.data.data.rate,
          truckerName: response.data.data.truckerName,
          status: 'available',
          createdAt: new Date(response.data.data.date).toISOString().split('T')[0],
          createdBy: `Employee ${response.data.data.empId}`,
          docUpload: response.data.data.supportingDocs || 'sample-doc.jpg',
          remarks: response.data.data.remarks
        };

        setLoads(prevLoads => [newLoad, ...prevLoads]);
        
        // Close modal and reset form
        setShowAddLoadForm(false);
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
        alertify.success('✅ Load created successfully!');
      } else {
        alertify.error('Failed to create load. Please try again.');
      }
    } catch (error) {
      console.error('Error creating load:', error);
      alertify.error('Error creating load. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form when modal closes
  const handleCloseModal = () => {
    setShowAddLoadForm(false);
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

  // Handle view load details
  const handleViewLoad = (load) => {
    setSelectedLoad(load);
    setShowLoadModal(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading loads...</p>
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Truck className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Loads</p>
                <p className="text-xl font-bold text-gray-800">{loads.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Available</p>
                <p className="text-xl font-bold text-blue-600">{loads.filter(load => ['available', 'posted', 'bidding'].includes(load.status)).length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock className="text-yellow-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Assigned</p>
                <p className="text-xl font-bold text-yellow-600">{loads.filter(load => load.status === 'assigned').length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Calendar className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">In Transit</p>
                <p className="text-xl font-bold text-purple-600">{loads.filter(load => ['in-transit', 'in transit'].includes(load.status)).length}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search loads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          {/* // ✅ BUTTON TO OPEN MODAL */}
<button
  onClick={() => {
    setLoadType("OTR");
    setShowLoadCreationModal(true);
  }}
  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
>
  <PlusCircle className="w-4 h-4" />
  Add Loads
</button>
        </div>
        
      </div>

      {viewDoc && selectedLoad ? (
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
              href={`${API_CONFIG.BASE_URL}/${selectedLoad.docUpload}`}
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
                <h3 className="text-lg font-bold text-green-700">Load Info</h3>
              </div>
              <div className="flex items-center gap-2 text-gray-700"><User size={16} /> <span className="font-medium">Trucker:</span> {selectedLoad.truckerName}</div>
              <div className="flex items-center gap-2 text-gray-700"><FileText size={16} /> <span className="font-medium">Load ID:</span> {selectedLoad.id}</div>
              <div className="flex items-center gap-2 text-gray-700"><Mail size={16} /> <span className="font-medium">Shipment:</span> {selectedLoad.shipmentNumber}</div>
              <div className="flex items-center gap-2 text-gray-700"><Phone size={16} /> <span className="font-medium">Rate:</span> ${selectedLoad.rate.toLocaleString()}</div>
              <div className="flex items-center gap-2 text-gray-700"><Truck size={16} /> <span className="font-medium">Origin:</span> {selectedLoad.origin}</div>
              <div className="flex items-center gap-2 text-gray-700"><DollarSign size={16} /> <span className="font-medium">Destination:</span> {selectedLoad.destination}</div>
              <div className="flex items-center gap-2 text-gray-700"><Calendar size={16} /> <span className="font-medium">Created:</span> {selectedLoad.createdAt}</div>
              {selectedLoad.remarks && (
                <div className="flex items-center gap-2 text-gray-700"><FileText size={16} /> <span className="font-medium">Remarks:</span> {selectedLoad.remarks}</div>
              )}
              <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mt-2 ${statusColor(selectedLoad.status)}`}>
                {(selectedLoad.status === 'available' || selectedLoad.status === 'posted' || selectedLoad.status === 'bidding') && <CheckCircle size={14} />}
                {selectedLoad.status === 'assigned' && <Clock size={14} />}
                {(selectedLoad.status === 'in-transit' || selectedLoad.status === 'in transit') && <Truck size={14} />}
                {selectedLoad.status === 'completed' || selectedLoad.status === 'delivered' ? 'Completed' : 
                 selectedLoad.status === 'in-transit' || selectedLoad.status === 'in transit' ? 'In Transit' :
                 selectedLoad.status === 'assigned' ? 'Assigned' :
                 selectedLoad.status === 'posted' ? 'Posted' :
                 selectedLoad.status === 'bidding' ? 'Bidding' :
                 selectedLoad.status || 'Available'}
              </div>
            </div>
            <div className="flex flex-col items-center justify-center">
              <img
                src={`${API_CONFIG.BASE_URL}/${selectedLoad.docUpload}`}
                alt="Uploaded Doc"
                className="rounded-xl shadow-lg max-h-[250px] w-full object-contain border border-green-100 cursor-pointer hover:scale-105 transition"
                onClick={() => setPreviewImg(`${API_CONFIG.BASE_URL}/${selectedLoad.docUpload}`)}
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
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Load ID</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Load Num</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Shipment</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Origin</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Destination</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Rate</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Trucker</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Created</th>
                </tr>
              </thead>
              <tbody>
                {currentLoads.map((load, index) => (
                  <tr key={load.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{load.id}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-mono text-sm text-gray-600">{load.loadNum}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{load.shipmentNumber}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{load.origin}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{load.destination}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-bold text-green-600">${load.rate.toLocaleString()}</span>
                    </td>
                    <td className="py-2 px-3">
                      <div>
                        <p className="font-medium text-gray-700">{load.truckerName}</p>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${statusColor(load.status)}`}>
                        {(load.status === 'available' || load.status === 'posted' || load.status === 'bidding') && <CheckCircle size={12} />}
                        {load.status === 'assigned' && <Clock size={12} />}
                        {(load.status === 'in-transit' || load.status === 'in transit') && <Truck size={12} />}
                        {load.status === 'completed' || load.status === 'delivered' ? 'Completed' : 
                         load.status === 'in-transit' || load.status === 'in transit' ? 'In Transit' :
                         load.status === 'assigned' ? 'Assigned' :
                         load.status === 'posted' ? 'Posted' :
                         load.status === 'bidding' ? 'Bidding' :
                         load.status || 'Available'}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div>
                        <p className="text-sm text-gray-800">{load.createdAt}</p>
                        <p className="text-xs text-gray-500">by {load.createdBy}</p>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredLoads.length === 0 && (
            <div className="text-center py-12">
              <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {searchTerm ? 'No loads found matching your search' : 'No loads found'}
              </p>
              <p className="text-gray-400 text-sm">
                {searchTerm ? 'Try adjusting your search terms' : 'Create your first load to get started'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && filteredLoads.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredLoads.length)} of {filteredLoads.length} loads
            {searchTerm && ` (filtered from ${loads.length} total)`}
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
                className={`px-3 py-2 border rounded-lg transition-colors ${
                  currentPage === page
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

      {/* Add Load Modal */}
      {showAddLoadForm && (
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
                    <h2 className="text-xl font-bold">Add Load</h2>
                    <p className="text-blue-100">Create a new load</p>
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
                    'Create Load'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
       {/* ✅ MODAL UI */}
{showLoadCreationModal && (
  <div className="fixed inset-0 z-50 bg-black/40 flex justify-center items-center p-4">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-8 border border-blue-300">

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-blue-700">🚚 Create New Load</h2>
        <div className="flex gap-2 bg-blue-100 p-1 rounded-full">
          {["OTR", "DRAYAGE"].map((type) => (
            <button
              key={type}
              onClick={() => setLoadType(type)}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                loadType === type
                  ? "bg-blue-600 text-white"
                  : "text-blue-700 hover:bg-blue-200"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleLoadSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Shipper Dropdown */}
        <div className="col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Select Shipper *</label>
          <select
            name="shipperId"
            value={loadForm.shipperId}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select Shipper --</option>
            {shippers.map((shipper) => (
              <option key={shipper._id} value={shipper._id}>
                {shipper.compName} ({shipper.email})
              </option>
            ))}
          </select>
        </div>

        {/* FROM/TO LOCATION */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From City *</label>
          <input name="fromCity" required onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From State *</label>
          <input name="fromState" required onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To City *</label>
          <input name="toCity" required onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To State *</label>
          <input name="toState" required onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500" />
        </div>

        {/* VEHICLE & COMMODITY */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type *</label>
          <input name="vehicleType" required onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Commodity *</label>
          <input name="commodity" required onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500" />
        </div>

        {/* WEIGHT & RATE */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg) *</label>
          <input type="number" name="weight" required onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expected Price *</label>
          <input type="number" name="rate" required onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500" />
        </div>

        {/* CONTAINER / PO / BOL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Container No</label>
          <input name="containerNo" onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">PO Number</label>
          <input name="poNumber" onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">BOL Number</label>
          <input name="bolNumber" onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rate Type</label>
          <input value="Flat Rate" readOnly disabled
            className="w-full px-4 py-2 bg-gray-100 text-gray-600 border rounded-md border-gray-300" />
        </div>

        {/* DATES */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Date *</label>
          <input type="date" name="pickupDate" required onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date *</label>
          <input type="date" name="deliveryDate" required onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bid Deadline *</label>
          <input type="date" name="bidDeadline" required onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500" />
        </div>

        {/* DRAYAGE EXTRA FIELDS */}
        {loadType === "DRAYAGE" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Return Date</label>
              <input type="date" name="returnDate" onChange={handleChange}
                className="w-full px-4 py-2 border rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Drayage Location</label>
              <input name="drayageLocation" onChange={handleChange}
                className="w-full px-4 py-2 border rounded-md border-gray-300 focus:ring-2 focus:ring-blue-500" />
            </div>
          </>
        )}

        {/* ACTION BUTTONS */}
        <div className="col-span-2 flex justify-end gap-4 pt-8">
          <button
            type="button"
            onClick={() => setShowLoadCreationModal(false)}
            className="px-5 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  </div>
)}





    </div>
  );
} 