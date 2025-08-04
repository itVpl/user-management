import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaArrowLeft, FaDownload } from 'react-icons/fa';
import { User, Mail, Phone, Building, FileText, CheckCircle, XCircle, Clock, PlusCircle, MapPin, Truck, Calendar, DollarSign, Search } from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

export default function DeliveryOrder() {
  const [orders, setOrders] = useState([]);
  const [viewDoc, setViewDoc] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reason, setReason] = useState('');
  const [showAddOrderForm, setShowAddOrderForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Charges popup state
  const [showChargesPopup, setShowChargesPopup] = useState(false);
  const [charges, setCharges] = useState([
    {
      name: '',
      quantity: '',
      amt: '',
      total: 0
    }
  ]);

  // Form state for Add Delivery Order
  const [formData, setFormData] = useState({
    // Customer Information - Array for multiple customers
    customers: [
      {
        billTo: '',
        dispatcherName: '',
        workOrderNo: '',
        lineHaul: '',
        fsc: '',
        other: '',
        totalAmount: 0
      }
    ],
    
    // Carrier Information
    carrierName: '',
    equipmentType: '',
    carrierFees: '',
    
    // Shipper Information
    shipperName: '',
    containerNo: '',
    containerType: '',
    weight: '',
    
    // Pickup Locations - Array for multiple locations
    pickupLocations: [
      {
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        date: ''
      }
    ],
    
    // Drop Locations - Array for multiple locations
    dropLocations: [
      {
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        date: ''
      }
    ],
    
    // General
    remarks: '',
    docs: null
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Monitor customers array to ensure it's never empty
  useEffect(() => {
    if (!formData.customers || formData.customers.length === 0) {
      console.log('Customers array is empty, adding default customer');
      setFormData(prev => ({
        ...prev,
        customers: [{
          billTo: '',
          dispatcherName: '',
          workOrderNo: '',
          lineHaul: '',
          fsc: '',
          other: '',
          totalAmount: 0
        }]
      }));
    }
  }, [formData.customers]);

  // Fetch data from API
  const fetchOrders = async () => {
      try {
        setLoading(true);
        
        // Get user data to extract empId
        const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (!userStr) {
          console.log('No user found in sessionStorage/localStorage');
          return;
        }
        
        const user = JSON.parse(userStr);
        const empId = user.empId;
        
        if (!empId) {
          console.log('No empId found in user object');
          return;
        }
        
        console.log('Fetching orders for employee:', empId);
        console.log('Fetching orders from:', `${API_CONFIG.BASE_URL}/api/v1/do/do/employee/${empId}`);
        
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/do/do/employee/${empId}`, {
          timeout: 10000, // 10 second timeout
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('API Response:', response);
        
        if (response.data && response.data.success) {
          // Transform API data to match our component structure
          const transformedOrders = response.data.data.map(order => {
            const loadNo = order.customers?.[0]?.loadNo || 'N/A';
            
            return {
              id: `DO-${order._id.slice(-6)}`, 
              doNum: loadNo, 
              clientName: order.customers?.[0]?.billTo || 'N/A',
              // clientPhone: '+1-555-0000', 
              clientEmail: `${(order.customers?.[0]?.billTo || 'customer').toLowerCase().replace(/\s+/g, '')}@example.com`, 
              pickupLocation: order.shipper?.pickUpLocations?.[0]?.name || 'Pickup Location', 
              deliveryLocation: order.shipper?.dropLocations?.[0]?.name || 'Delivery Location', 
              amount: order.customers?.[0]?.totalAmount || 0,
              description: `Load: ${loadNo}`,
              priority: 'normal', 
              status: 'pending', 
              createdAt: new Date(order.date).toISOString().split('T')[0],
              createdBy: `Employee ${order.empId || 'N/A'}`,
              docUpload: 'sample-doc.jpg',
              productName: order.shipper?.containerType || 'N/A',
              quantity: order.shipper?.weight || 0,
              remarks: order.remarks || '',
              shipperName: order.shipper?.name || 'N/A',
              carrierName: order.carrier?.carrierName || 'N/A',
              carrierFees: order.carrier?.totalCarrierFees || 0,
              createdBySalesUser: order.createdBySalesUser || 'N/A',
              supportingDocs: order.supportingDocs || []
            };
          });
          
          console.log('Transformed orders:', transformedOrders);
          setOrders(transformedOrders);
        } else {
          console.error('API response format error:', response.data);
        }
              } catch (error) {
          console.error('Error fetching orders:', error);
          console.error('Error details:', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            url: error.config?.url
          });
          
          alertify.error(`Failed to load orders: ${error.response?.status || 'Network Error'}`);
                 // Fallback to sample data if API fails
                 const sampleOrders = [
          {
            id: 'DO-001',
            doNum: 'LOAD001',
             clientName: 'MSC',
             clientPhone: '+1-555-0123',
             clientEmail: 'contact@msc.com',
             pickupLocation: 'New York, NY',
             deliveryLocation: 'Los Angeles, CA',
             amount: 13500,
             description: 'Load: LOAD001',
             priority: 'high',
             status: 'approved',
             createdAt: new Date().toISOString().split('T')[0],
             createdBy: 'Employee 1234',
             docUpload: 'sample-doc.jpg',
             productName: 'Bullets',
             quantity: 5,
             remarks: 'Good'
           }
         ];
        setOrders(sampleOrders);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusUpdate = async (status) => {
    try {
      const { id } = selectedOrder;
      // Simulate API call
      setTimeout(() => {
        setOrders(orders.map(order => 
          order.id === id ? { ...order, status } : order
        ));
        setModalType(null);
        setReason('');
        setSelectedOrder(null);
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

  // Priority color helper
  const priorityColor = (priority) => {
    if (priority === 'high') return 'bg-red-100 text-red-700';
    if (priority === 'normal') return 'bg-blue-100 text-blue-700';
    if (priority === 'low') return 'bg-gray-100 text-gray-700';
    return 'bg-gray-100 text-gray-700';
  };

  // Filter orders based on search term
  const filteredOrders = orders.filter(order =>
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.pickupLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.deliveryLocation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

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

  // Handle customer input changes
  const handleCustomerChange = (index, field, value) => {
    setFormData(prev => {
      const updatedCustomers = [...prev.customers];
      updatedCustomers[index] = {
        ...updatedCustomers[index],
        [field]: value
      };
      
      // Calculate total amount for this customer
      const lineHaul = parseInt(updatedCustomers[index].lineHaul) || 0;
      const fsc = parseInt(updatedCustomers[index].fsc) || 0;
      const other = parseInt(updatedCustomers[index].other) || 0;
      updatedCustomers[index].totalAmount = lineHaul + fsc + other;
      
      return {
        ...prev,
        customers: updatedCustomers
      };
    });
  };

  // Handle pickup location input changes
  const handlePickupLocationChange = (index, field, value) => {
    setFormData(prev => {
      const updatedPickupLocations = [...prev.pickupLocations];
      updatedPickupLocations[index] = {
        ...updatedPickupLocations[index],
        [field]: value
      };
      return {
        ...prev,
        pickupLocations: updatedPickupLocations
      };
    });
  };

  // Handle drop location input changes
  const handleDropLocationChange = (index, field, value) => {
    setFormData(prev => {
      const updatedDropLocations = [...prev.dropLocations];
      updatedDropLocations[index] = {
        ...updatedDropLocations[index],
        [field]: value
      };
      return {
        ...prev,
        dropLocations: updatedDropLocations
      };
    });
  };

  // Add new customer
  const addCustomer = () => {
    setFormData(prev => {
      const newCustomers = [...prev.customers, {
        billTo: '',
        dispatcherName: '',
        workOrderNo: '',
        lineHaul: '',
        fsc: '',
        other: '',
        totalAmount: 0
      }];
      return {
        ...prev,
        customers: newCustomers
      };
    });
  };

  // Remove customer
  const removeCustomer = (index) => {
    if (formData.customers.length > 1) {
      setFormData(prev => {
        const newCustomers = prev.customers.filter((_, i) => i !== index);
        return {
          ...prev,
          customers: newCustomers
        };
      });
    } else {
      // Show error if trying to remove the last customer
      alertify.error('At least one customer is required');
    }
  };

  // Add new pickup location
  const addPickupLocation = () => {
    setFormData(prev => ({
      ...prev,
      pickupLocations: [...prev.pickupLocations, {
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        date: ''
      }]
    }));
  };

  // Remove pickup location
  const removePickupLocation = (index) => {
    if (formData.pickupLocations.length > 1) {
      setFormData(prev => ({
        ...prev,
        pickupLocations: prev.pickupLocations.filter((_, i) => i !== index)
      }));
    }
  };

  // Add new drop location
  const addDropLocation = () => {
    setFormData(prev => ({
      ...prev,
      dropLocations: [...prev.dropLocations, {
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        date: ''
      }]
    }));
  };

  // Remove drop location
  const removeDropLocation = (index) => {
    if (formData.dropLocations.length > 1) {
      setFormData(prev => ({
        ...prev,
        dropLocations: prev.dropLocations.filter((_, i) => i !== index)
      }));
    }
  };

  // Handle file upload
  const handleFileChange = (e) => {
    setFormData(prev => ({
      ...prev,
      docs: e.target.files[0]
    }));
  };

  // Handle charges popup
  const handleChargesClick = () => {
    setShowChargesPopup(true);
  };

  // Handle charges input change
  const handleChargeChange = (index, field, value) => {
    const updatedCharges = [...charges];
    updatedCharges[index] = {
      ...updatedCharges[index],
      [field]: value
    };
    
    // Calculate total for this charge
    if (field === 'quantity' || field === 'amt') {
      const quantity = field === 'quantity' ? value : updatedCharges[index].quantity;
      const amt = field === 'amt' ? value : updatedCharges[index].amt;
      updatedCharges[index].total = (parseFloat(quantity) || 0) * (parseFloat(amt) || 0);
    }
    
    setCharges(updatedCharges);
  };

  // Add new charge
  const addCharge = () => {
    setCharges(prev => [...prev, {
      name: '',
      quantity: '',
      amt: '',
      total: 0
    }]);
  };

  // Remove charge
  const removeCharge = (index) => {
    if (charges.length > 1) {
      setCharges(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Apply charges to carrier fees
  const applyCharges = () => {
    const totalCharges = charges.reduce((sum, charge) => sum + (charge.total || 0), 0);
    setFormData(prev => ({
      ...prev,
      carrierFees: totalCharges.toString()
    }));
    setShowChargesPopup(false);
  };

  // Close charges popup
  const closeChargesPopup = () => {
    setShowChargesPopup(false);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      
      // Validate that at least one customer exists
      console.log('=== DEBUG: CUSTOMERS VALIDATION ===');
      console.log('formData.customers:', formData.customers);
      console.log('formData.customers.length:', formData.customers?.length);
      console.log('formData.customers type:', typeof formData.customers);
      console.log('=== END DEBUG ===');
      
      if (!formData.customers || formData.customers.length === 0) {
        // If somehow customers array is empty, add one customer automatically
        setFormData(prev => ({
          ...prev,
          customers: [{
            loadNo: '',
            billTo: '',
            dispatcherName: '',
            workOrderNo: '',
            lineHaul: '',
            fsc: '',
            other: '',
            totalAmount: 0
          }]
        }));
        alertify.error('At least one customer is required. Please fill in the customer details.');
        setSubmitting(false);
        return;
      }
      
      // Get user data to extract empId
      const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
      const user = JSON.parse(userStr);
      const empId = user.empId || "EMP001";
      
      // Calculate total amounts for each customer
      const customersWithTotals = formData.customers.map(customer => ({
        // Try omitting loadNo entirely since backend should auto-generate it
        billTo: customer.billTo,
        dispatcherName: customer.dispatcherName,
        workOrderNo: customer.workOrderNo,
        lineHaul: parseInt(customer.lineHaul) || 0,
        fsc: parseInt(customer.fsc) || 0,
        other: parseInt(customer.other) || 0,
        totalAmount: (parseInt(customer.lineHaul) || 0) + (parseInt(customer.fsc) || 0) + (parseInt(customer.other) || 0)
      }));

      // Additional validation after mapping
      console.log('=== DEBUG: AFTER MAPPING ===');
      console.log('customersWithTotals:', customersWithTotals);
      console.log('customersWithTotals.length:', customersWithTotals.length);
      console.log('customersWithTotals[0]:', customersWithTotals[0]);
      console.log('=== END DEBUG ===');

      // Prepare carrier data with charges array and total
      const carrierData = {
        carrierName: formData.carrierName,
        equipmentType: formData.equipmentType,
        carrierFees: charges.map(charge => ({
          name: charge.name,
          quantity: parseInt(charge.quantity) || 0,
          amount: parseInt(charge.amt) || 0,
          total: (parseFloat(charge.quantity) || 0) * (parseFloat(charge.amt) || 0)
        })),
        totalCarrierFees: charges.reduce((sum, charge) => sum + (charge.total || 0), 0)
      };

      // Prepare the data for API submission
      const submitData = {
        empId: empId,
        customers: customersWithTotals,
        carrier: carrierData,
        shipper: {
          name: formData.shipperName,
          pickUpLocations: formData.pickupLocations.map(location => ({
            name: location.name,
            address: location.address,
            city: location.city,
            state: location.state,
            zipCode: location.zipCode
          })),
          pickUpDate: formData.pickupLocations[0]?.date || '',
          containerNo: formData.containerNo,
          containerType: formData.containerType,
          weight: parseInt(formData.weight) || 0,
          dropLocations: formData.dropLocations.map(location => ({
            name: location.name,
            address: location.address,
            city: location.city,
            state: location.state,
            zipCode: location.zipCode
          })),
          dropDate: formData.dropLocations[0]?.date || ''
        },
        remarks: formData.remarks
      };

      // Submit to API
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      // Debug: Log what we're about to send
      console.log('=== DEBUG: BEFORE API CALL ===');
      console.log('customersWithTotals:', customersWithTotals);
      console.log('customersWithTotals.length:', customersWithTotals.length);
      console.log('submitData.customers:', submitData.customers);
      console.log('submitData.customers.length:', submitData.customers.length);
      console.log('formData.docs exists:', !!formData.docs);
      console.log('=== END DEBUG ===');
      
      // Create FormData if file is uploaded, otherwise use JSON
      let response; // Declare response here
      if (formData.docs) {
        const formDataToSend = new FormData();
        formDataToSend.append('empId', empId);
        
        // Send customers as individual fields for each customer
        customersWithTotals.forEach((customer, index) => {
          formDataToSend.append(`customers[${index}][billTo]`, customer.billTo);
          formDataToSend.append(`customers[${index}][dispatcherName]`, customer.dispatcherName);
          formDataToSend.append(`customers[${index}][workOrderNo]`, customer.workOrderNo);
          formDataToSend.append(`customers[${index}][lineHaul]`, customer.lineHaul);
          formDataToSend.append(`customers[${index}][fsc]`, customer.fsc);
          formDataToSend.append(`customers[${index}][other]`, customer.other);
          formDataToSend.append(`customers[${index}][totalAmount]`, customer.totalAmount);
        });
        
        // Send carrier data as individual fields
        formDataToSend.append('carrier[carrierName]', carrierData.carrierName);
        formDataToSend.append('carrier[equipmentType]', carrierData.equipmentType);
        formDataToSend.append('carrier[totalCarrierFees]', carrierData.totalCarrierFees);
        
        // Send carrier fees as individual fields
        carrierData.carrierFees.forEach((fee, index) => {
          formDataToSend.append(`carrier[carrierFees][${index}][name]`, fee.name);
          formDataToSend.append(`carrier[carrierFees][${index}][quantity]`, fee.quantity);
          formDataToSend.append(`carrier[carrierFees][${index}][amount]`, fee.amount);
          formDataToSend.append(`carrier[carrierFees][${index}][total]`, fee.total);
        });
        
        // Send shipper data as individual fields
        formDataToSend.append('shipper[name]', formData.shipperName);
        formDataToSend.append('shipper[pickUpDate]', formData.pickupLocations[0]?.date || '');
        formDataToSend.append('shipper[containerNo]', formData.containerNo);
        formDataToSend.append('shipper[containerType]', formData.containerType);
        formDataToSend.append('shipper[weight]', parseInt(formData.weight) || 0);
        formDataToSend.append('shipper[dropDate]', formData.dropLocations[0]?.date || '');
        
        // Send pickup locations as individual fields
        formData.pickupLocations.forEach((location, index) => {
          formDataToSend.append(`shipper[pickUpLocations][${index}][name]`, location.name);
          formDataToSend.append(`shipper[pickUpLocations][${index}][address]`, location.address);
          formDataToSend.append(`shipper[pickUpLocations][${index}][city]`, location.city);
          formDataToSend.append(`shipper[pickUpLocations][${index}][state]`, location.state);
          formDataToSend.append(`shipper[pickUpLocations][${index}][zipCode]`, location.zipCode);
        });
        
        // Send drop locations as individual fields
        formData.dropLocations.forEach((location, index) => {
          formDataToSend.append(`shipper[dropLocations][${index}][name]`, location.name);
          formDataToSend.append(`shipper[dropLocations][${index}][address]`, location.address);
          formDataToSend.append(`shipper[dropLocations][${index}][city]`, location.city);
          formDataToSend.append(`shipper[dropLocations][${index}][state]`, location.state);
          formDataToSend.append(`shipper[dropLocations][${index}][zipCode]`, location.zipCode);
        });
        
        formDataToSend.append('remarks', formData.remarks);
        formDataToSend.append('document', formData.docs);
        
        // Debug: Log FormData contents
        console.log('=== DEBUG: FormData being sent ===');
        console.log('FormData entries:');
        for (let [key, value] of formDataToSend.entries()) {
          console.log(`${key} : ${value}`);
        }
        console.log('=== END DEBUG ===');
        
        response = await axios.post(`${API_CONFIG.BASE_URL}/api/v1/do/do`, formDataToSend, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        // Debug: Log JSON payload
        console.log('=== DEBUG: JSON payload being sent ===');
        console.log('submitData:', submitData);
        console.log('submitData.customers:', submitData.customers);
        console.log('submitData.customers.length:', submitData.customers.length);
        console.log('=== END DEBUG ===');
        
        response = await axios.post(`${API_CONFIG.BASE_URL}/api/v1/do/do`, submitData, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      }

      if (response.data.success) {
        // Add the new order to the existing orders list
        const loadNo = response.data.data.customers?.[0]?.loadNo || 'N/A';
        
        const newOrder = {
          id: `DO-${response.data.data._id.slice(-6)}`,
          doNum: loadNo,
          clientName: response.data.data.customers?.[0]?.billTo || 'N/A',
          clientPhone: '+1-555-0000',
          clientEmail: `${(response.data.data.customers?.[0]?.billTo || 'customer').toLowerCase().replace(/\s+/g, '')}@example.com`,
          pickupLocation: response.data.data.shipper?.pickUpLocations?.[0]?.name || 'Pickup Location',
          deliveryLocation: response.data.data.shipper?.dropLocations?.[0]?.name || 'Delivery Location',
          amount: response.data.data.customers?.[0]?.totalAmount || 0,
          description: `Load: ${loadNo}`,
          priority: 'normal',
          status: 'pending',
          createdAt: new Date(response.data.data.date).toISOString().split('T')[0],
          createdBy: `Employee ${response.data.data.empId}`,
          docUpload: formData.docs ? formData.docs.name : 'sample-doc.jpg',
          productName: response.data.data.shipper?.containerType || 'N/A',
          quantity: response.data.data.shipper?.weight || 0,
          remarks: response.data.data.remarks || '',
          shipperName: response.data.data.shipper?.name || 'N/A',
          carrierName: response.data.data.carrier?.carrierName || 'N/A',
          carrierFees: response.data.data.carrier?.totalCarrierFees || 0,
          createdBySalesUser: response.data.data.createdBySalesUser || 'N/A',
          supportingDocs: response.data.data.supportingDocs || []
        };

        setOrders(prevOrders => [newOrder, ...prevOrders]);
        
        // Close modal and reset form
        setShowAddOrderForm(false);
        setFormData({
          // Customer Information - Array for multiple customers
          customers: [
            {
              billTo: '',
              dispatcherName: '',
              workOrderNo: '',
              lineHaul: '',
              fsc: '',
              other: '',
              totalAmount: 0
            }
          ],
          
          // Carrier Information
          carrierName: '',
          equipmentType: '',
          carrierFees: '',
          
          // Shipper Information
          shipperName: '',
          containerNo: '',
          containerType: '',
          weight: '',
          
          // Pickup Locations - Array for multiple locations
          pickupLocations: [
            {
              name: '',
              address: '',
              city: '',
              state: '',
              zipCode: '',
              date: ''
            }
          ],
          
          // Drop Locations - Array for multiple locations
          dropLocations: [
            {
              name: '',
              address: '',
              city: '',
              state: '',
              zipCode: '',
              date: ''
            }
          ],
          
          // General
          remarks: '',
          docs: null
        });

        // Show success message (you can add a toast notification here)
        alertify.success('✅ Delivery order created successfully!');
      } else {
        alertify.error('Failed to create delivery order. Please try again.');
      }
    } catch (error) {
      console.error('Error creating delivery order:', error);
      
      // Enhanced error logging
      if (error.response) {
        console.error('API Error Response:', error.response.data);
        console.error('API Error Status:', error.response.status);
        console.error('API Error Headers:', error.response.headers);
        
        // Show specific error message from API
        if (error.response.data && error.response.data.message) {
          alertify.error(`API Error: ${error.response.data.message}`);
        } else {
          alertify.error(`API Error: ${error.response.status} - ${error.response.statusText}`);
        }
      } else if (error.request) {
        console.error('Network Error:', error.request);
        alertify.error('Network error. Please check your connection and try again.');
      } else {
        console.error('Other Error:', error.message);
        alertify.error('Error creating delivery order. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form when modal closes
  const handleCloseModal = () => {
    setShowAddOrderForm(false);
    setFormData({
      // Customer Information - Array for multiple customers
              customers: [
          {
            loadNo: '', // Try empty string instead of null
            billTo: '',
            dispatcherName: '',
            workOrderNo: '',
            lineHaul: '',
            fsc: '',
            other: '',
            totalAmount: 0
          }
        ],
      
      // Carrier Information
      carrierName: '',
      equipmentType: '',
      carrierFees: '',
      
      // Shipper Information
      shipperName: '',
      containerNo: '',
      containerType: '',
      weight: '',
      
      // Pickup Locations - Array for multiple locations
      pickupLocations: [
        {
          name: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          date: ''
        }
      ],
      
      // Drop Locations - Array for multiple locations
      dropLocations: [
        {
          name: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          date: ''
        }
      ],
      
      // General
      remarks: '',
      docs: null
    });
    
    // Reset charges state
    setCharges([
      {
        name: '',
        quantity: '',
        amt: '',
        total: 0
      }
    ]);
    setShowChargesPopup(false);
  };

  // Handle view order details
  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  // Handle view employee data API call
  const handleViewEmployeeData = async (empId) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/do/do/employee/${empId}`,
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        console.log('Employee DO Data:', response.data);
        alertify.success('✅ Employee DO data fetched successfully!');
        
        // Take the first delivery order from the response data
        if (response.data.data && response.data.data.length > 0) {
          const employeeOrder = response.data.data[0];
          setSelectedOrder(employeeOrder);
          setShowOrderModal(true);
        } else {
          alertify.warning('No delivery orders found for this employee');
        }
      } else {
        alertify.error('Failed to fetch employee DO data');
      }
    } catch (error) {
      console.error('Error fetching employee DO data:', error);
      if (error.response) {
        alertify.error(`API Error: ${error.response.data.message || 'Failed to fetch data'}`);
      } else {
        alertify.error('Network error. Please check your connection and try again.');
      }
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading delivery orders...</p>
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
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-xl font-bold text-gray-800">{orders.length}</p>
                </div>
              </div>
            </div>
            {/* <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Approved</p>
                  <p className="text-xl font-bold text-blue-600">{orders.filter(order => order.status === 'approved').length}</p>
                </div>
              </div>
            </div> */}
            {/* <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Clock className="text-yellow-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-xl font-bold text-yellow-600">{orders.filter(order => order.status === 'pending').length}</p>
                </div>
              </div>
            </div> */}
            <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Calendar className="text-purple-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Today</p>
                  <p className="text-xl font-bold text-purple-600">{orders.filter(order => order.createdAt === new Date().toISOString().split('T')[0]).length}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowAddOrderForm(true)}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white font-semibold shadow hover:from-blue-600 hover:to-blue-700 transition"
            >
              <PlusCircle size={20} /> Add Delivery Order
            </button>
          </div>
        </div>

        {/* API Error Display */}
        {/* The custom error box UI for API errors is removed as per the edit hint. */}

        {viewDoc && selectedOrder ? (
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
              href={`${API_CONFIG.BASE_URL}/${selectedOrder.docUpload}`}
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
                <h3 className="text-lg font-bold text-green-700">Order Info</h3>
              </div>
              <div className="flex items-center gap-2 text-gray-700"><User size={16} /> <span className="font-medium">Client:</span> {selectedOrder.clientName}</div>
              <div className="flex items-center gap-2 text-gray-700"><FileText size={16} /> <span className="font-medium">DO ID:</span> {selectedOrder.id}</div>
              <div className="flex items-center gap-2 text-gray-700"><Mail size={16} /> <span className="font-medium">Email:</span> {selectedOrder.clientEmail}</div>
              <div className="flex items-center gap-2 text-gray-700"><Phone size={16} /> <span className="font-medium">Phone:</span> {selectedOrder.clientPhone}</div>
              <div className="flex items-center gap-2 text-gray-700"><Truck size={16} /> <span className="font-medium">Product:</span> {selectedOrder.productName}</div>
              <div className="flex items-center gap-2 text-gray-700"><DollarSign size={16} /> <span className="font-medium">Amount:</span> ${(selectedOrder.amount || 0).toLocaleString()}</div>
              <div className="flex items-center gap-2 text-gray-700"><Calendar size={16} /> <span className="font-medium">Created:</span> {selectedOrder.createdAt}</div>
              <div className="flex items-center gap-2 text-gray-700"><FileText size={16} /> <span className="font-medium">Details:</span> {selectedOrder.description}</div>
              {selectedOrder.remarks && (
                <div className="flex items-center gap-2 text-gray-700"><FileText size={16} /> <span className="font-medium">Remarks:</span> {selectedOrder.remarks}</div>
              )}
              <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mt-2 ${statusColor(selectedOrder.status)}`}>
                {selectedOrder.status === 'approved' && <CheckCircle size={14} />}
                {selectedOrder.status === 'rejected' && <XCircle size={14} />}
                {selectedOrder.status === 'pending' && <Clock size={14} />}
                {selectedOrder.status || 'Pending'}
              </div>
            </div>
            <div className="flex flex-col items-center justify-center">
              <img
                src={`${API_CONFIG.BASE_URL}/${selectedOrder.docUpload}`}
                alt="Uploaded Doc"
                className="rounded-xl shadow-lg max-h-[250px] w-full object-contain border border-green-100 cursor-pointer hover:scale-105 transition"
                onClick={() => setPreviewImg(`${API_CONFIG.BASE_URL}/${selectedOrder.docUpload}`)}
              />
              <div className="text-xs text-gray-400 mt-2">Click image to preview</div>
            </div>
          </div>

          {/* Uploaded Files Section */}
          {selectedOrder.uploadedFiles && selectedOrder.uploadedFiles.length > 0 && (
            <div className="mt-8 border rounded-2xl p-6 bg-gradient-to-br from-blue-50 to-white shadow">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="text-blue-500" size={20} />
                <h3 className="text-lg font-bold text-blue-700">Uploaded Files</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedOrder.uploadedFiles.map((file, index) => (
                  <div key={index} className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="text-blue-600" size={16} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 truncate">{file.fileName}</div>
                        <div className="text-xs text-gray-500">{file.fileType}</div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar size={12} />
                        <span>Uploaded: {new Date(file.uploadDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 bg-blue-500 text-white text-center py-2 px-3 rounded-lg hover:bg-blue-600 transition text-xs font-medium"
                        >
                          View File
                        </a>
                        <a
                          href={file.fileUrl}
                          download={file.fileName}
                          className="bg-green-500 text-white py-2 px-3 rounded-lg hover:bg-green-600 transition text-xs font-medium"
                        >
                          Download
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
                              <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                <tr>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">DO ID</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Load Num</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">BILL TO</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">SHIPPER NAME</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">CARRIER NAME</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">CARRIER FEES</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">CREATED BY</th>
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {currentOrders.map((order, index) => (
                  <tr key={order.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{order.id}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-mono text-base font-semibold text-gray-700">{order.doNum}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{order.clientName}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{order.shipperName}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{order.carrierName}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">${order.carrierFees || 0}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{order.createdBySalesUser?.employeeName || order.createdBySalesUser || 'N/A'}</span>
                    </td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => handleViewEmployeeData(order.createdBySalesUser?.empId || '1234')}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {searchTerm ? 'No orders found matching your search' : 'No delivery orders found'}
              </p>
              <p className="text-gray-400 text-sm">
                {searchTerm ? 'Try adjusting your search terms' : 'Create your first delivery order to get started'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && filteredOrders.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} orders
            {searchTerm && ` (filtered from ${orders.length} total)`}
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

      {/* Add Delivery Order Modal */}
      {showAddOrderForm && (
        <div className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex justify-center items-center p-4">
          {/* Hide scrollbar for modal content */}
          <style>{`
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
          `}</style>
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto hide-scrollbar"
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
                    <h2 className="text-xl font-bold">Add Delivery Order</h2>
                    <p className="text-blue-100">Create a new delivery order</p>
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
               {/* Customer Information Section */}
               <div className="bg-blue-50 p-4 rounded-lg">
                 <div className="flex justify-between items-center mb-4">
                   <h3 className="text-lg font-semibold text-blue-800">Customer Information</h3>
                   <button
                     type="button"
                     onClick={addCustomer}
                     className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition"
                   >
                     + Add Customer
                   </button>
                 </div>
                 
                 {formData.customers.map((customer, customerIndex) => (
                   <div key={customerIndex} className="bg-white p-4 rounded-lg mb-4">
                     <div className="flex justify-between items-center mb-3">
                       <h4 className="text-md font-semibold text-gray-800">Customer {customerIndex + 1}</h4>
                       {formData.customers.length > 1 && (
                         <button
                           type="button"
                           onClick={() => removeCustomer(customerIndex)}
                           className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition"
                         >
                           Remove
                         </button>
                       )}
                     </div>
                     
                      {/* All 7 fields in one grid - 4 fields per line */}
                      <div className="grid grid-cols-4 gap-4">
                        <input
                          type="text"
                          value={customer.billTo}
                          onChange={(e) => handleCustomerChange(customerIndex, 'billTo', e.target.value)}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Bill To *"
                        />
                        <input
                          type="text"
                          value={customer.dispatcherName}
                          onChange={(e) => handleCustomerChange(customerIndex, 'dispatcherName', e.target.value)}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Dispatcher Name *"
                        />
                        <input
                          type="text"
                          value={customer.workOrderNo}
                          onChange={(e) => handleCustomerChange(customerIndex, 'workOrderNo', e.target.value)}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Work Order No *"
                        />
                        <input
                          type="number"
                          value={customer.lineHaul}
                          onChange={(e) => handleCustomerChange(customerIndex, 'lineHaul', e.target.value)}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Line Haul *"
                        />
                        <input
                          type="number"
                          value={customer.fsc}
                          onChange={(e) => handleCustomerChange(customerIndex, 'fsc', e.target.value)}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="FSC *"
                        />
                        <input
                          type="number"
                          value={customer.other}
                          onChange={(e) => handleCustomerChange(customerIndex, 'other', e.target.value)}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Other *"
                        />
                        <div className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg">
                          <span className="text-gray-700 font-medium">Total: ${customer.totalAmount.toLocaleString()}</span>
                        </div>
                      </div>
                   </div>
                 ))}
               </div>

               {/* Carrier Information Section */}
               <div className="bg-green-50 p-4 rounded-lg">
                 <h3 className="text-lg font-semibold text-green-800 mb-4">Carrier (Trucker) Information</h3>
                 <div className="grid grid-cols-3 gap-4">
                   <input
                     type="text"
                     name="carrierName"
                     value={formData.carrierName}
                     onChange={handleInputChange}
                     required
                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                     placeholder="Carrier Name *"
                   />
                   <input
                     type="text"
                     name="equipmentType"
                     value={formData.equipmentType}
                     onChange={handleInputChange}
                     required
                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                     placeholder="Equipment Type *"
                   />
                   <input
                     type="number"
                     name="carrierFees"
                     value={formData.carrierFees}
                     onChange={handleInputChange}
                     onClick={handleChargesClick}
                     required
                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent cursor-pointer"
                     placeholder="Carrier Fees * (Click to add charges)"
                     readOnly
                   />
                 </div>
               </div>

               {/* Shipper Information Section */}
               <div className="bg-purple-50 p-4 rounded-lg">
                 <h3 className="text-lg font-semibold text-purple-800 mb-4">Shipper Information</h3>
                 
                 {/* Shipper Basic Info */}
                 <div className="grid grid-cols-4 gap-4 mb-4">
                   <input
                     type="text"
                     name="shipperName"
                     value={formData.shipperName}
                     onChange={handleInputChange}
                     required
                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                     placeholder="Shipper Name *"
                   />
                   <input
                     type="text"
                     name="containerNo"
                     value={formData.containerNo}
                     onChange={handleInputChange}
                     required
                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                     placeholder="Container No *"
                   />
                   <input
                     type="text"
                     name="containerType"
                     value={formData.containerType}
                     onChange={handleInputChange}
                     required
                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                     placeholder="Container Type *"
                   />
                   <input
                     type="number"
                     name="weight"
                     value={formData.weight}
                     onChange={handleInputChange}
                     required
                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                     placeholder="Weight (lbs) *"
                   />
                 </div>

                 {/* Pickup Locations */}
                 <div className="bg-white p-4 rounded-lg mb-4">
                   <div className="flex justify-between items-center mb-3">
                     <h4 className="text-md font-semibold text-gray-800">Pickup Locations</h4>
                     <button
                       type="button"
                       onClick={addPickupLocation}
                       className="px-3 py-1 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition"
                     >
                       + Add Location
                     </button>
                   </div>
                   
                   {formData.pickupLocations.map((location, locationIndex) => (
                     <div key={locationIndex} className="bg-gray-50 p-4 rounded-lg mb-3">
                       <div className="flex justify-between items-center mb-3">
                         <h5 className="text-sm font-semibold text-gray-700">Pickup Location {locationIndex + 1}</h5>
                         {formData.pickupLocations.length > 1 && (
                           <button
                             type="button"
                             onClick={() => removePickupLocation(locationIndex)}
                             className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition"
                           >
                             Remove
                           </button>
                         )}
                       </div>
                       
                       <div className="grid grid-cols-3 gap-4">
                         <input
                           type="text"
                           value={location.name}
                           onChange={(e) => handlePickupLocationChange(locationIndex, 'name', e.target.value)}
                           required
                           className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                           placeholder="Location Name *"
                         />
                         <input
                           type="text"
                           value={location.address}
                           onChange={(e) => handlePickupLocationChange(locationIndex, 'address', e.target.value)}
                           required
                           className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                           placeholder="Address *"
                         />
                         <input
                           type="text"
                           value={location.city}
                           onChange={(e) => handlePickupLocationChange(locationIndex, 'city', e.target.value)}
                           required
                           className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                           placeholder="City *"
                         />
                         <input
                           type="text"
                           value={location.state}
                           onChange={(e) => handlePickupLocationChange(locationIndex, 'state', e.target.value)}
                           required
                           className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                           placeholder="State *"
                         />
                         <input
                           type="text"
                           value={location.zipCode}
                           onChange={(e) => handlePickupLocationChange(locationIndex, 'zipCode', e.target.value)}
                           required
                           className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                           placeholder="Zip Code *"
                         />
                         <input
                           type="datetime-local"
                           value={location.date}
                           onChange={(e) => handlePickupLocationChange(locationIndex, 'date', e.target.value)}
                           required
                           className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                         />
                       </div>
                     </div>
                   ))}
                 </div>

                 {/* Drop Locations */}
                 <div className="bg-white p-4 rounded-lg">
                   <div className="flex justify-between items-center mb-3">
                     <h4 className="text-md font-semibold text-gray-800">Drop Locations</h4>
                     <button
                       type="button"
                       onClick={addDropLocation}
                       className="px-3 py-1 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition"
                     >
                       + Add Location
                     </button>
                   </div>
                   
                   {formData.dropLocations.map((location, locationIndex) => (
                     <div key={locationIndex} className="bg-gray-50 p-4 rounded-lg mb-3">
                       <div className="flex justify-between items-center mb-3">
                         <h5 className="text-sm font-semibold text-gray-700">Drop Location {locationIndex + 1}</h5>
                         {formData.dropLocations.length > 1 && (
                           <button
                             type="button"
                             onClick={() => removeDropLocation(locationIndex)}
                             className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition"
                           >
                             Remove
                           </button>
                         )}
                       </div>
                       
                       <div className="grid grid-cols-3 gap-4">
                         <input
                           type="text"
                           value={location.name}
                           onChange={(e) => handleDropLocationChange(locationIndex, 'name', e.target.value)}
                           required
                           className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                           placeholder="Location Name *"
                         />
                         <input
                           type="text"
                           value={location.address}
                           onChange={(e) => handleDropLocationChange(locationIndex, 'address', e.target.value)}
                           required
                           className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                           placeholder="Address *"
                         />
                         <input
                           type="text"
                           value={location.city}
                           onChange={(e) => handleDropLocationChange(locationIndex, 'city', e.target.value)}
                           required
                           className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                           placeholder="City *"
                         />
                         <input
                           type="text"
                           value={location.state}
                           onChange={(e) => handleDropLocationChange(locationIndex, 'state', e.target.value)}
                           required
                           className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                           placeholder="State *"
                         />
                         <input
                           type="text"
                           value={location.zipCode}
                           onChange={(e) => handleDropLocationChange(locationIndex, 'zipCode', e.target.value)}
                           required
                           className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                           placeholder="Zip Code *"
                         />
                         <input
                           type="datetime-local"
                           value={location.date}
                           onChange={(e) => handleDropLocationChange(locationIndex, 'date', e.target.value)}
                           required
                           className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                         />
                       </div>  
                     </div>
                   ))}
                 </div>
               </div>

                {/* Document Upload */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Document Upload</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-center w-full">
                      <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                          </svg>
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">PDF, DOC, DOCX, JPG, PNG (MAX. 10MB)</p>
                        </div>
                        <input 
                          id="file-upload" 
                          type="file" 
                          className="hidden" 
                          onChange={handleFileChange}
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        />
                      </label>
                    </div>
                    {formData.docs && (
                      <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{formData.docs.name}</p>
                            <p className="text-xs text-gray-500">{(formData.docs.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, docs: null }))}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
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
                    'Create Delivery Order'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee DO Data Modal */}
      {showOrderModal && selectedOrder && (
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
                    <Truck className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Employee DO Data</h2>
                    <p className="text-blue-100">Delivery Order Details</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Order Information */}
              {/* <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Building className="text-blue-600" size={20} />
                  <h3 className="text-lg font-bold text-gray-800">Order Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <FileText className="text-blue-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">DO ID</p>
                      <p className="font-semibold text-gray-800">{selectedOrder.id || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <FileText className="text-green-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">DO Number</p>
                      <p className="font-semibold text-gray-800">{selectedOrder.doNum || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <User className="text-purple-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Bill To</p>
                      <p className="font-semibold text-gray-800">{selectedOrder.clientName || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <Truck className="text-orange-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Shipper Name</p>
                      <p className="font-semibold text-gray-800">{selectedOrder.shipperName || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <Truck className="text-red-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Carrier Name</p>
                      <p className="font-semibold text-gray-800">{selectedOrder.carrierName || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <DollarSign className="text-green-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Carrier Fees</p>
                      <p className="font-semibold text-gray-800">${selectedOrder.carrierFees || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <Calendar className="text-gray-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Created Date</p>
                      <p className="font-semibold text-gray-800">
                        {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="text-blue-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Created By</p>
                      <p className="font-semibold text-gray-800">{selectedOrder.createdBySalesUser?.employeeName || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div> */}

              {/* Customer Information */}
              {selectedOrder.customers && selectedOrder.customers.length > 0 && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="text-green-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Customer Information</h3>
                  </div>
                  <div className="space-y-4">
                    {selectedOrder.customers.map((customer, index) => (
                      <div key={index} className="bg-white rounded-xl p-4 border border-green-200">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 font-bold text-sm">{index + 1}</span>
                          </div>
                          <h4 className="font-semibold text-gray-800">Customer {index + 1}</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Bill To</p>
                            <p className="font-medium text-gray-800">{customer.billTo || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Dispatcher Name</p>
                            <p className="font-medium text-gray-800">{customer.dispatcherName || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Work Order No</p>
                            <p className="font-medium text-gray-800">{customer.workOrderNo || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Line Haul</p>
                            <p className="font-medium text-gray-800">${customer.lineHaul || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">FSC</p>
                            <p className="font-medium text-gray-800">${customer.fsc || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Other</p>
                            <p className="font-medium text-gray-800">${customer.other || 0}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-sm text-gray-600">Total Amount</p>
                            <p className="font-bold text-lg text-green-600">${customer.totalAmount || 0}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Carrier Information */}
              {selectedOrder.carrier && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Truck className="text-purple-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Carrier Information</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <Truck className="text-purple-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Carrier Name</p>
                        <p className="font-semibold text-gray-800">{selectedOrder.carrier.carrierName || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                        <Truck className="text-pink-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Equipment Type</p>
                        <p className="font-semibold text-gray-800">{selectedOrder.carrier.equipmentType || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <DollarSign className="text-green-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Carrier Fees</p>
                        <p className="font-semibold text-gray-800">${selectedOrder.carrier.totalCarrierFees || 0}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Carrier Charges */}
                  {selectedOrder.carrier.carrierFees && selectedOrder.carrier.carrierFees.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Carrier Charges</h4>
                      <div className="space-y-2">
                        {selectedOrder.carrier.carrierFees.map((charge, index) => (
                          <div key={index} className="bg-white rounded-lg p-3 border border-purple-200">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-800">{charge.name}</span>
                              <span className="font-bold text-green-600">${charge.total}</span>
                            </div>
                            <div className="text-sm text-gray-500">
                              Quantity: {charge.quantity} × Amount: ${charge.amount}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Shipper Information */}
              {selectedOrder.shipper && (
                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Truck className="text-orange-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Shipper Information</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <User className="text-orange-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Shipper Name</p>
                        <p className="font-semibold text-gray-800">{selectedOrder.shipper.name || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Calendar className="text-yellow-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Pickup Date</p>
                        <p className="font-semibold text-gray-800">
                          {selectedOrder.shipper.pickUpDate ? new Date(selectedOrder.shipper.pickUpDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <FileText className="text-blue-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Container No</p>
                        <p className="font-semibold text-gray-800">{selectedOrder.shipper.containerNo || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <Truck className="text-green-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Container Type</p>
                        <p className="font-semibold text-gray-800">{selectedOrder.shipper.containerType || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 font-bold text-sm">W</span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Weight</p>
                        <p className="font-semibold text-gray-800">{selectedOrder.shipper.weight || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <Calendar className="text-red-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Drop Date</p>
                        <p className="font-semibold text-gray-800">
                          {selectedOrder.shipper.dropDate ? new Date(selectedOrder.shipper.dropDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pickup Locations */}
                  {selectedOrder.shipper.pickUpLocations && selectedOrder.shipper.pickUpLocations.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Pickup Locations</h4>
                      <div className="space-y-3">
                        {selectedOrder.shipper.pickUpLocations.map((location, index) => (
                          <div key={index} className="bg-white rounded-lg p-3 border border-orange-200">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-600">Name</p>
                                <p className="font-medium text-gray-800">{location.name || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Address</p>
                                <p className="font-medium text-gray-800">{location.address || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">City</p>
                                <p className="font-medium text-gray-800">{location.city || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">State</p>
                                <p className="font-medium text-gray-800">{location.state || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Zip Code</p>
                                <p className="font-medium text-gray-800">{location.zipCode || 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Drop Locations */}
                  {selectedOrder.shipper.dropLocations && selectedOrder.shipper.dropLocations.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Drop Locations</h4>
                      <div className="space-y-3">
                        {selectedOrder.shipper.dropLocations.map((location, index) => (
                          <div key={index} className="bg-white rounded-lg p-3 border border-yellow-200">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-600">Name</p>
                                <p className="font-medium text-gray-800">{location.name || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Address</p>
                                <p className="font-medium text-gray-800">{location.address || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">City</p>
                                <p className="font-medium text-gray-800">{location.city || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">State</p>
                                <p className="font-medium text-gray-800">{location.state || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Zip Code</p>
                                <p className="font-medium text-gray-800">{location.zipCode || 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Remarks */}
              {selectedOrder.remarks && (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="text-gray-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Remarks</h3>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-gray-800">{selectedOrder.remarks}</p>
                  </div>
                </div>
              )}

              {/* Uploaded Files */}
              {selectedOrder.uploadedFiles && selectedOrder.uploadedFiles.length > 0 && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="text-blue-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Uploaded Files</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedOrder.uploadedFiles.map((file, index) => (
                      <div key={index} className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="text-blue-600" size={16} />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-800 truncate">{file.fileName}</div>
                            <div className="text-xs text-gray-500">{file.fileType}</div>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar size={12} />
                            <span>Uploaded: {new Date(file.uploadDate).toLocaleDateString()}</span>
                          </div>
                          <div className="flex gap-2">
                            <a
                              href={file.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 bg-blue-500 text-white text-center py-2 px-3 rounded-lg hover:bg-blue-600 transition text-xs font-medium"
                            >
                              View File
                            </a>
                            <a
                              href={file.fileUrl}
                              download={file.fileName}
                              className="bg-green-500 text-white py-2 px-3 rounded-lg hover:bg-green-600 transition text-xs font-medium"
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Charges Popup */}
      {showChargesPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-8 w-full max-w-5xl max-h-[85vh] overflow-y-auto">
            {/* Header with gradient background */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 -m-8 mb-6 p-6 rounded-t-xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Charges Calculator</h2>
                </div>
                <button
                  onClick={closeChargesPopup}
                  className="text-white hover:text-gray-200 transition-colors p-2 rounded-full hover:bg-white hover:bg-opacity-20"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Charges Table Header */}
              <div className="grid grid-cols-5 gap-4 bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl font-semibold text-gray-700 border border-gray-200">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Name</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">#</span>
                  <span>Quantity</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span>Amount</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">$</span>
                  <span>Total</span>
                </div>
                <div className="text-center">Action</div>
              </div>

              {/* Charges Rows */}
              {charges.map((charge, index) => (
                <div key={index} className="grid grid-cols-5 gap-4 items-center p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <input
                    type="text"
                    value={charge.name}
                    onChange={(e) => handleChargeChange(index, 'name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter charge name"
                  />
                  <input
                    type="number"
                    value={charge.quantity}
                    onChange={(e) => handleChargeChange(index, 'quantity', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="0"
                  />
                  <input
                    type="number"
                    value={charge.amt}
                    onChange={(e) => handleChargeChange(index, 'amt', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="0.00"
                  />
                  <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg font-semibold text-gray-800 border border-green-200">
                    ${charge.total.toFixed(2)}
                  </div>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => removeCharge(index)}
                      disabled={charges.length === 1}
                      className={`p-2 rounded-full transition-all ${
                        charges.length === 1 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-red-100 text-red-500 hover:bg-red-200 hover:text-red-700'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {/* Add Charge Button */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={addCharge}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span className="font-semibold">Add New Charge</span>
                </button>
              </div>

              {/* Total and Apply Button */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-xl border border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-500 p-3 rounded-lg">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 font-medium">Total Charges</div>
                      <div className="text-2xl font-bold text-gray-800">
                        ${charges.reduce((sum, charge) => sum + (charge.total || 0), 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={closeChargesPopup}
                      className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={applyCharges}
                      className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      Apply to Carrier Fees
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 