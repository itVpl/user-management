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
  const [viewLoading, setViewLoading] = useState(false);
  const [loadingOrderId, setLoadingOrderId] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [carrierFeesJustUpdated, setCarrierFeesJustUpdated] = useState(false);
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [dispatchers, setDispatchers] = useState([]);
  const [loadingDispatchers, setLoadingDispatchers] = useState(false);

  // Reset customer name input when selectedOrder changes
  useEffect(() => {
    if (selectedOrder) {
      console.log('Selected order changed, customer name:', selectedOrder.customerName);
      setCustomerNameInput(selectedOrder.customerName || '');
    }
  }, [selectedOrder]);

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
            originalId: order._id, // Store the full original _id
            doNum: loadNo,
            clientName: order.customers?.[0]?.billTo || 'N/A',
            // clientPhone: '+1-555-0000', 
            clientEmail: `${(order.customers?.[0]?.billTo || 'customer').toLowerCase().replace(/\s+/g, '')}@example.com`,
            pickupLocation: order.shipper?.pickUpLocations?.[0]?.name || 'Pickup Location',
            deliveryLocation: order.shipper?.dropLocations?.[0]?.name || 'Delivery Location',
            amount: order.customers?.[0]?.totalAmount || 0,
            description: `Load: ${loadNo}`,
            priority: 'normal',
            status: order.status || 'open',
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

  // Fetch dispatchers from CMT department
  const fetchDispatchers = async () => {
    try {
      setLoadingDispatchers(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/inhouseUser/department/CMT`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data && response.data.employees) {
        // Filter only active employees
        const activeEmployees = response.data.employees.filter(emp => emp.status === 'active');
        setDispatchers(activeEmployees);
        console.log('Dispatchers loaded:', activeEmployees);
      } else {
        console.error('No employees data in response');
        setDispatchers([]);
      }
    } catch (error) {
      console.error('Error fetching dispatchers:', error);
      alertify.error('Failed to load dispatchers');
      setDispatchers([]);
    } finally {
      setLoadingDispatchers(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchDispatchers(); // Also fetch dispatchers when component mounts
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
    console.log('Charges popup opened, current charges state:', charges);
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
  const applyCharges = async () => {
    const totalCharges = charges.reduce((sum, charge) => sum + (charge.total || 0), 0);
    setFormData(prev => ({
      ...prev,
      carrierFees: totalCharges.toString()
    }));

    // Also update the charges state to ensure it's properly set for updates
    console.log('Applying charges:', charges);
    console.log('Total charges:', totalCharges);

    // If we're in edit mode, immediately update the carrier fees
    if (editingOrder && editingOrder._id) {
      try {
        const carrierFeesData = charges.filter(charge => charge.name && charge.quantity && charge.amt).map(charge => ({
          name: charge.name,
          quantity: parseInt(charge.quantity) || 0,
          amount: parseInt(charge.amt) || 0,
          total: parseInt(charge.total) || 0
        }));

        console.log('Updating carrier fees immediately:', carrierFeesData);

        const result = await updateCarrierFees(editingOrder._id, carrierFeesData);
        if (result) {
          alertify.success('Carrier fees updated successfully!');
          setCarrierFeesJustUpdated(true); // Set flag to prevent duplicate alerts
        }
      } catch (error) {
        console.error('Error updating carrier fees:', error);
        alertify.error('Failed to update carrier fees');
      }
    }

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
  const handleViewOrder = async (order) => {
    try {
      const orderId = order.originalId || order._id || order.id;
      setLoadingOrderId(orderId);
      console.log('Viewing order:', order);
      
      // Get the original ID for API call
      const originalId = order.originalId || order._id || order.id.replace('DO-', '');
      console.log('Original ID for API call:', originalId);
      
      // Fetch complete order data from API
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const apiUrl = `${API_CONFIG.BASE_URL}/api/v1/do/do/${originalId}`;
      console.log('Fetching order details from:', apiUrl);
      
      const response = await axios.get(apiUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.success) {
        const completeOrderData = response.data.data;
        console.log('Complete order data from API:', completeOrderData);
        
        // Set the complete order data
        setSelectedOrder(completeOrderData);
        setCustomerNameInput(completeOrderData.customers?.[0]?.billTo || '');
        setShowOrderModal(true);
        
        alertify.success('✅ Order details loaded successfully!');
      } else {
        console.error('API response format error:', response.data);
        alertify.error('Failed to load order details');
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      if (error.response) {
        alertify.error(`API Error: ${error.response.data.message || 'Failed to fetch order details'}`);
      } else {
        alertify.error('Network error. Please check your connection and try again.');
      }
    } finally {
      setLoadingOrderId(null);
    }
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
          setCustomerNameInput(employeeOrder.customerName || '');
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

  // Handle edit order
  const handleEditOrder = async (order) => {
    try {
      console.log('Edit order clicked:', order);
      console.log('Order object keys:', Object.keys(order));
      console.log('Order originalId:', order.originalId);
      console.log('Order id:', order.id);

      // Use the stored original _id instead of extracting from the display ID
      const originalId = order.originalId || order.id.replace('DO-', '');
      console.log('Original ID to use:', originalId);
      console.log('Full order ID:', order.id);

      // Fetch the complete order data from the API
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      console.log('Token:', token ? 'Token exists' : 'No token found');

      const apiUrl = `${API_CONFIG.BASE_URL}/api/v1/do/do/${originalId}`;
      console.log('API URL:', apiUrl);

      const response = await axios.get(apiUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data && response.data.success) {
        const fullOrderData = response.data.data;
        console.log('Full order data for editing:', fullOrderData);
        console.log('Pickup locations from API:', fullOrderData.shipper?.pickUpLocations);
        console.log('Drop locations from API:', fullOrderData.shipper?.dropLocations);

        // Helper function to format date for datetime-local input
        const formatDateForInput = (dateString) => {
          console.log('formatDateForInput called with:', dateString);
          if (!dateString) {
            console.log('No date string provided, returning empty string');
            return '';
          }
          try {
            const date = new Date(dateString);
            console.log('Created date object:', date);
            if (isNaN(date.getTime())) {
              console.log('Invalid date, returning empty string');
              return '';
            }
            const formattedDate = date.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
            console.log('Formatted date:', formattedDate);
            return formattedDate;
          } catch (error) {
            console.log('Error formatting date:', dateString, error);
            return '';
          }
        };

        // Convert the full order data to match the form structure
        console.log('Raw customers data from API:', fullOrderData.customers);
        console.log('Customers type:', typeof fullOrderData.customers);
        console.log('Customers is array:', Array.isArray(fullOrderData.customers));
        if (fullOrderData.customers && fullOrderData.customers.length > 0) {
          console.log('First customer from API:', fullOrderData.customers[0]);
          console.log('First customer keys:', Object.keys(fullOrderData.customers[0]));
        }

        const editFormData = {
          customers: fullOrderData.customers || [{
            billTo: '',
            dispatcherName: '',
            workOrderNo: '',
            lineHaul: '',
            fsc: '',
            other: '',
            totalAmount: 0
          }],
          carrierName: fullOrderData.carrier?.carrierName || '',
          equipmentType: fullOrderData.carrier?.equipmentType || '',
          carrierFees: fullOrderData.carrier?.totalCarrierFees || '',
          shipperName: fullOrderData.shipper?.name || '',
          containerNo: fullOrderData.shipper?.containerNo || '',
          containerType: fullOrderData.shipper?.containerType || '',
          weight: fullOrderData.shipper?.weight || '',
          pickupLocations: (fullOrderData.shipper?.pickUpLocations || [{
            name: '',
            address: '',
            city: '',
            state: '',
            zipCode: '',
            date: ''
          }]).map(location => {
            console.log('Processing pickup location:', location);
            // Use the pickUpDate from shipper object for all pickup locations
            const formattedDate = formatDateForInput(fullOrderData.shipper?.pickUpDate);
            console.log('Original pickUpDate:', fullOrderData.shipper?.pickUpDate, 'Formatted date:', formattedDate);
            return {
              ...location,
              date: formattedDate
            };
          }),
          dropLocations: (fullOrderData.shipper?.dropLocations || [{
            name: '',
            address: '',
            city: '',
            state: '',
            zipCode: '',
            date: ''
          }]).map(location => {
            console.log('Processing drop location:', location);
            // Use the dropDate from shipper object for all drop locations
            const formattedDate = formatDateForInput(fullOrderData.shipper?.dropDate);
            console.log('Original dropDate:', fullOrderData.shipper?.dropDate, 'Formatted date:', formattedDate);
            return {
              ...location,
              date: formattedDate
            };
          }),
          remarks: fullOrderData.remarks || '',
          docs: null
        };

        console.log('Edit form data prepared:', editFormData);
        console.log('Formatted pickup locations:', editFormData.pickupLocations);
        console.log('Formatted drop locations:', editFormData.dropLocations);

        // Set the form data
        setFormData(editFormData);
        console.log('Form data set successfully');

        // Log the form data after a short delay to see if it was set correctly
        setTimeout(() => {
          console.log('Form data after setting:', formData);
        }, 100);

        // Set charges if they exist
        console.log('Raw charges data from API:', fullOrderData.charges);
        console.log('Charges type:', typeof fullOrderData.charges);
        console.log('Charges is array:', Array.isArray(fullOrderData.charges));
        console.log('Full order data keys:', Object.keys(fullOrderData));
        console.log('Carrier data:', fullOrderData.carrier);
        console.log('Shipper data:', fullOrderData.shipper);

        // Check for charges in different possible locations
        let chargesData = fullOrderData.charges;
        if (!chargesData && fullOrderData.carrier && fullOrderData.carrier.carrierFees) {
          chargesData = fullOrderData.carrier.carrierFees;
          console.log('Found charges in carrier.carrierFees:', chargesData);
        }
        if (!chargesData && fullOrderData.carrier && fullOrderData.carrier.charges) {
          chargesData = fullOrderData.carrier.charges;
          console.log('Found charges in carrier object:', chargesData);
        }
        if (!chargesData && fullOrderData.shipper && fullOrderData.shipper.charges) {
          chargesData = fullOrderData.shipper.charges;
          console.log('Found charges in shipper object:', chargesData);
        }

        if (chargesData && Array.isArray(chargesData) && chargesData.length > 0) {
          // Ensure each charge has the correct structure and calculate totals
          const processedCharges = chargesData.map(charge => {
            console.log('Processing charge:', charge);
            return {
              name: charge.name || charge.chargeName || charge.description || '',
              quantity: charge.quantity || charge.qty || '',
              amt: charge.amount || charge.amt || charge.rate || charge.price || '',
              total: charge.total || (parseFloat(charge.quantity || charge.qty || 0)) * (parseFloat(charge.amount || charge.amt || charge.rate || charge.price || 0))
            };
          });
          console.log('Processed charges for edit:', processedCharges);
          setCharges(processedCharges);
        } else {
          console.log('No charges found, setting default charge');
          setCharges([{
            name: '',
            quantity: '',
            amt: '',
            total: 0
          }]);
        }

        setFormData(editFormData);
        setEditingOrder({ ...order, _id: originalId, fullData: fullOrderData });
        setShowEditModal(true);
      } else {
        alertify.error('Failed to fetch order details for editing');
      }
    } catch (error) {
      console.error('Error fetching order for editing:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      });

      // Fallback: Try to use the data from the orders state
      console.log('Trying fallback approach with order data from state');

      // Helper function to format date for datetime-local input
      const formatDateForInput = (dateString) => {
        console.log('Fallback formatDateForInput called with:', dateString);
        if (!dateString) {
          console.log('No date string provided in fallback, returning empty string');
          return '';
        }
        try {
          const date = new Date(dateString);
          console.log('Fallback created date object:', date);
          if (isNaN(date.getTime())) {
            console.log('Invalid date in fallback, returning empty string');
            return '';
          }
          const formattedDate = date.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
          console.log('Fallback formatted date:', formattedDate);
          return formattedDate;
        } catch (error) {
          console.log('Error formatting date in fallback:', dateString, error);
          return '';
        }
      };

      const fallbackFormData = {
        customers: [{
          billTo: order.clientName || '',
          dispatcherName: '',
          workOrderNo: order.doNum || '',
          lineHaul: '',
          fsc: '',
          other: '',
          totalAmount: order.amount || 0
        }],
        carrierName: order.carrierName || '',
        equipmentType: '',
        carrierFees: order.carrierFees || '',
        shipperName: order.shipperName || '',
        containerNo: '',
        containerType: order.productName || '',
        weight: order.quantity || '',
        pickupLocations: [{
          name: order.pickupLocation || '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          date: (() => {
            const pickupDate = order.pickUpDate || order.pickupDate || '';
            console.log('Fallback pickup date:', pickupDate);
            const formattedPickupDate = formatDateForInput(pickupDate);
            console.log('Fallback formatted pickup date:', formattedPickupDate);
            return formattedPickupDate;
          })()
        }],
        dropLocations: [{
          name: order.deliveryLocation || '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          date: (() => {
            const dropDate = order.dropDate || '';
            console.log('Fallback drop date:', dropDate);
            const formattedDropDate = formatDateForInput(dropDate);
            console.log('Fallback formatted drop date:', formattedDropDate);
            return formattedDropDate;
          })()
        }],
        remarks: order.remarks || '',
        docs: null
      };

      console.log('Fallback form data:', fallbackFormData);
      setFormData(fallbackFormData);
      console.log('Fallback form data set successfully');

      // Log the form data after a short delay to see if it was set correctly
      setTimeout(() => {
        console.log('Fallback form data after setting:', formData);
      }, 100);
      setCharges([{
        name: '',
        quantity: '',
        amt: '',
        total: 0
      }]);
      setEditingOrder({ ...order, _id: originalId });
      setShowEditModal(true);
      alertify.warning('Using limited data for editing. Some fields may be empty.');
    }
  };

  // Handle close edit modal
  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingOrder(null);
    setCarrierFeesJustUpdated(false); // Reset the flag
    // Reset form data to original state
    setFormData({
      customers: [{
        billTo: '',
        dispatcherName: '',
        workOrderNo: '',
        lineHaul: '',
        fsc: '',
        other: '',
        totalAmount: 0
      }],
      carrierName: '',
      equipmentType: '',
      carrierFees: '',
      shipperName: '',
      containerNo: '',
      containerType: '',
      weight: '',
      pickupLocations: [{
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        date: ''
      }],
      dropLocations: [{
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        date: ''
      }],
      remarks: '',
      docs: null
    });
  };

  // Handle update order - Fixed version with correct customer structure
  const handleUpdateOrder = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");

      // Get the current order to find customer ID - try editingOrder first, then orders array
      let currentOrder = null;
      let customerId = null;

      // First try to get from editingOrder (which might have fullData)
      if (editingOrder && editingOrder.fullData && editingOrder.fullData.customers && editingOrder.fullData.customers.length > 0) {
        currentOrder = editingOrder.fullData;
        customerId = editingOrder.fullData.customers[0]._id;
        console.log('Found customer from editingOrder.fullData:', customerId);
      }
      // If not found, try from orders array
      else if (editingOrder && editingOrder._id) {
        currentOrder = orders.find(order => order._id === editingOrder._id);
        if (currentOrder && currentOrder.customers && currentOrder.customers.length > 0) {
          customerId = currentOrder.customers[0]._id;
          console.log('Found customer from orders array:', customerId);
        }
      }

      if (!customerId) {
        console.error('No customer found. editingOrder:', editingOrder);
        console.error('Orders array length:', orders.length);
        alertify.error('No customer found in this order');
        setSubmitting(false);
        return;
      }
      const customerUpdates = {};

      // Add customer fields that are filled in the form
      if (formData.customers && formData.customers.length > 0) {
        const customer = formData.customers[0];
        if (customer.dispatcherName) customerUpdates.dispatcherName = customer.dispatcherName;
        if (customer.billTo) customerUpdates.billTo = customer.billTo;
        if (customer.workOrderNo) customerUpdates.workOrderNo = customer.workOrderNo;
        if (customer.lineHaul) customerUpdates.lineHaul = parseInt(customer.lineHaul) || 0;
        if (customer.fsc) customerUpdates.fsc = parseInt(customer.fsc) || 0;
        if (customer.other) customerUpdates.other = parseInt(customer.other) || 0;
      }

      // Check if we have carrier updates
      const hasCarrierUpdates = formData.carrierName || formData.equipmentType;
      const hasCustomerUpdates = Object.keys(customerUpdates).length > 0;
      const hasCarrierFees = charges && charges.length > 0 && charges.some(charge => charge.name && charge.quantity && charge.amt);
      const hasShipperUpdates = formData.shipperName || formData.containerNo || formData.containerType || formData.weight;

      console.log('Update types:', { hasCarrierUpdates, hasCustomerUpdates, hasCarrierFees, hasShipperUpdates });
      console.log('Current charges:', charges);

      // If only carrier fees updates, use carrier fees function
      if (hasCarrierFees && !hasCarrierUpdates && !hasCustomerUpdates) {
        console.log('Using carrier fees only update');

        // If carrier fees were just updated, don't update again
        if (carrierFeesJustUpdated) {
          console.log('Carrier fees were just updated, skipping duplicate update');
          handleCloseEditModal();
          return;
        }

        const carrierFeesData = charges.filter(charge => charge.name && charge.quantity && charge.amt).map(charge => ({
          name: charge.name,
          quantity: parseInt(charge.quantity) || 0,
          amount: parseInt(charge.amt) || 0,
          total: parseInt(charge.total) || 0
        }));
        const result = await updateCarrierFees(editingOrder._id, carrierFeesData);
        if (result) {
          handleCloseEditModal();
        }
        return;
      }

      // If only carrier updates, use carrier-only function
      if (hasCarrierUpdates && !hasCustomerUpdates && !hasCarrierFees && !hasShipperUpdates) {
        console.log('Using carrier-only update');
        const result = await updateCarrierOnly(editingOrder._id, formData.carrierName, formData.equipmentType);
        if (result) {
          handleCloseEditModal();
        }
        return;
      }

      // If only shipper updates, use shipper-only function
      if (hasShipperUpdates && !hasCarrierUpdates && !hasCustomerUpdates && !hasCarrierFees) {
        console.log('Using shipper-only update');
        const shipperData = {};
        if (formData.shipperName) shipperData.shipperName = formData.shipperName;
        if (formData.containerNo) shipperData.containerNo = formData.containerNo;
        if (formData.containerType) shipperData.containerType = formData.containerType;
        if (formData.weight) shipperData.weight = parseInt(formData.weight) || 0;

        const result = await updateShipperFields(editingOrder._id, shipperData);
        if (result) {
          handleCloseEditModal();
        }
        return;
      }

      // Create the correct payload structure for mixed updates
      const updatePayload = {};

      // Add customer updates if any customer fields are filled
      if (hasCustomerUpdates) {
        updatePayload.customerId = customerId;
        updatePayload.customerUpdates = customerUpdates;
      }

      // Add carrier fields directly (not inside customerUpdates)
      console.log('Form data carrier fields:', {
        carrierName: formData.carrierName,
        equipmentType: formData.equipmentType
      });

      if (formData.carrierName) {
        updatePayload.carrierName = formData.carrierName;
        console.log('Added carrierName to payload:', formData.carrierName);
      }
      if (formData.equipmentType) {
        updatePayload.equipmentType = formData.equipmentType;
        console.log('Added equipmentType to payload:', formData.equipmentType);
      }

      // Add carrier fees if they exist
      if (hasCarrierFees) {
        const carrierFeesData = charges.filter(charge => charge.name && charge.quantity && charge.amt).map(charge => ({
          name: charge.name,
          quantity: parseInt(charge.quantity) || 0,
          amount: parseInt(charge.amt) || 0,
          total: parseInt(charge.total) || 0
        }));
        updatePayload.carrier = {
          carrierFees: carrierFeesData
        };
        console.log('Added carrier fees to payload:', carrierFeesData);
      }

      // Add shipper fields if they exist
      if (formData.shipperName) updatePayload.shipperName = formData.shipperName;
      if (formData.containerNo) updatePayload.containerNo = formData.containerNo;
      if (formData.containerType) updatePayload.containerType = formData.containerType;
      if (formData.weight) updatePayload.weight = parseInt(formData.weight) || 0;

      // Add other non-customer fields if they exist
      if (formData.remarks) updatePayload.remarks = formData.remarks;

      console.log('Sending customer update payload:', updatePayload);
      console.log('Editing order ID:', editingOrder._id);
      console.log('Customer ID:', customerId);

      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/do/do/${editingOrder._id}`, updatePayload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.data && response.data.success) {
        alertify.success('Delivery order updated successfully!');
        handleCloseEditModal();
        fetchOrders(); // Refresh the orders list
      } else {
        console.error('Server response:', response.data);
        alertify.error('Failed to update delivery order');
      }
    } catch (error) {
      console.error('Error updating delivery order:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      alertify.error('Failed to update delivery order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle partial update (for specific fields like dispatcherName)
  const handlePartialUpdate = async (orderId, updateData) => {
    setSubmitting(true);

    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");

      console.log('Sending partial update payload:', updateData);
      console.log('Order ID:', orderId);

      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/do/do/${orderId}`, updateData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.data && response.data.success) {
        alertify.success('Delivery order updated successfully!');
        fetchOrders(); // Refresh the orders list
        return response.data;
      } else {
        console.error('Server response:', response.data);
        alertify.error('Failed to update delivery order');
        return null;
      }
    } catch (error) {
      console.error('Error updating delivery order:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      alertify.error('Failed to update delivery order. Please try again.');
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  // Universal update function - can update any field or combination of fields
  const updateDeliveryOrder = async (orderId, updateData) => {
    setSubmitting(true);

    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");

      console.log('Sending update payload:', updateData);
      console.log('Order ID:', orderId);

      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/do/do/${orderId}`, updateData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.data && response.data.success) {
        alertify.success('Delivery order updated successfully!');
        fetchOrders(); // Refresh the orders list
        return response.data;
      } else {
        console.error('Server response:', response.data);
        alertify.error('Failed to update delivery order');
        return null;
      }
    } catch (error) {
      console.error('Error updating delivery order:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      alertify.error('Failed to update delivery order. Please try again.');
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  // Helper functions for specific update scenarios

  // 1. Update Carrier Fields
  const updateCarrierFields = async (orderId, carrierData) => {
    return await updateDeliveryOrder(orderId, { carrier: carrierData });
  };

  // 2. Update Specific Customer (by index)
  const updateSpecificCustomer = async (orderId, customerIndex, customerData) => {
    // First get current order to update specific customer
    const currentOrder = orders.find(order => order._id === orderId);
    if (!currentOrder) {
      alertify.error('Order not found');
      return null;
    }

    const updatedCustomers = [...currentOrder.customers];
    updatedCustomers[customerIndex] = { ...updatedCustomers[customerIndex], ...customerData };

    return await updateDeliveryOrder(orderId, { customers: updatedCustomers });
  };

  // 3. Add New Customer
  const addNewCustomer = async (orderId, newCustomerData) => {
    const currentOrder = orders.find(order => order._id === orderId);
    if (!currentOrder) {
      alertify.error('Order not found');
      return null;
    }

    const updatedCustomers = [...currentOrder.customers, newCustomerData];
    return await updateDeliveryOrder(orderId, { customers: updatedCustomers });
  };

  // 4. Update Complete Customers Array
  const updateCompleteCustomers = async (orderId, customersArray) => {
    return await updateDeliveryOrder(orderId, { customers: customersArray });
  };

  // 5. Update Complete Carrier Object
  const updateCompleteCarrier = async (orderId, completeCarrierData) => {
    return await updateDeliveryOrder(orderId, { carrier: completeCarrierData });
  };

  // 6. Update Single Field (like dispatcherName)
  const updateSingleField = async (orderId, fieldName, fieldValue) => {
    const updateData = {};
    updateData[fieldName] = fieldValue;
    return await updateDeliveryOrder(orderId, updateData);
  };

  // 7. Update Specific Customer Fields (like lineHaul, other, fsc)
  const updateCustomerFields = async (orderId, customerId, customerUpdates) => {
    setSubmitting(true);

    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");

      const updateData = {
        customerId: customerId,
        customerUpdates: customerUpdates
      };

      console.log('Sending customer field update:', updateData);

      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/do/do/${orderId}`, updateData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.data && response.data.success) {
        alertify.success('Customer fields updated successfully!');
        fetchOrders(); // Refresh the orders list
        return response.data;
      } else {
        console.error('Server response:', response.data);
        alertify.error('Failed to update customer fields');
        return null;
      }
    } catch (error) {
      console.error('Error updating customer fields:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      alertify.error('Failed to update customer fields. Please try again.');
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  // 8. Helper functions for specific customer field updates
  const updateLineHaul = async (orderId, customerId, lineHaulValue) => {
    return await updateCustomerFields(orderId, customerId, { lineHaul: lineHaulValue });
  };

  const updateOther = async (orderId, customerId, otherValue) => {
    return await updateCustomerFields(orderId, customerId, { other: otherValue });
  };

  const updateFsc = async (orderId, customerId, fscValue) => {
    return await updateCustomerFields(orderId, customerId, { fsc: fscValue });
  };

  const updateBillTo = async (orderId, customerId, billToValue) => {
    return await updateCustomerFields(orderId, customerId, { billTo: billToValue });
  };

  const updateWorkOrderNo = async (orderId, customerId, workOrderNoValue) => {
    return await updateCustomerFields(orderId, customerId, { workOrderNo: workOrderNoValue });
  };

  const updateDispatcherName = async (orderId, customerId, dispatcherNameValue) => {
    return await updateCustomerFields(orderId, customerId, { dispatcherName: dispatcherNameValue });
  };

  // Test function to update carrier fields directly
  const testUpdateCarrier = async (orderId) => {
    setSubmitting(true);

    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");

      const updateData = {
        carrierName: "VPL Transport",
        equipmentType: "Trailer"
      };

      console.log('Testing carrier update with payload:', updateData);

      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/do/do/${orderId}`, updateData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.data && response.data.success) {
        alertify.success('Carrier test update successful!');
        fetchOrders(); // Refresh the orders list
        return response.data;
      } else {
        console.error('Server response:', response.data);
        alertify.error('Failed to update carrier');
        return null;
      }
    } catch (error) {
      console.error('Error updating carrier:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      alertify.error('Failed to update carrier. Please try again.');
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  // Function to update only carrier fields (without customer data)
  const updateCarrierOnly = async (orderId, carrierName, equipmentType) => {
    setSubmitting(true);

    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");

      const updateData = {};
      if (carrierName) updateData.carrierName = carrierName;
      if (equipmentType) updateData.equipmentType = equipmentType;

      console.log('Updating carrier only with payload:', updateData);

      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/do/do/${orderId}`, updateData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.data && response.data.success) {
        alertify.success('Carrier updated successfully!');
        fetchOrders(); // Refresh the orders list
        return response.data;
      } else {
        console.error('Server response:', response.data);
        alertify.error('Failed to update carrier');
        return null;
      }
    } catch (error) {
      console.error('Error updating carrier:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      alertify.error('Failed to update carrier. Please try again.');
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  // Function to update carrier fees
  const updateCarrierFees = async (orderId, carrierFees) => {
    setSubmitting(true);

    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");

      // Get current order to preserve existing carrier data - try multiple sources
      let currentOrder = null;
      let existingCarrierData = null;

      // First try from editingOrder.fullData
      if (editingOrder && editingOrder.fullData && editingOrder.fullData.carrier) {
        currentOrder = editingOrder.fullData;
        existingCarrierData = editingOrder.fullData.carrier;
        console.log('Found carrier from editingOrder.fullData:', existingCarrierData);
      }
      // If not found, try from orders array
      else if (editingOrder && editingOrder._id) {
        currentOrder = orders.find(order => order._id === editingOrder._id);
        if (currentOrder && currentOrder.carrier) {
          existingCarrierData = currentOrder.carrier;
          console.log('Found carrier from orders array:', existingCarrierData);
        }
      }

      if (!existingCarrierData) {
        console.error('No carrier found. editingOrder:', editingOrder);
        console.error('Orders array length:', orders.length);
        alertify.error('No carrier found in this order');
        return null;
      }

      const updateData = {
        carrier: {
          carrierName: existingCarrierData.carrierName || formData.carrierName || 'Default Carrier',
          equipmentType: existingCarrierData.equipmentType || formData.equipmentType || 'Default Equipment',
          carrierFees: carrierFees,
          totalCarrierFees: carrierFees.reduce((sum, fee) => sum + (fee.total || 0), 0)
        }
      };

      console.log('Updating carrier fees with payload:', updateData);

      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/do/do/${orderId}`, updateData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.data && response.data.success) {
        alertify.success('Carrier fees updated successfully!');
        fetchOrders(); // Refresh the orders list
        return response.data;
      } else {
        console.error('Server response:', response.data);
        alertify.error('Failed to update carrier fees');
        return null;
      }
    } catch (error) {
      console.error('Error updating carrier fees:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      alertify.error('Failed to update carrier fees. Please try again.');
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  // Helper function to update specific carrier fee
  const updateSpecificCarrierFee = async (orderId, feeIndex, feeData) => {
    // First get current order to update specific fee
    const currentOrder = orders.find(order => order._id === orderId);
    if (!currentOrder || !currentOrder.carrier || !currentOrder.carrier.carrierFees) {
      alertify.error('No carrier fees found in this order');
      return null;
    }

    const updatedFees = [...currentOrder.carrier.carrierFees];
    updatedFees[feeIndex] = { ...updatedFees[feeIndex], ...feeData };

    return await updateCarrierFees(orderId, updatedFees);
  };

  // Helper function to add new carrier fee
  const addNewCarrierFee = async (orderId, newFeeData) => {
    const currentOrder = orders.find(order => order._id === orderId);
    if (!currentOrder || !currentOrder.carrier) {
      alertify.error('No carrier found in this order');
      return null;
    }

    const currentFees = currentOrder.carrier.carrierFees || [];
    const updatedFees = [...currentFees, newFeeData];

    return await updateCarrierFees(orderId, updatedFees);
  };

  // Function to update shipper fields (containerNo, containerType, weight)
  const updateShipperFields = async (orderId, shipperData) => {
    setSubmitting(true);

    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");

      console.log('Updating shipper fields with payload:', shipperData);

      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/do/do/${orderId}`, shipperData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.data && response.data.success) {
        alertify.success('Shipper fields updated successfully!');
        fetchOrders(); // Refresh the orders list
        return response.data;
      } else {
        console.error('Server response:', response.data);
        alertify.error('Failed to update shipper fields');
        return null;
      }
    } catch (error) {
      console.error('Error updating shipper fields:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      alertify.error('Failed to update shipper fields. Please try again.');
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  // Helper functions for specific shipper field updates
  const updateContainerNo = async (orderId, containerNo) => {
    return await updateShipperFields(orderId, { containerNo: containerNo });
  };

  const updateContainerType = async (orderId, containerType) => {
    return await updateShipperFields(orderId, { containerType: containerType });
  };

  const updateWeight = async (orderId, weight) => {
    return await updateShipperFields(orderId, { weight: weight });
  };

  const updateShipperName = async (orderId, shipperName) => {
    return await updateShipperFields(orderId, { shipperName: shipperName });
  };

  // Handle status change and API integration
  const handleStatusChange = async (newStatus) => {
    try {
      if (!selectedOrder) {
        alertify.error('Order not found');
        return;
      }

      // Get the correct order ID - use _id as priority
      let orderId = selectedOrder._id || selectedOrder.originalId || selectedOrder.id;

      // If it's the display ID (DO-XXXXXX format), we need to find the actual _id
      if (orderId && orderId.startsWith('DO-')) {
        // Try to find the order in the orders list to get the proper _id
        const foundOrder = orders.find(order => order.id === orderId);
        if (foundOrder) {
          orderId = foundOrder.originalId || foundOrder._id;
        }
      }

      if (!orderId) {
        alertify.error('Order ID not found');
        return;
      }

      const token = sessionStorage.getItem("token") || localStorage.getItem("token");

      const statusData = {
        doId: orderId,
        status: newStatus
      };

      console.log('Updating status with payload:', statusData);

      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/do/do/status`, statusData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data && response.data.success) {
        alertify.success(`Status updated to ${newStatus} successfully!`);

        // Update the local state to reflect the change
        setSelectedOrder(prev => ({
          ...prev,
          status: newStatus
        }));

        // Also update the orders list
        setOrders(prevOrders =>
          prevOrders.map(order => {
            // Use _id for comparison as it's the most reliable
            const currentOrderId = order._id || order.originalId;
            const selectedOrderId = selectedOrder._id || selectedOrder.originalId;

            return currentOrderId === selectedOrderId
              ? { ...order, status: newStatus }
              : order;
          })
        );
      } else {
        console.error('Server response:', response.data);
        alertify.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      alertify.error('Failed to update status. Please try again.');
    }
  };

  // Generate Rate and Load Confirmation PDF function
  const generateRateLoadConfirmationPDF = (order) => {
    try {
      // Create a new window for PDF generation
      const printWindow = window.open('', '_blank');

      // Generate the HTML content for the rate and load confirmation
      const confirmationHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Rate and Load Confirmation</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.4;
              color: #333;
              background: white;
              font-size: 12px;
            }
            .confirmation-container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              padding: 20px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #333;
              padding-bottom: 15px;
              gap: 20px;
            }
            .logo {
              width: 120px;
              height: 90px;
              object-fit: contain;
            }
            .bill-to {
              text-align: right;
            }
            .confirmation-title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 20px;
              text-align: center;
              color: #2c3e50;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .load-number {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 20px;
              text-align: center;
              background: #f8f9fa;
              padding: 10px;
              border-radius: 5px;
            }
            .rates-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .rates-table th,
            .rates-table td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
              font-size: 12px;
            }
            .rates-table th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            .rates-table .amount {
              text-align: right;
              font-weight: bold;
            }
            .rates-table .total-row {
              background: #ffffff;
              color: black;
              font-weight: bold;
              font-size: 16px;
            }
            .rates-table .total-row td {
              border-top: 2px solid #000000;
              padding: 15px;
            }
            .notes-section {
              margin-top: 30px;
              padding: 20px;
              background: #f8f9fa;
              border-radius: 8px;
            }
            .notes-title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #2c3e50;
            }
            .notes-content {
              font-size: 14px;
              line-height: 1.6;
            }
            @media print {
              body { background: white; }
              .confirmation-container { box-shadow: none; margin: 0; }
              @page {
                margin: 0;
                size: A4;
              }
              @page :first {
                margin-top: 0;
              }
              @page :left {
                margin-left: 0;
              }
              @page :right {
                margin-right: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="confirmation-container">
            <!-- Header -->
            <div class="header">
              <img src="/src/assets/LogoFinal.png" alt="Company Logo" class="logo">
              
           
              
              <div class="bill-to">
                <table style="border-collapse: collapse; width: 100%; font-size: 12px;">
                  <tr>
                    <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Dispatcher</td>
                    <td style="padding: 2px 8px; border: 1px solid #ddd;">${order.customers && order.customers.length > 0 ? (order.customers[0].dispatcherName || 'N/A') : 'N/A'}</td>
                    <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Load</td>
                    <td style="padding: 2px 8px; border: 1px solid #ddd;">${order.doNum || order.customers?.[0]?.loadNo || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Phone</td>
                    <td style="padding: 2px 8px; border: 1px solid #ddd;">${order.customers && order.customers.length > 0 ? (order.customers[0].phone || 'N/A') : 'N/A'}</td>
                    <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Ship Date</td>
                    <td style="padding: 2px 8px; border: 1px solid #ddd;">${order.shipper && order.shipper.pickUpDate ? new Date(order.shipper.pickUpDate).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) : 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Fax</td>
                    <td style="padding: 2px 8px; border: 1px solid #ddd;">${order.customers && order.customers.length > 0 ? (order.customers[0].fax || 'N/A') : 'N/A'}</td>
                    <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Today Date</td>
                    <td style="padding: 2px 8px; border: 1px solid #ddd;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Email</td>
                    <td style="padding: 2px 8px; border: 1px solid #ddd;">${order.customers && order.customers.length > 0 ? (order.customers[0].email || 'N/A') : 'N/A'}</td>
                    <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">W/O</td>
                    <td style="padding: 2px 8px; border: 1px solid #ddd;">${order.customers && order.customers.length > 0 ? (order.customers[0].workOrderNo || 'N/A') : 'N/A'}</td>
                  </tr>
                </table>
              </div>
            </div>
            
            <!-- Title above Carrier Information Table -->
            <div style="text-align: center; margin: 20px 0 15px 0;">
              <h3 style="font-size: 18px; font-weight: bold; color: #2c3e50; text-transform: uppercase; letter-spacing: 1px; margin: 0;">
                Rate & Load Confirmation
              </h3>
            </div>

            <!-- Carrier Information Table -->
            <table class="rates-table">
              <thead>
                <tr>
                  <th>Carrier</th>
                  <th>Phone</th>
                  <th>Equipment</th>
                  <th>Load Status</th>
                  <th>Agreed Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${order.carrier && order.carrier.carrierName ? order.carrier.carrierName : 'N/A'}</td>
                  <td>${order.carrier && order.carrier.phone ? order.carrier.phone : 'N/A'}</td>
                  <td>${order.carrier && order.carrier.equipmentType ? order.carrier.equipmentType : 'N/A'}</td>
                  <td>${order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'N/A'}</td>
                  <td class="amount">$${(() => {
          const lineHaul = order.customers && order.customers.length > 0 ? (order.customers[0].lineHaul || 0) : 0;
          const fsc = order.customers && order.customers.length > 0 ? (order.customers[0].fsc || 0) : 0;
          const other = order.customers && order.customers.length > 0 ? (order.customers[0].other || 0) : 0;
          const carrierCharges = order.carrier && order.carrier.carrierFees ? order.carrier.carrierFees.reduce((sum, charge) => sum + (charge.total || 0), 0) : 0;
          return (lineHaul + fsc + other + carrierCharges).toLocaleString();
        })()}</td>
                </tr>
              </tbody>
            </table>

            <!-- Shipper Information Table -->
            <table class="rates-table">
              <thead>
                <tr>
                  <th colspan="2" style="text-align: left; background-color: #f0f0f0; font-size: 14px; font-weight: bold;">Shipper</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colspan="2" style="padding: 8px; font-weight: bold; border-bottom: 1px solid #ddd;">
                    ${order.shipper ? order.shipper.name || 'N/A' : 'N/A'}
                    ${order.shipper && order.shipper.pickUpLocations && order.shipper.pickUpLocations.length > 0 ?
          order.shipper.pickUpLocations.map(location => `
                        <br>${location.address || ''}, ${location.city || ''}, ${location.state || ''} ${location.zipCode || ''}
                      `).join('') : ''
        }
                  </td>
                </tr>
                <tr>
                  <td style="width: 50%; padding: 8px;">
                    <strong>Date:</strong> ${order.shipper && order.shipper.pickUpDate ? new Date(order.shipper.pickUpDate).toLocaleDateString() : 'N/A'}<br>
                    <strong>Time:</strong> N/A<br>
                    <strong>Type:</strong> ${order.shipper ? (order.shipper.containerType || '40HC') : '40HC'}<br>
                    <strong>Quantity:</strong> 1<br>
                    <strong>Weight:</strong> ${order.shipper ? (order.shipper.weight || 'N/A') + ' lbs' : 'N/A'}
                  </td>
                  <td style="width: 50%; padding: 8px;">
                    <strong>Purchase Order #:</strong> N/A<br>
                    <strong>Major Intersection:</strong> N/A<br>
                    <strong>Shipping Hours:</strong> N/A<br>
                    <strong>Appointment:</strong> No<br>
                    <strong>Description:</strong> ${order.shipper ? (order.shipper.containerNo || 'N/A') : 'N/A'}
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Consignee Information Table -->
            <table class="rates-table">
              <thead>
                <tr>
                  <th colspan="2" style="text-align: left; background-color: #f0f0f0; font-size: 14px; font-weight: bold;">Consignee</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colspan="2" style="padding: 8px; font-weight: bold; border-bottom: 1px solid #ddd;">
                    ${order.shipper ? order.shipper.name || 'N/A' : 'N/A'}
                    ${order.shipper && order.shipper.dropLocations && order.shipper.dropLocations.length > 0 ?
          order.shipper.dropLocations.map(location => `
                        <br>${location.address || ''}, ${location.city || ''}, ${location.state || ''} ${location.zipCode || ''}
                      `).join('') : ''
        }
                  </td>
                </tr>
                <tr>
                  <td style="width: 50%; padding: 8px;">
                    <strong>Date:</strong> ${order.shipper && order.shipper.dropDate ? new Date(order.shipper.dropDate).toLocaleDateString() : 'N/A'}<br>
                    <strong>Time:</strong> N/A<br>
                    <strong>Type:</strong> ${order.shipper ? (order.shipper.containerType || '40HC') : '40HC'}<br>
                    <strong>Quantity:</strong> 1<br>
                    <strong>Weight:</strong> ${order.shipper ? (order.shipper.weight || 'N/A') + ' lbs' : 'N/A'}
                  </td>
                  <td style="width: 50%; padding: 8px;">
                    <strong>Purchase Order #:</strong> N/A<br>
                    <strong>Major Intersection:</strong> N/A<br>
                    <strong>Receiving Hours:</strong> N/A<br>
                    <strong>Appointment:</strong> No<br>
                    <strong>Description:</strong> ${order.shipper ? (order.shipper.containerNo || 'N/A') : 'N/A'}
                  </td>
                </tr>
              </tbody>
            </table>
            
            <!-- Dispatcher Notes -->
            <div style="margin-top: 20px;">
              <h4 style="font-size: 14px; font-weight: bold; color:rgb(11, 14, 17);">Dispatcher Notes:</h4>
            </div>

          </div>
          
          <!-- Page Break for Terms and Conditions -->
          <div style="page-break-before: always; margin-top: 20px;">
            <div class="confirmation-container" style="width: 100%; margin: 0 auto;">
              <h2 style="text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #2c3e50;">Terms and Conditions</h2>
              
              <div style="font-size: 9px; line-height: 1.2; text-align: justify;">
                <p style="margin-bottom: 8px;">
                  This rate confirmation hereby serves as an agreement governing the movement of freight/commodity as specified & becomes a part of the
                  transportation agreement between the signing parties.
                </p>
                
                <h3 style="font-size: 12px; font-weight: bold; margin: 10px 0 6px 0; color: #2c3e50;">SAFE DELIVERY NORMS</h3>
                
                <ol style="margin-left: 8px; margin-bottom: 8px;">
                  <li style="margin-bottom: 3px;">All freights /commodities shall be picked-up & delivered within the time frame mentioned on the rate confirmation. Failure to do this may attract penalty from the agreed freight rate.</li>
                  
                  <li style="margin-bottom: 3px;">Drivers are required to comply by appointment timings in case of Live loading / Unloading. Failure to comply by the same would result in a penalty of $150 per appointment for late delivery on same day or in case of missed appointment, $200 per day.</li>
                  
                  <li style="margin-bottom: 3px;">In case of missed delivery appointments, the carrier will have to compensate for storage or re-scheduling costs for all such loads.</li>
                  
                  <li style="margin-bottom: 3px;">Any damage to the load that might occur due to the negligence of the Driver at the time of loading / unloading or during transit is to be paid by the Appointed Carrier / driver.</li>
                  
                  <li style="margin-bottom: 3px;">Whilst loading, the driver must do a piece count & inspect the condition of the load. Driver shall not leave the shipper without picking up complete load & getting our BOL signed from the site.</li>
                  
                  <li style="margin-bottom: 3px;">Please ensure our BOL is presented and signed at delivery for POD. Using any other paperwork will result in a $100 penalty.</li>
                  
                  <li style="margin-bottom: 3px;">Pictures are required at the time of Unloading/Loading of the Container/Trailor and once the Delivery is completed pictures for empty/loaded container/trailor is mandatory. Failure to do so will result in $50 penalty.</li>
                  
                  <li style="margin-bottom: 3px;">Assigned Carriers /drivers /dispatchers shall not contact the shipper or consignee directly under any conditions.</li>
                  
                  <li style="margin-bottom: 3px;">Assigned Carrier is required to ensure that seals, if attached on the loads are not tempered with at any given time. If seal is required to be removed, it should only be done by the receiver.</li>
                  
                  <li style="margin-bottom: 3px;">Re-assigning / Double Brokering / Interlining / Warehousing of this load is strictly prohibited until & unless a written consent for the same is obtained from us. This may lead to deferred payments to the contracted carrier plus we might report you to the authorities & pull a Freight Card against you.</li>
                  
                  <li style="margin-bottom: 3px;">All detentions due to missed appointments or late arrivals are to be paid by the driver.</li>
                  
                  <li style="margin-bottom: 3px;">A standard fee of $300 per day shall be implied in case you hold our freight hostage for whatsoever reason.</li>
                  
                  <li style="margin-bottom: 3px;">Macro-point is required as long as it has been requested by the customer. Macro point must be accepted/activated with the actual driver</li>
                  
                  <li style="margin-bottom: 3px;">Follow safety protocols at times. Wear masks at the time of pick-up & drop off. In case of FSD loads, drivers are required to wear Hard hats, safety glasses, and safety vests when in facility.</li>
                  
                  <li style="margin-bottom: 3px;">For all loads booked as FTL, trailers are exclusive & no LTL/ Partial loads can be added to it. Payments will be voided if LTL loads are added.</li>
                  
                  <li style="margin-bottom: 3px;">Any damage to the load that might occur due to the negligence of the Driver at the time of loading / unloading or during transit is to be paid by the Appointed Carrier.</li>
                  
                  <li style="margin-bottom: 3px;">Should there be any damage or loss to the freight during the load movement, the carrier is inclined to pay for complete loss as demanded by the Shipper</li>
                  
                  <li style="margin-bottom: 3px;">In case if we book a load with you & you are unable to keep up to the commitment and deliver the services, you are liable to pay us $100 for the time & losses that we had to incur on that load.</li>
                  
                  <li style="margin-bottom: 3px;">Freight charges payments shall be made when we receive POD and carrier invoice within 48 hours of the load delivery. Payment will be made 30 days after all required paperwork is received by our accounts department.</li>
                  
                  <li style="margin-bottom: 3px;">Any additional charge receipts such as for detention, lumper & overtime are to be submitted along with the POD within 72 hours of freight delivery along with the required documentation to arrange for the reimbursement.</li>
                  
                  <li style="margin-bottom: 3px;">If under any circumstances load gets delayed by 1-2 days and the temperature is maintained as an agreed term, there would be no claim entertained on that load.</li>
                </ol>
                
                <h3 style="font-size: 13px; font-weight: bold; margin: 15px 0 8px 0; color: #2c3e50;">Additional information</h3>
                
                <p style="margin-bottom: 10px;">
                  After the successful completion of the load / empty trailer delivery, if the carrier is unable to submit invoices & complete documentation as per
                  the set time frames, deductions as below will be applicable:
                </p>
                
                <ul style="margin-left: 15px; margin-bottom: 15px;">
                  <li style="margin-bottom: 4px;">In case, documents are not submitted within 1 day of the load delivery, $100 shall be deducted</li>
                  <li style="margin-bottom: 4px;">In case, documents are not submitted within 2 days, $150 shall be deducted</li>
                  <li style="margin-bottom: 4px;">In case, documents are not submitted within 5 days, $250 shall be deducted</li>
                </ul>
                
                <p style="font-weight: bold; margin-top: 20px; padding: 10px; background-color: #f8f9fa; border-left: 4px solid #2c3e50;">
                  DOCUMENTS BE MUST CLEAR AND LEGIBLE. POD'S MUST BE SENT VIA E-MAIL OR FAX WITHIN 24 HRS OF THE DELIVERY
                  FOR STRAIGHT THROUGH DELIVERIES AND WITHIN 3 HOURS FOR FIXED APPOINTMENT DELIVERIES
                  WITH OUR LOAD NUMBER CLEARLY NOTED ON THE TOP OF IT
                </p>
              </div>
            </div>
          </div>

          <!-- Simple Carrier Pay Section -->
          <div style="margin-top: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9; max-width: 90%; margin-left: auto; margin-right: auto;">
            <h3 style="text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 15px; color: #2c3e50;">Carrier Pay</h3>
            
            <div style="text-align: center; margin-bottom: 20px; font-size: 12px; line-height: 1.6;">
              <p style="margin-bottom: 10px;">
                <strong>Carrier Pay:</strong> Direct: $${(() => {
          const lineHaul = order.customers && order.customers.length > 0 ? (order.customers[0].lineHaul || 0) : 0;
          const fsc = order.customers && order.customers.length > 0 ? (order.customers[0].fsc || 0) : 0;
          const other = order.customers && order.customers.length > 0 ? (order.customers[0].other || 0) : 0;
          const carrierCharges = order.carrier && order.carrier.carrierFees ? order.carrier.carrierFees.reduce((sum, charge) => sum + (charge.total || 0), 0) : 0;
          return (lineHaul + fsc + other + carrierCharges).toLocaleString();
        })()}.00, # of Units: 1, Bobtail: $25.00, TOTAL: $${(() => {
          const lineHaul = order.customers && order.customers.length > 0 ? (order.customers[0].lineHaul || 0) : 0;
          const fsc = order.customers && order.customers.length > 0 ? (order.customers[0].fsc || 0) : 0;
          const other = order.customers && order.customers.length > 0 ? (order.customers[0].other || 0) : 0;
          const carrierCharges = order.carrier && order.carrier.carrierFees ? order.carrier.carrierFees.reduce((sum, charge) => sum + (charge.total || 0), 0) : 0;
          return (lineHaul + fsc + other + carrierCharges + 25).toLocaleString();
        })()} USD
              </p>
            </div>
            
            <div style="margin-bottom: 15px; font-size: 12px; line-height: 1.6;">
              <p style="margin-bottom: 10px; text-align: center;">
                Accepted By _________________________ Date ________________ Signature ____________________
              </p>
            </div>
            
            <div style="font-size: 12px; line-height: 1.6;">
              <p style="text-align: center;">
                Driver Name _________________________ Cell __________________ Truck _____________ Trailer _____________
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Write the HTML to the new window
      printWindow.document.write(confirmationHTML);
      printWindow.document.close();

      // Wait for content to load then print
      printWindow.onload = function () {
        printWindow.print();
        printWindow.close();
      };

      alertify.success('Rate and Load Confirmation PDF generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alertify.error('Failed to generate PDF. Please try again.');
    }
  };

  // Generate Invoice PDF function
  const generateInvoicePDF = (order) => {
    try {
      // Create a new window for PDF generation
      const printWindow = window.open('', '_blank');

      // Generate the HTML content for the invoice
      const invoiceHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Delivery Order Invoice</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.4;
              color: #333;
              background: white;
              font-size: 12px;
            }
            .invoice-container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              padding: 20px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 20px;
              border-bottom: 1px solid #333;
              padding-bottom: 15px;
            }
            .logo {
              width: 120px;
              height: 90px;
              object-fit: contain;
            }
            .bill-to {
              text-align: right;
            }
            .bill-to h3 {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 8px;
            }
            .bill-to-content {
              font-size: 12px;
              line-height: 1.4;
            }
            .load-number {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 20px;
              text-align: center;
            }
            .shipper-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 25px;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .shipper-table th,
            .shipper-table td {
              border: none;
              padding: 12px 15px;
              text-align: left;
              font-size: 13px;
            }
            .shipper-table th {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              font-weight: 600;
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .shipper-table tr:nth-child(even) {
              background-color: #f8f9ff;
            }
            .shipper-table tr:hover {
              background-color: #e8f4fd;
              transition: background-color 0.3s ease;
            }
            .shipper-table td:first-child {
              font-weight: 600;
              color: #667eea;
              width: 40%;
            }
            .rates-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .rates-table th,
            .rates-table td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
              font-size: 12px;
            }
            .rates-table th:nth-child(1),
            .rates-table td:nth-child(1) {
              width: 35%;
            }
            .rates-table th:nth-child(2),
            .rates-table td:nth-child(2) {
              width: 20%;
            }
            .rates-table th:nth-child(3),
            .rates-table td:nth-child(3) {
              width: 15%;
            }
            .rates-table th:nth-child(4),
            .rates-table td:nth-child(4) {
              width: 15%;
            }
            .rates-table th:nth-child(5),
            .rates-table td:nth-child(5) {
              width: 15%;
            }
            .rates-table th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            .rates-table .amount {
              text-align: right;
              font-weight: bold;
            }
            .rates-table .total-row {
              background: #ffffff;
              color: black;
              font-weight: bold;
              font-size: 16px;
            }
            .rates-table .total-row td {
              border-top: 2px solid #000000;
              padding: 15px;
            }
            .rates-table .total-row .amount {
              color: black;
            }
            .divider {
              border-top: 1px solid #333;
              margin: 20px 0;
            }
            @media print {
              body { background: white; }
              .invoice-container { box-shadow: none; margin: 0; }
              /* Hide automatic date/time in PDF */
              @page {
                margin: 0;
                size: A4;
              }
              /* Hide browser-generated headers and footers */
              @page :first {
                margin-top: 0;
              }
              @page :left {
                margin-left: 0;
              }
              @page :right {
                margin-right: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <!-- Header -->
            <div class="header">
              <img src="/src/assets/LogoFinal.png" alt="Company Logo" class="logo">
              <div class="bill-to">
                <table style="border-collapse: collapse; width: 100%; font-size: 12px;">
                  <tr>
                    <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Bill To</td>
                    <td style="padding: 2px 8px; border: 1px solid #ddd;">${order.customers && order.customers.length > 0 ? (order.customers[0].billTo || 'N/A') : 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">W/O (Ref)</td>
                    <td style="padding: 2px 8px; border: 1px solid #ddd;">${order.customers && order.customers.length > 0 ? (order.customers[0].workOrderNo || 'N/A') : 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Invoice Date</td>
                    <td style="padding: 2px 8px; border: 1px solid #ddd;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Invoice No</td>
                    <td style="padding: 2px 8px; border: 1px solid #ddd;">${order.doNum || order.customers?.[0]?.loadNo || 'N/A'}</td>
                  </tr>
                </table>
              </div>
            </div>

            <!-- Load Number -->
            <div class="load-number">LOAD #: ${order.doNum || order.customers?.[0]?.loadNo || 'N/A'}</div>

            <!-- Shipper Information Table -->
            <table class="rates-table">
              <thead>
                <tr>
                  <th>Shipper Name</th>
                  <th>Container No</th>
                  <th>Weight</th>
                  <th>Pickup Date</th>
                  <th>Drop Date</th>
                </tr>
              </thead>
              <tbody>
                ${order.shipper ? `
                  <tr>
                    <td>${order.shipper.name || 'N/A'}</td>
                    <td>${order.shipper.containerNo || 'N/A'}</td>
                    <td>${order.shipper.weight || 'N/A'} lbs</td>
                    <td>${order.shipper.pickUpDate ? new Date(order.shipper.pickUpDate).toLocaleDateString() : 'N/A'}</td>
                    <td>${order.shipper.dropDate ? new Date(order.shipper.dropDate).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                ` : ''}
              </tbody>
            </table>

            <!-- Pick Up Location Table -->
            <table class="rates-table">
              <thead>
                <tr>
                  <th>Pick Up Location</th>
                  <th>Address</th>
                  <th>City</th>
                  <th>State</th>
                  <th>Zip Code</th>
                </tr>
              </thead>
              <tbody>
                ${order.shipper && order.shipper.pickUpLocations && order.shipper.pickUpLocations.length > 0 ?
          order.shipper.pickUpLocations.map(location => `
                    <tr>
                      <td>${location.name || 'N/A'}</td>
                      <td>${location.address || 'N/A'}</td>
                      <td>${location.city || 'N/A'}</td>
                      <td>${location.state || 'N/A'}</td>
                      <td>${location.zipCode || 'N/A'}</td>
                    </tr>
                  `).join('') : ''
        }
              </tbody>
            </table>

            <!-- Drop Location Table -->
            <table class="rates-table">
              <thead>
                <tr>
                  <th>Drop Location</th>
                  <th>Address</th>
                  <th>City</th>
                  <th>State</th>
                  <th>Zip Code</th>
                </tr>
              </thead>
              <tbody>
                ${order.shipper && order.shipper.dropLocations && order.shipper.dropLocations.length > 0 ?
          order.shipper.dropLocations.map(location => `
                    <tr>
                      <td>${location.name || 'N/A'}</td>
                      <td>${location.address || 'N/A'}</td>
                      <td>${location.city || 'N/A'}</td>
                      <td>${location.state || 'N/A'}</td>
                      <td>${location.zipCode || 'N/A'}</td>
                    </tr>
                  `).join('') : ''
        }
              </tbody>
            </table>

            <div class="divider"></div>

            <!-- Rates and Charges Table -->
            <table class="rates-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${order.customers && order.customers.length > 0 ? `
                  ${(order.customers[0].lineHaul || 0) > 0 ? `
                    <tr>
                      <td>Line Haul</td>
                      <td class="amount">$${(order.customers[0].lineHaul || 0).toLocaleString()}</td>
                    </tr>
                  ` : ''}
                  ${(order.customers[0].fsc || 0) > 0 ? `
                    <tr>
                      <td>FSC</td>
                      <td class="amount">$${(order.customers[0].fsc || 0).toLocaleString()}</td>
                    </tr>
                  ` : ''}
                  ${(order.customers[0].other || 0) > 0 ? `
                    <tr>
                      <td>Other</td>
                      <td class="amount">$${(order.customers[0].other || 0).toLocaleString()}</td>
                    </tr>
                  ` : ''}
                ` : ''}
                ${order.carrier && order.carrier.carrierFees ? order.carrier.carrierFees.filter(charge => (charge.total || 0) > 0).map(charge => `
                  <tr>
                    <td>${charge.name}</td>
                    <td class="amount">$${(charge.total || 0).toLocaleString()}</td>
                  </tr>
                `).join('') : ''}
                <tr class="total-row">
                  <td><strong>TOTAL</strong></td>
                  <td class="amount"><strong>$${(() => {
          const lineHaul = order.customers && order.customers.length > 0 ? (order.customers[0].lineHaul || 0) : 0;
          const fsc = order.customers && order.customers.length > 0 ? (order.customers[0].fsc || 0) : 0;
          const other = order.customers && order.customers.length > 0 ? (order.customers[0].other || 0) : 0;
          const carrierCharges = order.carrier && order.carrier.carrierFees ? order.carrier.carrierFees.reduce((sum, charge) => sum + (charge.total || 0), 0) : 0;
          return (lineHaul + fsc + other + carrierCharges).toLocaleString();
        })()} USD</strong></td>
                </tr>
              </tbody>
            </table>

            <!-- Notes Section -->
            <div class="notes-section">
              <h3 class="notes-title">Notes:</h3>
              <div class="notes-content">
                ${['Thank you for your business!']}
                <br>
                ${['V Power Logistics']}
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      // Write the HTML to the new window
      printWindow.document.write(invoiceHTML);
      printWindow.document.close();

      // Wait for content to load then print
      printWindow.onload = function () {
        printWindow.print();
        printWindow.close();
      };

      alertify.success('Invoice PDF generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alertify.error('Failed to generate PDF. Please try again.');
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
                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">STATUS</th>
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${order.status === 'close'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                        }`}>
                        {order.status === 'close' ? 'Close' : (order.status === 'open' ? 'Open' : 'Open')}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-700">{order.createdBySalesUser?.employeeName || order.createdBySalesUser || 'N/A'}</span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewOrder(order)}
                          disabled={loadingOrderId === (order.originalId || order._id || order.id)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                            loadingOrderId === (order.originalId || order._id || order.id)
                              ? 'bg-gray-400 cursor-not-allowed text-white' 
                              : 'bg-blue-500 hover:bg-blue-600 text-white'
                          }`}
                        >
                          {loadingOrderId === (order.originalId || order._id || order.id) ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Loading...
                            </>
                          ) : (
                            'View'
                          )}
                        </button>
                        <button
                          onClick={() => handleEditOrder(order)}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                        >
                          Edit
                        </button>
                      </div>
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
                      <select
                        value={customer.dispatcherName}
                        onChange={(e) => handleCustomerChange(customerIndex, 'dispatcherName', e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                        <option value="">Select Dispatcher *</option>
                        {loadingDispatchers ? (
                          <option value="" disabled>Loading dispatchers...</option>
                        ) : (
                          dispatchers.map((dispatcher) => (
                            <option key={dispatcher._id} value={dispatcher.aliasName}>
                              {dispatcher.aliasName}
                            </option>
                          ))
                        )}
                      </select>
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
                        <span className="text-black-700 font-medium">Total: ${customer.totalAmount.toLocaleString()}</span>
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
                          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
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
        <>
          {loadingOrderId && (
            <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center">
              <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-lg font-semibold text-gray-800">Loading Order Details...</p>
                <p className="text-sm text-gray-600">Please wait while we fetch the complete data</p>
              </div>
            </div>
          )}
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
                          <div className="flex gap-1.5 justify-start">
                            <a
                              href={file.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-blue-500 text-white text-center py-1.5 px-2.5 rounded-md hover:bg-blue-600 transition text-xs font-medium"
                            >
                              View
                            </a>
                            <a
                              href={file.fileUrl}
                              download={file.fileName}
                              className="bg-green-500 text-white py-1.5 px-2.5 rounded-md hover:bg-green-600 transition text-xs font-medium"
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

              {/* Customer Name Section - At the very end */}
              {/* 
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className="text-blue-600" size={20} />
                  <h3 className="text-lg font-bold text-gray-800">Update Customer Name</h3>
                </div>
                <div className="bg-white rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="text-blue-600" size={18} />
                    <h4 className="font-semibold text-gray-800">Customer Name</h4>
                  </div>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Enter customer name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      value={customerNameInput}
                      onChange={(e) => {
                        console.log('Customer name input changed:', e.target.value);
                        setCustomerNameInput(e.target.value);
                      }}
                    />
                    <button
                                              onClick={async () => {
                          try {
                            const token = sessionStorage.getItem("token") || localStorage.getItem("token");
                            const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/do/do/customer/name`, {
                              doId: selectedOrder._id,
                              customerName: customerNameInput
                            }, {
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                              }
                            });
                          
                          if (response.data && response.data.success) {
                            alertify.success('Customer name updated successfully!');
                            // Update the local state to reflect the change
                            setSelectedOrder(prev => ({
                              ...prev,
                              customerName: customerNameInput
                            }));
                            
                            // Update the orders list to reflect the change
                            setOrders(prevOrders => 
                              prevOrders.map(order => 
                                order._id === selectedOrder._id 
                                  ? { ...order, customerName: customerNameInput }
                                  : order
                              )
                            );
                          } else {
                            alertify.error(response.data?.message || 'Failed to update customer name');
                          }
                        } catch (error) {
                          console.error('Error updating customer name:', error);
                          alertify.error('Failed to update customer name. Please try again.');
                        }
                      }}
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold shadow hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <User className="text-white" size={16} />
                      Update Customer Name
                    </button>
                  </div>
                </div>
              </div>
              */}

                             {/* Status */}
               <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
                 <div className="flex items-center gap-2 mb-4">
                   <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                     <CheckCircle className="text-blue-600" size={16} />
                   </div>
                   <h3 className="text-lg font-bold text-gray-800">Status</h3>
                 </div>
                 <div className="bg-white rounded-lg p-4 border border-blue-200">
                   <select
                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                     value={selectedOrder.status || "open"}
                     onChange={(e) => handleStatusChange(e.target.value)}
                   >
                     <option value="open">Open</option>
                     <option value="close">Close</option>
                   </select>
                 </div>
               </div>

               {/* PDF Generation Buttons */}
               <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4">
                 <div className="flex items-center gap-2 mb-3">
                   <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                     <FaDownload className="text-purple-600" size={14} />
                   </div>
                   <h3 className="text-base font-bold text-gray-800">Generate Documents</h3>
                 </div>
                 <div className="flex gap-2 justify-start">
                   <button
                     onClick={() => generateInvoicePDF(selectedOrder)}
                     className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1.5 rounded-md font-medium shadow hover:shadow-md transition-all duration-200 flex items-center justify-center gap-1.5 text-xs"
                   >
                     <FaDownload className="text-white" size={12} />
                     <span>Invoice PDF</span>
                   </button>

                   <button
                     onClick={() => generateRateLoadConfirmationPDF(selectedOrder)}
                     className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1.5 rounded-md font-medium shadow hover:shadow-md transition-all duration-200 flex items-center justify-center gap-1.5 text-xs"
                   >
                     <FaDownload className="text-white" size={12} />
                     <span>Rate Confirmation PDF</span>
                   </button>
                 </div>
               </div>
            </div>
          </div>
        </div>
        </>
      )}

      {/* Charges Popup */}
      {showChargesPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-[60]">
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
                      className={`p-2 rounded-full transition-all ${charges.length === 1
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

      {/* Edit Order Modal */}
      {showEditModal && editingOrder && (
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
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Edit Delivery Order</h2>
                    <p className="text-green-100">Update delivery order details</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseEditModal}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateOrder} className="p-6 space-y-6">
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
                    <label htmlFor="file-upload-edit" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                        </svg>
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PDF, DOC, DOCX, JPG, PNG (MAX. 10MB)</p>
                      </div>
                      <input
                        id="file-upload-edit"
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
                  onClick={handleCloseEditModal}
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
                    'Update Delivery Order'
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