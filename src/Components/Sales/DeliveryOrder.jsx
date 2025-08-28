import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaArrowLeft, FaDownload } from 'react-icons/fa';
import { User, Mail, Phone, Building, FileText, CheckCircle, XCircle, Clock, PlusCircle, MapPin, Truck, Calendar, DollarSign, Search } from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { DateRange } from 'react-date-range';
import { addDays, format } from 'date-fns';

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
  // PATCH: add this
  const [isEditForm, setIsEditForm] = useState(false);
  // top-level states ke saath
  const [formMode, setFormMode] = useState('add'); // 'add' | 'edit' | 'duplicate'
  // ADD: shipper companies (for Bill To dropdown)
  const [shippers, setShippers] = useState([]);
  const [loadingShippers, setLoadingShippers] = useState(false);
  // ADD: get approved shippers (company names for Bill To)
  const fetchShippersList = async () => {
    try {
      setLoadingShippers(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");

      // Prefer your API base URL
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/shippers`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const list = (res.data?.data || [])
        .filter(x => (x.userType === 'shipper') && (x.status === 'approved'));

      // Sort by company name (safe)
      list.sort((a, b) => (a.compName || '').localeCompare(b.compName || ''));

      setShippers(list);
    } catch (err) {
      console.error('Error loading shippers:', err);
      alertify.error('Failed to load company list');
      setShippers([]);
    } finally {
      setLoadingShippers(false);
    }
  };


  // Date range state (default: last 30 days like screenshot)
  const [range, setRange] = useState({
    startDate: addDays(new Date(), -29),
    endDate: new Date(),
    key: 'selection'
  });
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showCustomRange, setShowCustomRange] = useState(false);

  // Presets
  const presets = {
    'Today': [new Date(), new Date()],
    'Yesterday': [addDays(new Date(), -1), addDays(new Date(), -1)],
    'Last 7 Days': [addDays(new Date(), -6), new Date()],
    'Last 30 Days': [addDays(new Date(), -29), new Date()],
    'This Month': [new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)],
    'Last Month': [new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
    new Date(new Date().getFullYear(), new Date().getMonth(), 0)],
  };
  const applyPreset = (label) => {
    const [s, e] = presets[label];
    setRange({ startDate: s, endDate: e, key: 'selection' });
    setShowPresetMenu(false);
  };
  const ymd = (d) => format(d, 'yyyy-MM-dd'); // "YYYY-MM-DD"

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
  // REPLACE THIS BLOCK: formData ka initial state (weight shipper se hata kar pickup/drop locations me dala)
  const [formData, setFormData] = useState({
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

    // Shipper Information (NO top-level weight now)
    shipperName: '',
    containerNo: '',
    containerType: '',

    // Pickup Locations - each has weight
    pickupLocations: [
      {
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        date: '',
        weight: ''     // <-- NEW: yahi rakhen
      }
    ],

    // Drop Locations - each has weight
    dropLocations: [
      {
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        date: '',
        weight: ''     // <-- NEW
      }
    ],

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
  // REPLACE THIS BLOCK: fetchOrders() (quantity ko locations ke weight se lo)
  // REPLACE your fetchOrders with this version
  const fetchOrders = async () => {
    try {
      setLoading(true);

      const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
      if (!userStr) return;
      const user = JSON.parse(userStr);
      const empId = user.empId;
      if (!empId) return;

      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/do/do/employee/${empId}`, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });

      if (response.data && response.data.success) {
        const transformedOrders = (response.data.data || []).map(order => {
          // --------- PATCH: robust casing + fallbacks ----------
          const puLocs =
            order.shipper?.pickUpLocations ||
            order.shipper?.pickupLocations || // some APIs use lowercase 'u'
            [];
          const drLocs =
            order.shipper?.dropLocations ||
            order.shipper?.deliveryLocations ||
            [];

          const puW = puLocs[0]?.weight;
          const drW = drLocs[0]?.weight;
          // -----------------------------------------------------

          const loadNo = order.customers?.[0]?.loadNo || 'N/A';

          return {
            id: `DO-${String(order._id).slice(-6)}`,
            originalId: order._id,
            doNum: loadNo,
            clientName: order.customers?.[0]?.billTo || 'N/A',
            clientEmail: `${(order.customers?.[0]?.billTo || 'customer').toLowerCase().replace(/\s+/g, '')}@example.com`,
            pickupLocation: puLocs[0]?.name || 'Pickup Location',
            deliveryLocation: drLocs[0]?.name || 'Delivery Location',
            amount: order.customers?.[0]?.totalAmount || 0,
            description: `Load: ${loadNo}`,
            priority: 'normal',
            status: order.status || 'open',
            createdAt: new Date(order.date).toISOString().split('T')[0],
            createdBy: `Employee ${order.empId || 'N/A'}`,
            docUpload: 'sample-doc.jpg',
            productName: order.shipper?.containerType || 'N/A',
            // --------- PATCH: quantity fallback includes top-level shipper.weight if any ----------
            quantity: (puW ?? drW ?? order.shipper?.weight ?? 0),
            // --------------------------------------------------------------------------------------
            remarks: order.remarks || '',
            shipperName: order.shipper?.name || 'N/A',
            carrierName: order.carrier?.carrierName || 'N/A',
            carrierFees: order.carrier?.totalCarrierFees || 0,
            createdBySalesUser: order.createdBySalesUser || 'N/A',
            supportingDocs: order.supportingDocs || []
          };
        });

        setOrders(transformedOrders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      alertify.error(`Failed to load orders: ${error.response?.status || 'Network Error'}`);
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
    fetchDispatchers();
    fetchShippersList();         // ADD: load companies for Bill To dropdown
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
  // REPLACE THIS BLOCK: handleDuplicateOrder (locations ke weight ko preserve karo)
  const handleDuplicateOrder = async (rowOrder) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const originalId =
        rowOrder.originalId ||
        rowOrder._id ||
        (rowOrder.id?.startsWith('DO-') ? rowOrder.id.replace('DO-', '') : rowOrder.id);

      const { data } = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/do/do/${originalId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!data?.success) {
        alertify.error('Source order fetch failed');
        return;
      }
      const src = data.data;

      const fmt = (d) => {
        if (!d) return '';
        const x = new Date(d);
        return Number.isNaN(x.getTime()) ? '' : x.toISOString().slice(0, 16);
      };

      const prefCustomers = (src.customers || []).map(c => {
        const lh = Number(c.lineHaul) || 0;
        const fsc = Number(c.fsc) || 0;
        const oth = Number(c.other) || 0;
        return {
          billTo: c.billTo || '',
          dispatcherName: c.dispatcherName || '',
          workOrderNo: c.workOrderNo || '',
          lineHaul: lh,
          fsc: fsc,
          other: oth,
          totalAmount: lh + fsc + oth,
        };
      });

      const prefForm = {
        customers: prefCustomers.length ? prefCustomers : [{
          billTo: '', dispatcherName: '', workOrderNo: '',
          lineHaul: '', fsc: '', other: '', totalAmount: 0
        }],

        carrierName: src.carrier?.carrierName || '',
        equipmentType: src.carrier?.equipmentType || '',
        carrierFees: src.carrier?.totalCarrierFees || '',

        shipperName: src.shipper?.name || '',
        containerNo: src.shipper?.containerNo || '',
        containerType: src.shipper?.containerType || '',

        pickupLocations: (src.shipper?.pickUpLocations || [{
          name: '', address: '', city: '', state: '', zipCode: '', date: '', weight: ''
        }]).map(l => ({ ...l, date: fmt(src.shipper?.pickUpDate), weight: l?.weight ?? '' })),

        dropLocations: (src.shipper?.dropLocations || [{
          name: '', address: '', city: '', state: '', zipCode: '', date: '', weight: ''
        }]).map(l => ({ ...l, date: fmt(src.shipper?.dropDate), weight: l?.weight ?? '' })),

        remarks: src.remarks || '',
        docs: null,
      };

      const fees = (src.carrier?.carrierFees || []).map(f => ({
        name: f.name || '',
        quantity: Number(f.quantity) || 0,
        amt: Number(f.amount) || 0,
        total: Number(f.total) || ((Number(f.quantity) || 0) * (Number(f.amount) || 0)),
      }));

      setFormData(prefForm);
      setCharges(fees.length ? fees : [{ name: '', quantity: '', amt: '', total: 0 }]);

      setEditingOrder(null);
      setFormMode('duplicate');
      setShowAddOrderForm(true);

      alertify.message('You are duplicating this order. Submitting will create a new order.');
    } catch (e) {
      console.error(e);
      alertify.error('Duplicate form open failed');
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



  // Filter orders based on search term
  const filteredOrders = orders.filter(order => {
    const text = searchTerm.toLowerCase();
    const matchesText =
      order.id.toLowerCase().includes(text) ||
      order.clientName.toLowerCase().includes(text) ||
      order.pickupLocation.toLowerCase().includes(text) ||
      order.deliveryLocation.toLowerCase().includes(text);

    const created = order.createdAt || ''; // e.g., "2025-08-27"
    const inRange = created >= ymd(range.startDate) && created <= ymd(range.endDate);

    return matchesText && inRange;
  });


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
  }, [searchTerm, range]);


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
      const updated = [...prev.pickupLocations];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, pickupLocations: updated };
    });
  };

  // Handle drop location input changes
  const handleDropLocationChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.dropLocations];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, dropLocations: updated };
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
      pickupLocations: [
        ...prev.pickupLocations,
        { name: '', address: '', city: '', state: '', zipCode: '', date: '', weight: '' }
      ]
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
      dropLocations: [
        ...prev.dropLocations,
        { name: '', address: '', city: '', state: '', zipCode: '', date: '', weight: '' }
      ]
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
  // REPLACE THIS BLOCK: handleSubmit (JSON payload aur FormData me locations.weight bhejna; shipper.weight hata do)
  // DROP-IN REPLACEMENT for your handleSubmit
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      // --- basic validations (same as before) ---
      if (!formData.customers || formData.customers.length === 0) {
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
        alertify.error('At least one customer is required. Please fill in the customer details.');
        setSubmitting(false);
        return;
      }

      // --- user & emp ---
      const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
      const user = JSON.parse(userStr || '{}');
      const empId = user.empId || "EMP001";

      // --- customers (totals) ---
      const customersWithTotals = formData.customers.map(c => ({
        billTo: c.billTo,
        dispatcherName: c.dispatcherName,
        workOrderNo: c.workOrderNo,
        lineHaul: parseInt(c.lineHaul) || 0,
        fsc: parseInt(c.fsc) || 0,
        other: parseInt(c.other) || 0,
        totalAmount: (parseInt(c.lineHaul) || 0) + (parseInt(c.fsc) || 0) + (parseInt(c.other) || 0)
      }));

      // --- carrier (from charges) ---
      const carrierData = {
        carrierName: formData.carrierName,
        equipmentType: formData.equipmentType,
        carrierFees: (charges || []).map(ch => ({
          name: ch.name,
          quantity: parseInt(ch.quantity) || 0,
          amount: parseInt(ch.amt) || 0,
          total: (parseFloat(ch.quantity) || 0) * (parseFloat(ch.amt) || 0)
        })),
        totalCarrierFees: (charges || []).reduce((s, ch) => s + (ch.total || 0), 0)
      };

      // --- plain JSON payload (no top-level shipper.weight) ---
      const submitData = {
        empId,
        customers: customersWithTotals,
        carrier: carrierData,
        shipper: {
          name: formData.shipperName,
          pickUpLocations: formData.pickupLocations.map(l => ({
            name: l.name,
            address: l.address,
            city: l.city,
            state: l.state,
            zipCode: l.zipCode,
            weight: l.weight === '' ? 0 : parseInt(l.weight) || 0
          })),
          pickUpDate: formData.pickupLocations[0]?.date || '',
          containerNo: formData.containerNo,
          containerType: formData.containerType,
          dropLocations: formData.dropLocations.map(l => ({
            name: l.name,
            address: l.address,
            city: l.city,
            state: l.state,
            zipCode: l.zipCode,
            weight: l.weight === '' ? 0 : parseInt(l.weight) || 0
          })),
          dropDate: formData.dropLocations[0]?.date || ''
        },
        remarks: formData.remarks
      };

      const token = sessionStorage.getItem("token") || localStorage.getItem("token");

      let response;

      // ========== STEP B: MULTIPART (File attached) — send JSON as strings ==========
      if (formData.docs) {
        const fd = new FormData();
        fd.append('empId', empId);

        // strings me bhejo (server pe JSON.parse karna hoga)
        const carrierJSON = {
          carrierName: formData.carrierName,
          equipmentType: formData.equipmentType,
          carrierFees: (charges || []).map(ch => ({
            name: ch.name,
            quantity: parseInt(ch.quantity) || 0,
            amount: parseInt(ch.amt) || 0,
            total: (parseFloat(ch.quantity) || 0) * (parseFloat(ch.amt) || 0),
          })),
          totalCarrierFees: (charges || []).reduce((s, ch) => s + (ch.total || 0), 0),
        };

        const shipperJSON = {
          name: formData.shipperName,
          pickUpDate: formData.pickupLocations[0]?.date || '',
          containerNo: formData.containerNo,
          containerType: formData.containerType,
          dropDate: formData.dropLocations[0]?.date || '',
          pickUpLocations: formData.pickupLocations.map(l => ({
            name: l.name,
            address: l.address,
            city: l.city,
            state: l.state,
            zipCode: l.zipCode,
            weight: l.weight === '' ? 0 : parseInt(l.weight) || 0,
          })),
          dropLocations: formData.dropLocations.map(l => ({
            name: l.name,
            address: l.address,
            city: l.city,
            state: l.state,
            zipCode: l.zipCode,
            weight: l.weight === '' ? 0 : parseInt(l.weight) || 0,
          })),
        };

        fd.append('customers', JSON.stringify(customersWithTotals));
        fd.append('carrier', JSON.stringify(carrierJSON));
        fd.append('shipper', JSON.stringify(shipperJSON));
        fd.append('remarks', formData.remarks || '');
        fd.append('document', formData.docs);

        response = await axios.post(`${API_CONFIG.BASE_URL}/api/v1/do/do`, fd, {
          headers: {
            Authorization: `Bearer ${token}`,
            // Content-Type ko na set karein; browser khud boundary set karega
          },
        });
      } else {
        // plain JSON (as-is)
        response = await axios.post(`${API_CONFIG.BASE_URL}/api/v1/do/do`, submitData, {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        });
      }

      // ========== STEP C: success-block (newOrder with robust fallbacks) ==========
      if (response.data.success) {
        const resp = response.data.data || {};

        const puLocs =
          resp.shipper?.pickUpLocations ||
          resp.shipper?.pickupLocations || [];
        const drLocs =
          resp.shipper?.dropLocations ||
          resp.shipper?.deliveryLocations || [];
        const puW = puLocs[0]?.weight;
        const drW = drLocs[0]?.weight;

        const loadNo = resp.customers?.[0]?.loadNo || 'N/A';

        const newOrder = {
          id: `DO-${String(resp._id).slice(-6)}`,
          originalId: resp._id,
          doNum: loadNo,
          clientName: resp.customers?.[0]?.billTo || 'N/A',
          clientPhone: '+1-555-0000',
          clientEmail: `${(resp.customers?.[0]?.billTo || 'customer').toLowerCase().replace(/\s+/g, '')}@example.com`,
          pickupLocation: puLocs[0]?.name || 'Pickup Location',
          deliveryLocation: drLocs[0]?.name || 'Delivery Location',
          amount: resp.customers?.[0]?.totalAmount || 0,
          description: `Load: ${loadNo}`,
          priority: 'normal',
          status: 'pending',
          createdAt: new Date(resp.date).toISOString().split('T')[0],
          createdBy: `Employee ${resp.empId}`,
          docUpload: formData.docs ? formData.docs.name : 'sample-doc.jpg',
          productName: resp.shipper?.containerType || 'N/A',
          // fallback me top-level shipper.weight bhi consider
          quantity: (puW ?? drW ?? resp.shipper?.weight ?? 0),
          remarks: resp.remarks || '',
          shipperName: resp.shipper?.name || 'N/A',
          carrierName: resp.carrier?.carrierName || 'N/A',
          carrierFees: resp.carrier?.totalCarrierFees || 0,
          createdBySalesUser: resp.createdBySalesUser || 'N/A',
          supportingDocs: resp.supportingDocs || []
        };

        setOrders(prev => [newOrder, ...prev]);

        // reset form
        setShowAddOrderForm(false);
        setFormData({
          customers: [{
            billTo: '', dispatcherName: '', workOrderNo: '',
            lineHaul: '', fsc: '', other: '', totalAmount: 0
          }],
          carrierName: '',
          equipmentType: '',
          carrierFees: '',
          shipperName: '',
          containerNo: '',
          containerType: '',
          pickupLocations: [{ name: '', address: '', city: '', state: '', zipCode: '', date: '', weight: '' }],
          dropLocations: [{ name: '', address: '', city: '', state: '', zipCode: '', date: '', weight: '' }],
          remarks: '',
          docs: null
        });
        setCharges([{ name: '', quantity: '', amt: '', total: 0 }]);

        alertify.success('✅ Delivery order created successfully!');
      } else {
        alertify.error('Failed to create delivery order. Please try again.');
      }
    } catch (error) {
      console.error('Error creating delivery order:', error);
      if (error.response?.data?.message) {
        alertify.error(`API Error: ${error.response.data.message}`);
      } else if (error.response) {
        alertify.error(`API Error: ${error.response.status} - ${error.response.statusText}`);
      } else if (error.request) {
        alertify.error('Network error. Please check your connection and try again.');
      } else {
        alertify.error('Error creating delivery order. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };



  // Reset form when modal closes
  // REPLACE THIS BLOCK: handleCloseModal (form reset with location weights, no top-level weight)
  const handleCloseModal = () => {
    setShowAddOrderForm(false);
    setFormData({
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

      // Shipper Information (NO top-level weight)
      shipperName: '',
      containerNo: '',
      containerType: '',

      // Pickup Locations — with weight
      pickupLocations: [
        {
          name: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          date: '',
          weight: ''   // <- keep weight here
        }
      ],

      // Drop Locations — with weight
      dropLocations: [
        {
          name: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          date: '',
          weight: ''   // <- and here
        }
      ],

      // General
      remarks: '',
      docs: null
    });

    // Reset charges state
    setCharges([
      { name: '', quantity: '', amt: '', total: 0 }
    ]);
    setShowChargesPopup(false);
    setFormMode('add');
    setEditingOrder(null);
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

  // Handle edit order
  // REPLACE THIS BLOCK: handleEditOrder (locations me weight map karo, shipper.weight ignore)
  const handleEditOrder = async (order) => {
    try {
      console.log('Edit order clicked:', order);
      const originalId = order.originalId || order.id.replace('DO-', '');
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");

      const apiUrl = `${API_CONFIG.BASE_URL}/api/v1/do/do/${originalId}`;
      const response = await axios.get(apiUrl, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });

      if (response.data && response.data.success) {
        const fullOrderData = response.data.data;

        const formatDateForInput = (dateString) => {
          if (!dateString) return '';
          try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            return date.toISOString().slice(0, 16); // yyyy-mm-ddThh:mm
          } catch { return ''; }
        };

        const editFormData = {
          customers: (fullOrderData.customers || []).map(c => ({
            billTo: c.billTo || '',
            dispatcherName: c.dispatcherName || '',
            workOrderNo: c.workOrderNo || '',
            lineHaul: c.lineHaul ?? '',
            fsc: c.fsc ?? '',
            other: c.other ?? '',
            totalAmount: (Number(c.lineHaul) || 0) + (Number(c.fsc) || 0) + (Number(c.other) || 0)
          })),
          carrierName: fullOrderData.carrier?.carrierName || '',
          equipmentType: fullOrderData.carrier?.equipmentType || '',
          carrierFees: fullOrderData.carrier?.totalCarrierFees || '',
          shipperName: fullOrderData.shipper?.name || '',
          containerNo: fullOrderData.shipper?.containerNo || '',
          containerType: fullOrderData.shipper?.containerType || '',
          pickupLocations: (fullOrderData.shipper?.pickUpLocations || [{ name: '', address: '', city: '', state: '', zipCode: '' }]).map(l => ({
            ...l,
            date: formatDateForInput(fullOrderData.shipper?.pickUpDate),
            weight: l?.weight ?? '' // fallback; shipper.weight ko use NA kare
          })),
          dropLocations: (fullOrderData.shipper?.dropLocations || [{ name: '', address: '', city: '', state: '', zipCode: '' }]).map(l => ({
            ...l,
            date: formatDateForInput(fullOrderData.shipper?.dropDate),
            weight: l?.weight ?? ''
          })),
          remarks: fullOrderData.remarks || '',
          docs: null
        };

        const chargesData =
          fullOrderData.carrier?.carrierFees ||
          fullOrderData.carrier?.charges ||
          fullOrderData.charges || [];

        const processedCharges = (Array.isArray(chargesData) && chargesData.length ? chargesData : [{
          name: '', quantity: '', amt: '', total: 0
        }]).map(charge => ({
          name: charge.name || charge.chargeName || charge.description || '',
          quantity: charge.quantity || charge.qty || '',
          amt: charge.amount || charge.amt || charge.rate || charge.price || '',
          total: charge.total || (parseFloat(charge.quantity || charge.qty || 0)) * (parseFloat(charge.amount || charge.amt || charge.rate || charge.price || 0))
        }));

        setFormData(editFormData);
        setCharges(processedCharges);
        setEditingOrder({
          ...order,
          _id: originalId,
          customerId: fullOrderData?.customers?.[0]?._id || null, // <-- IMPORTANT
          fullData: fullOrderData
        });
        setFormMode('edit');
        setShowAddOrderForm(true);
      } else {
        alertify.error('Failed to fetch order details for editing');
      }
    } catch (error) {
      console.error('Error fetching order for editing:', error);

      // Fallback with whatever we have in table
      const originalId = order.originalId || order.id.replace('DO-', '');
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
        pickupLocations: [{
          name: order.pickupLocation || '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          date: '',
          weight: order.quantity || ''   // table me quantity dikh raha tha => location weight
        }],
        dropLocations: [{
          name: order.deliveryLocation || '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          date: '',
          weight: ''
        }],
        remarks: order.remarks || '',
        docs: null
      };

      setFormData(fallbackFormData);
      setCharges([{ name: '', quantity: '', amt: '', total: 0 }]);
      setEditingOrder({ _id: originalId, customerId: null, fullData: null });
      setFormMode('edit');
      setShowAddOrderForm(true);
      alertify.warning('Using limited data for editing. Some fields may be empty.');
    }
  };


  // Handle close edit modal
  // REPLACE THIS BLOCK: handleCloseEditModal (form reset with location weights, no top-level weight)
  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingOrder(null);
    setCarrierFeesJustUpdated(false);

    setFormData({
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
      carrierName: '',
      equipmentType: '',
      carrierFees: '',

      // Shipper (NO top-level weight now)
      shipperName: '',
      containerNo: '',
      containerType: '',

      // Locations with weight fields
      pickupLocations: [
        {
          name: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          date: '',
          weight: ''
        }
      ],
      dropLocations: [
        {
          name: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          date: '',
          weight: ''
        }
      ],

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
      const orderId = editingOrder?._id;
      const customerId = editingOrder?.customerId;

      if (!orderId) {
        alertify.error('Order ID missing');
        setSubmitting(false);
        return;
      }

      const customerUpdates = {};
      if (formData.customers?.length) {
        const c = formData.customers[0];
        if (c.billTo !== undefined) customerUpdates.billTo = c.billTo;
        if (c.dispatcherName !== undefined) customerUpdates.dispatcherName = c.dispatcherName;
        if (c.workOrderNo !== undefined) customerUpdates.workOrderNo = c.workOrderNo;
        const toNum = (v) => (v === '' || v === null || v === undefined) ? undefined : Number(v);
        const lh = toNum(c.lineHaul); if (lh !== undefined && !Number.isNaN(lh)) customerUpdates.lineHaul = lh;
        const fsc = toNum(c.fsc); if (fsc !== undefined && !Number.isNaN(fsc)) customerUpdates.fsc = fsc;
        const oth = toNum(c.other); if (oth !== undefined && !Number.isNaN(oth)) customerUpdates.other = oth;
      }

      const carrierFeesData = (charges || [])
        .filter(ch => ch?.name && ch?.quantity !== '' && ch?.amt !== '')
        .map(ch => ({
          name: ch.name,
          quantity: Number(ch.quantity) || 0,
          amount: Number(ch.amt) || 0,
          total: (Number(ch.quantity) || 0) * (Number(ch.amt) || 0),
        }));
      const totalCarrierFees = carrierFeesData.reduce((s, f) => s + (f.total || 0), 0);

      const shipperPayload = {
        name: formData.shipperName,
        containerNo: formData.containerNo,
        containerType: formData.containerType,
        pickUpDate: formData.pickupLocations?.[0]?.date || '',
        dropDate: formData.dropLocations?.[0]?.date || '',
        pickUpLocations: (formData.pickupLocations || []).map(l => ({
          name: l.name, address: l.address, city: l.city, state: l.state, zipCode: l.zipCode,
          weight: l.weight === '' ? 0 : Number(l.weight) || 0
        })),
        dropLocations: (formData.dropLocations || []).map(l => ({
          name: l.name, address: l.address, city: l.city, state: l.state, zipCode: l.zipCode,
          weight: l.weight === '' ? 0 : Number(l.weight) || 0
        })),
      };

      const carrierPayload = {
        carrierName: formData.carrierName,
        equipmentType: formData.equipmentType,
        ...(carrierFeesData.length ? { carrierFees: carrierFeesData, totalCarrierFees } : {})
      };

      const updatePayload = {};
      if (customerId && Object.keys(customerUpdates).length) {
        updatePayload.customerId = customerId;
        updatePayload.customerUpdates = customerUpdates;
      }
      if (carrierPayload.carrierName !== undefined ||
        carrierPayload.equipmentType !== undefined ||
        carrierPayload.carrierFees) {
        updatePayload.carrier = carrierPayload;
      }
      if (
        shipperPayload.name !== undefined ||
        shipperPayload.containerNo !== undefined ||
        shipperPayload.containerType !== undefined ||
        shipperPayload.pickUpLocations?.length ||
        shipperPayload.dropLocations?.length ||
        shipperPayload.pickUpDate || shipperPayload.dropDate
      ) {
        updatePayload.shipper = shipperPayload;
      }
      if (formData.remarks !== undefined) updatePayload.remarks = formData.remarks;

      const res = await axios.put(
        `${API_CONFIG.BASE_URL}/api/v1/do/do/${orderId}`,
        updatePayload,
        { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }
      );

      if (res?.data?.success) {
        alertify.success('Delivery order updated!');
        setShowAddOrderForm(false);
        setEditingOrder(null);
        setCarrierFeesJustUpdated(false);
        fetchOrders();
      } else {
        alertify.error(res?.data?.message || 'Update failed');
      }
    } catch (error) {
      console.error('Error updating delivery order:', error?.response?.data || error);
      alertify.error(error?.response?.data?.message || 'Failed to update delivery order');
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
  // REPLACE THIS BLOCK: generateRateLoadConfirmationPDF (weight ko per-location line me show, shipper.weight hataya)
  const generateRateLoadConfirmationPDF = (order) => {
    try {
      const printWindow = window.open('', '_blank');

      const confirmationHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rate and Load Confirmation</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Arial', sans-serif; line-height: 1.4; color: #333; background: white; font-size: 12px; }
          .confirmation-container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; gap: 20px; }
          .logo { width: 120px; height: 90px; object-fit: contain; }
          .bill-to { text-align: right; }
          .rates-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .rates-table th, .rates-table td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          .rates-table th { background-color: #f5f5f5; font-weight: bold; }
          .rates-table .amount { text-align: right; font-weight: bold; }
          @media print { @page { margin: 0; size: A4; } }
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
                  <td style="padding: 2px 8px; border: 1px solid #ddd;">${order.customers?.[0]?.dispatcherName || 'N/A'}</td>
                  <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Load</td>
                  <td style="padding: 2px 8px; border: 1px solid #ddd;">${order.doNum || order.customers?.[0]?.loadNo || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Phone</td>
                  <td style="padding: 2px 8px; border: 1px solid #ddd;">${order.customers?.[0]?.phone || 'N/A'}</td>
                  <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Ship Date</td>
                  <td style="padding: 2px 8px; border: 1px solid #ddd;">${order.shipper?.pickUpDate ? new Date(order.shipper.pickUpDate).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) : 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Fax</td>
                  <td style="padding: 2px 8px; border: 1px solid #ddd;">${order.customers?.[0]?.fax || 'N/A'}</td>
                  <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Today Date</td>
                  <td style="padding: 2px 8px; border: 1px solid #ddd;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}</td>
                </tr>
                <tr>
                  <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Email</td>
                  <td style="padding: 2px 8px; border: 1px solid #ddd;">${order.customers?.[0]?.email || 'N/A'}</td>
                  <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">W/O</td>
                  <td style="padding: 2px 8px; border: 1px solid #ddd;">${order.customers?.[0]?.workOrderNo || 'N/A'}</td>
                </tr>
              </table>
            </div>
          </div>

          <!-- Carrier Information -->
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
                <td>${order.carrier?.carrierName || 'N/A'}</td>
                <td>${order.carrier?.phone || 'N/A'}</td>
                <td>${order.carrier?.equipmentType || 'N/A'}</td>
                <td>${order.status ? order.status[0].toUpperCase() + order.status.slice(1) : 'N/A'}</td>
                <td class="amount">$${(() => {
          const c = order.customers?.[0] || {};
          const lineHaul = c.lineHaul || 0, fsc = c.fsc || 0, other = c.other || 0;
          const carrierCharges = (order.carrier?.carrierFees || []).reduce((s, ch) => s + (ch.total || 0), 0);
          return (lineHaul + fsc + other + carrierCharges).toLocaleString();
        })()}</td>
              </tr>
            </tbody>
          </table>

          <!-- Shipper -->
          <table class="rates-table">
            <thead><tr><th colspan="2" style="text-align:left;background:#f0f0f0;font-size:14px;font-weight:bold;">Shipper</th></tr></thead>
            <tbody>
              <tr>
                <td colspan="2" style="padding:8px;font-weight:bold;border-bottom:1px solid #ddd;">
                  ${order.shipper?.name || 'N/A'}
                  ${(order.shipper?.pickUpLocations || []).map(l => `
                    <br>${[l.address, l.city, l.state, l.zipCode].filter(Boolean).join(', ')}
                  `).join('')}
                </td>
              </tr>
              <tr>
                <td style="width:50%;padding:8px;">
                  <strong>Date:</strong> ${order.shipper?.pickUpDate ? new Date(order.shipper.pickUpDate).toLocaleDateString() : 'N/A'}<br>
                  <strong>Time:</strong> N/A<br>
                  <strong>Type:</strong> ${order.shipper?.containerType || '40HC'}<br>
                  <strong>Quantity:</strong> 1<br>
                  <strong>Weight:</strong> ${(order.shipper?.weight ?? 'N/A')} lbs
                </td>
                <td style="width:50%;padding:8px;">
                  <strong>Purchase Order #:</strong> N/A<br>
                  <strong>Shipping Hours:</strong> N/A<br>
                  <strong>Appointment:</strong> No<br>
                  <strong>Container/Trailer Number:</strong> ${order.shipper?.containerNo || 'N/A'}
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Consignee -->
          <table class="rates-table">
            <thead><tr><th colspan="2" style="text-align:left;background:#f0f0f0;font-size:14px;font-weight:bold;">Consignee</th></tr></thead>
            <tbody>
              <tr>
                <td colspan="2" style="padding:8px;font-weight:bold;border-bottom:1px solid #ddd;">
                  ${order.shipper?.name || 'N/A'}
                  ${(order.shipper?.dropLocations || []).map(l => `
                    <br>${[l.address, l.city, l.state, l.zipCode].filter(Boolean).join(', ')}
                  `).join('')}
                </td>
              </tr>
              <tr>
                <td style="width:50%;padding:8px;">
                  <strong>Date:</strong> ${order.shipper?.dropDate ? new Date(order.shipper.dropDate).toLocaleDateString() : 'N/A'}<br>
                  <strong>Time:</strong> N/A<br>
                  <strong>Type:</strong> ${order.shipper?.containerType || '40HC'}<br>
                  <strong>Quantity:</strong> 1<br>
                  <strong>Weight:</strong> ${(order.shipper?.weight ?? 'N/A')} lbs
                </td>
                <td style="width:50%;padding:8px;">
                  <strong>Purchase Order #:</strong> N/A<br>
                  <strong>Receiving Hours:</strong> N/A<br>
                  <strong>Appointment:</strong> No<br>
                  <strong>Container/Trailer Number:</strong> ${order.shipper?.containerNo || 'N/A'}
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Dispatcher Notes -->
          <div style="margin-top: 20px;">
            <h4 style="font-size: 14px; font-weight: bold; color:#0b0e11;">Dispatcher Notes:</h4>
          </div>
        </div>

        <!-- PAGE BREAK: Terms & Conditions -->
        <div style="page-break-before: always; margin-top: 20px;">
          <div class="confirmation-container" style="width: 100%; margin: 0 auto;">
            <h2 style="text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #2c3e50;">
              Terms and Conditions
            </h2>

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

        <!-- Carrier Pay (unchanged) -->
        <div style="margin-top: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9; max-width: 90%; margin-left: auto; margin-right: auto;">
          <h3 style="text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 15px; color: #2c3e50;">Carrier Pay</h3>
          <div style="text-align: center; margin-bottom: 20px; font-size: 12px; line-height: 1.6;">
            <p style="margin-bottom: 10px;">
              <strong>Carrier Pay:</strong> Direct: $${(() => {
          const c = order.customers?.[0] || {};
          const lineHaul = c.lineHaul || 0, fsc = c.fsc || 0, other = c.other || 0;
          const carrierCharges = (order.carrier?.carrierFees || []).reduce((s, ch) => s + (ch.total || 0), 0);
          return (lineHaul + fsc + other + carrierCharges).toLocaleString();
        })()}.00, # of Units: 1, Bobtail: $25.00, TOTAL: $${(() => {
          const c = order.customers?.[0] || {};
          const lineHaul = c.lineHaul || 0, fsc = c.fsc || 0, other = c.other || 0;
          const carrierCharges = (order.carrier?.carrierFees || []).reduce((s, ch) => s + (ch.total || 0), 0);
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

      printWindow.document.write(confirmationHTML);
      printWindow.document.close();
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
      const printWindow = window.open('', '_blank');

      // ---- Bill To + Address (from shippers list if available) ----
      const cust = order?.customers?.[0] || {};
      const companyName = (cust.billTo || '').trim();
      const matchedCompany = (Array.isArray(shippers) ? shippers : []).find(
        s => (s.compName || '').toLowerCase() === companyName.toLowerCase()
      );
      const billAddr = [
        matchedCompany?.compAdd,
        matchedCompany?.city,
        matchedCompany?.state,
        matchedCompany?.zipcode,
      ].filter(Boolean).join(', ');
      const billToDisplay = [companyName || 'N/A', billAddr].filter(Boolean).join(' — ');
      const workOrderNo = cust.workOrderNo || 'N/A';
      const invoiceNo = order.doNum || cust.loadNo || 'N/A';
      const todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });

      // ---- ONLY customer rates ----
      const LH = Number(cust.lineHaul) || 0;
      const FSC = Number(cust.fsc) || 0;
      const OTH = Number(cust.other) || 0;
      const CUSTOMER_TOTAL = LH + FSC + OTH;

      // helpers
      const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : 'N/A';
      const fmtTime = (d) => {
        if (!d) return '';
        const dt = new Date(d);
        if (Number.isNaN(dt.getTime())) return '';
        // show time only if not midnight
        if (dt.getHours() === 0 && dt.getMinutes() === 0) return '';
        return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      };
      const fullAddr = (loc) =>
        [loc?.address, loc?.city, loc?.state, loc?.zipCode].filter(Boolean).join(', ') || 'N/A';
      const hasTimeVal = (ds) => {
        if (!ds) return false;
        const dt = new Date(ds);
        if (Number.isNaN(dt.getTime())) return false;
        return dt.getHours() !== 0 || dt.getMinutes() !== 0;
      };

      const pickRows = Array.isArray(order?.shipper?.pickUpLocations) ? order.shipper.pickUpLocations : [];
      const dropRows = Array.isArray(order?.shipper?.dropLocations) ? order.shipper.dropLocations : [];

      const hasPickupTime = pickRows.some(l => hasTimeVal(l?.date || order?.shipper?.pickUpDate));
      const hasDropTime = dropRows.some(l => hasTimeVal(l?.date || order?.shipper?.dropDate));

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Delivery Order Invoice</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;line-height:1.4;color:#333;background:#fff;font-size:12px}
  .invoice{max-width:800px;margin:0 auto;background:#fff;padding:20px}
  .header{display:flex;gap:16px;align-items:flex-start;margin-bottom:16px;border-bottom:1px solid #333;padding-bottom:12px}
  .logo{width:140px;height:90px;object-fit:contain;flex:0 0 auto}
  .header-right{flex:1 1 auto}
  .billto{border-collapse:collapse;width:100%;font-size:12px}
  .billto th,.billto td{border:1px solid #ddd;padding:6px;text-align:left;vertical-align:top}
  .billto th{background:#f5f5f5;font-weight:bold;width:35%}
  .section{margin-top:14px}
  .tbl{width:100%;border-collapse:collapse;margin-top:8px}
  .tbl th,.tbl td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}
  .amount{text-align:right;font-weight:bold}
  .total-row{background:#fff;color:#000;font-weight:bold;font-size:14px}
  .total-row td{border-top:2px solid #000;padding:12px}
  @media print{@page{margin:0;size:A4}}
</style>
</head>
<body>
  <div class="invoice">
    <!-- HEADER: logo (left) + Bill To table (right) -->
    <div class="header">
      <img src="/src/assets/LogoFinal.png" class="logo" alt="Company Logo" />
      <div class="header-right">
        <table class="billto">
          <tr><th>Bill To</th><td>${billToDisplay}</td></tr>
          <tr><th>W/O (Ref)</th><td>${workOrderNo}</td></tr>
          <tr><th>Invoice Date</th><td>${todayStr}</td></tr>
          <tr><th>Invoice No</th><td>${invoiceNo}</td></tr>
        </table>
      </div>
    </div>

    <!-- Pick Up Locations -->
    <div class="section">
      <table class="tbl">
        <thead>
          <tr>
            <th>Pick Up Location</th>
            <th>Address</th>
            <th>Weight (lbs)</th>
            <th>Container No</th>
            <th>Container Type</th>
            <th>Qty</th>
            <th>Pickup Date</th>
            ${hasPickupTime ? '<th>Time</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${pickRows.map(l => {
        const weight = (l?.weight ?? '') !== '' && l?.weight !== null ? l.weight : 'N/A';
        const contNo = l?.containerNo || order.shipper?.containerNo || 'N/A';
        const contTp = l?.containerType || order.shipper?.containerType || 'N/A';
        const qty = Number(l?.quantity ?? order.shipper?.quantity) || 1;
        const dateSrc = l?.date || order.shipper?.pickUpDate;
        return `
              <tr>
                <td>${l?.name || 'N/A'}</td>
                <td>${fullAddr(l)}</td>
                <td>${weight}</td>
                <td>${contNo}</td>
                <td>${contTp}</td>
                <td>${qty}</td>
                <td>${fmtDate(dateSrc)}</td>
                ${hasPickupTime ? `<td>${fmtTime(dateSrc)}</td>` : ''}
              </tr>
            `;
      }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Drop Locations -->
    <div class="section">
      <table class="tbl">
        <thead>
          <tr>
            <th>Drop Location</th>
            <th>Address</th>
            <th>Weight (lbs)</th>
            <th>Container No</th>
            <th>Container Type</th>
            <th>Qty</th>
            <th>Drop Date</th>
            ${hasDropTime ? '<th>Time</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${dropRows.map(l => {
        const weight = (l?.weight ?? '') !== '' && l?.weight !== null ? l.weight : 'N/A';
        const contNo = l?.containerNo || order.shipper?.containerNo || 'N/A';
        const contTp = l?.containerType || order.shipper?.containerType || 'N/A';
        const qty = Number(l?.quantity ?? order.shipper?.quantity) || 1;
        const dateSrc = l?.date || order.shipper?.dropDate;
        return `
              <tr>
                <td>${l?.name || 'N/A'}</td>
                <td>${fullAddr(l)}</td>
                <td>${weight}</td>
                <td>${contNo}</td>
                <td>${contTp}</td>
                <td>${qty}</td>
                <td>${fmtDate(dateSrc)}</td>
                ${hasDropTime ? `<td>${fmtTime(dateSrc)}</td>` : ''}
              </tr>
            `;
      }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Charges: ONLY customer information rates -->
    <div class="section">
      <table class="tbl">
        <thead><tr><th>Description</th><th>Amount</th></tr></thead>
        <tbody>
          ${LH > 0 ? `<tr><td>Line Haul</td><td class="amount">$${LH.toLocaleString()}</td></tr>` : ''}
          ${FSC > 0 ? `<tr><td>FSC</td><td class="amount">$${FSC.toLocaleString()}</td></tr>` : ''}
          ${OTH > 0 ? `<tr><td>Other</td><td class="amount">$${OTH.toLocaleString()}</td></tr>` : ''}
          <tr class="total-row">
            <td><strong>TOTAL</strong></td>
            <td class="amount"><strong>$${CUSTOMER_TOTAL.toLocaleString()} USD</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">Thank you for your business!</div>
  </div>
</body>
</html>
    `;

      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = function () {
        printWindow.print();
        printWindow.close();
      };
      alertify.success('Invoice PDF generated successfully!');
    } catch (err) {
      console.error('Error generating PDF:', err);
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
          {/* Range dropdown (like screenshot) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPresetMenu(v => !v)}
              className="w-[300px] text-left px-3 py-2 border border-gray-300 rounded-lg bg-white flex items-center justify-between"
            >
              <span>
                {format(range.startDate, 'MMM dd, yyyy')} - {format(range.endDate, 'MMM dd, yyyy')}
              </span>
              <span className="ml-3">▼</span>
            </button>

            {showPresetMenu && (
              <div className="absolute z-50 mt-2 w-56 rounded-md border bg-white shadow-lg">
                {Object.keys(presets).map((lbl) => (
                  <button
                    key={lbl}
                    onClick={() => applyPreset(lbl)}
                    className="block w-full text-left px-3 py-2 hover:bg-gray-50"
                  >
                    {lbl}
                  </button>
                ))}
                <div className="my-1 border-t" />
                <button
                  onClick={() => { setShowPresetMenu(false); setShowCustomRange(true); }}
                  className="block w-full text-left px-3 py-2 hover:bg-gray-50"
                >
                  Custom Range
                </button>
              </div>
            )}
          </div>

          {/* Custom Range calendars (open ONLY when 'Custom Range' clicked) */}
          {showCustomRange && (
            <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl p-4">
                <DateRange
                  ranges={[range]}
                  onChange={(item) => setRange(item.selection)}
                  moveRangeOnFirstSelection={false}
                  months={2}
                  direction="horizontal"
                />
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setShowCustomRange(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCustomRange(false)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              setFormMode('add');
              setEditingOrder(null);
              setShowAddOrderForm(true);
            }}

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
                          onClick={() => handleViewEmployeeData(order.createdBySalesUser?.empId || '1234')}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEditOrder(order)}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDuplicateOrder(order)}
                          className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                        >
                          Duplicate
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
                    <h2 className="text-xl font-bold">
                      {formMode === 'edit'
                        ? 'Edit Delivery Order'
                        : formMode === 'duplicate'
                          ? 'Duplicate Delivery Order'
                          : 'Add Delivery Order'}
                    </h2>
                    <p className="text-blue-100">
                      {formMode === 'edit'
                        ? 'Update the existing delivery order'
                        : formMode === 'duplicate'
                          ? 'Review and submit to create a new copy'
                          : 'Create a new delivery order'}
                    </p>

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
            <form onSubmit={formMode === 'edit' ? handleUpdateOrder : handleSubmit} className="p-6 space-y-6">
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
                      {/* Bill To (Company) - dropdown */}
                      {/* Bill To (Company) - dropdown */}
                      {shippers.length > 0 ? (
                        <select
                          value={customer.billTo || ''}
                          onChange={(e) => handleCustomerChange(customerIndex, 'billTo', e.target.value)}
                          required
                          disabled={loadingShippers}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {/* Placeholder */}
                          <option value="" disabled>
                            {loadingShippers ? 'Loading companies...' : 'Select Company *'}
                          </option>

                          {/* Current value (agar list me na ho) */}
                          {customer.billTo &&
                            !shippers.some(s => (s.compName || '') === customer.billTo) && (
                              <option value={customer.billTo}>
                                {customer.billTo} (custom)
                              </option>
                            )
                          }

                          {/* Company options */}
                          {shippers.map(s => (
                            <option key={s._id} value={s.compName || ''}>
                              {s.compName || '(No name)'}
                            </option>
                          ))}
                        </select>
                      ) : (
                        // Fallback: companies load na ho to normal input
                        <input
                          type="text"
                          value={customer.billTo}
                          onChange={(e) => handleCustomerChange(customerIndex, 'billTo', e.target.value)}
                          required
                          disabled={loadingShippers}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={loadingShippers ? "Loading companies..." : "Bill To *"}
                        />
                      )}


                      {/* Dispatcher Name - dropdown (aliasName from CMT) */}
                      {dispatchers.length > 0 ? (
                        <select
                          value={customer.dispatcherName || ''}
                          onChange={(e) =>
                            handleCustomerChange(customerIndex, 'dispatcherName', e.target.value)
                          }
                          required
                          disabled={loadingDispatchers}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {/* Placeholder */}
                          <option value="" disabled>
                            {loadingDispatchers ? 'Loading dispatchers...' : 'Select Dispatcher *'}
                          </option>

                          {/* Current value (agar list me na ho) */}
                          {customer.dispatcherName &&
                            !dispatchers.some(
                              (d) => (d.aliasName || d.employeeName || '') === customer.dispatcherName
                            ) && (
                              <option value={customer.dispatcherName}>
                                {customer.dispatcherName} (custom)
                              </option>
                            )}

                          {/* Alias list (fallback to employeeName if alias missing) */}
                          {dispatchers
                            .filter((d) => (d.status || '').toLowerCase() === 'active')
                            .sort((a, b) =>
                              (a.aliasName || a.employeeName || '').localeCompare(
                                b.aliasName || b.employeeName || ''
                              )
                            )
                            .map((d) => (
                              <option key={d._id || d.empId} value={d.aliasName || d.employeeName}>
                                {d.aliasName || d.employeeName}
                                {d.empId ? ` (${d.empId})` : ''}
                              </option>
                            ))}
                        </select>
                      ) : (
                        // Fallback: list na aaye to normal input allow karo
                        <input
                          type="text"
                          value={customer.dispatcherName}
                          onChange={(e) =>
                            handleCustomerChange(customerIndex, 'dispatcherName', e.target.value)
                          }
                          required
                          disabled={loadingDispatchers}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={loadingDispatchers ? 'Loading dispatchers...' : 'Dispatcher Name *'}
                        />
                      )}

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
                          type="number"
                          value={formData.pickupLocations?.[locationIndex]?.weight ?? ''}
                          onChange={(e) => handlePickupLocationChange(locationIndex, 'weight', e.target.value)}
                          required
                          inputMode="decimal"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Weight (lbs) *"
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
                          type="number"
                          value={formData.dropLocations?.[locationIndex]?.weight ?? ''}
                          onChange={(e) => handleDropLocationChange(locationIndex, 'weight', e.target.value)}
                          required
                          inputMode="decimal"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Weight (lbs) *"
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
                      {formMode === 'edit' ? 'Updating...' : 'Creating...'}
                    </div>
                  ) : (
                    formMode === 'edit'
                      ? 'Update Delivery Order'
                      : formMode === 'duplicate'
                        ? 'Create Duplicate'
                        : 'Create Delivery Order'
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
            <div
              className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
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
                {/* Customer Information */}
                {selectedOrder?.customers?.length > 0 && (
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
                              <p className="font-medium text-gray-800">{customer?.billTo || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Dispatcher Name</p>
                              <p className="font-medium text-gray-800">{customer?.dispatcherName || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Work Order No</p>
                              <p className="font-medium text-gray-800">{customer?.workOrderNo || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Line Haul</p>
                              <p className="font-medium text-gray-800">${customer?.lineHaul || 0}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">FSC</p>
                              <p className="font-medium text-gray-800">${customer?.fsc || 0}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Other</p>
                              <p className="font-medium text-gray-800">${customer?.other || 0}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-sm text-gray-600">Total Amount</p>
                              <p className="font-bold text-lg text-green-600">${customer?.totalAmount || 0}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Carrier Information */}
                {selectedOrder?.carrier && (
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
                          <p className="font-semibold text-gray-800">{selectedOrder.carrier?.carrierName || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                          <Truck className="text-pink-600" size={16} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Equipment Type</p>
                          <p className="font-semibold text-gray-800">{selectedOrder.carrier?.equipmentType || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <DollarSign className="text-green-600" size={16} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Carrier Fees</p>
                          <p className="font-semibold text-gray-800">${selectedOrder.carrier?.totalCarrierFees || 0}</p>
                        </div>
                      </div>
                    </div>

                    {selectedOrder.carrier?.carrierFees?.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold text-gray-800 mb-3">Carrier Charges</h4>
                        <div className="space-y-2">
                          {selectedOrder.carrier.carrierFees.map((charge, i) => (
                            <div key={i} className="bg-white rounded-lg p-3 border border-purple-200">
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-gray-800">{charge?.name}</span>
                                <span className="font-bold text-green-600">${charge?.total || 0}</span>
                              </div>
                              <div className="text-sm text-gray-500">
                                Quantity: {charge?.quantity || 0} × Amount: ${charge?.amount || 0}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Shipper Information (NO weight here) */}
                {selectedOrder?.shipper && (
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
                          <p className="font-semibold text-gray-800">{selectedOrder.shipper?.name || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                          <Calendar className="text-yellow-600" size={16} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Pickup Date</p>
                          <p className="font-semibold text-gray-800">
                            {selectedOrder.shipper?.pickUpDate
                              ? new Date(selectedOrder.shipper.pickUpDate).toLocaleDateString()
                              : 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <FileText className="text-blue-600" size={16} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Container No</p>
                          <p className="font-semibold text-gray-800">{selectedOrder.shipper?.containerNo || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Truck className="text-green-600" size={16} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Container Type</p>
                          <p className="font-semibold text-gray-800">{selectedOrder.shipper?.containerType || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          <Calendar className="text-red-600" size={16} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Drop Date</p>
                          <p className="font-semibold text-gray-800">
                            {selectedOrder.shipper?.dropDate
                              ? new Date(selectedOrder.shipper.dropDate).toLocaleDateString()
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Pickup Locations (WITH Weight) */}
                    {((selectedOrder.shipper?.pickUpLocations ||
                      selectedOrder.shipper?.pickupLocations ||
                      []).length > 0) && (
                        <div className="mt-4">
                          <h4 className="font-semibold text-gray-800 mb-3">Pickup Locations</h4>
                          <div className="space-y-3">
                            {(selectedOrder.shipper?.pickUpLocations ||
                              selectedOrder.shipper?.pickupLocations ||
                              []).map((location, index) => (
                                <div key={index} className="bg-white rounded-lg p-3 border border-orange-200">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm text-gray-600">Name</p>
                                      <p className="font-medium text-gray-800">{location?.name || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-600">Address</p>
                                      <p className="font-medium text-gray-800">{location?.address || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-600">City</p>
                                      <p className="font-medium text-gray-800">{location?.city || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-600">State</p>
                                      <p className="font-medium text-gray-800">{location?.state || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-600">Zip Code</p>
                                      <p className="font-medium text-gray-800">{location?.zipCode || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-600">Weight (lbs)</p>
                                      <p className="font-medium text-gray-800">
                                        {typeof location?.weight !== 'undefined' && location?.weight !== null && location?.weight !== ''
                                          ? location.weight
                                          : 'N/A'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                    {/* Drop Locations (WITH Weight) */}
                    {((selectedOrder.shipper?.dropLocations || []).length > 0) && (
                      <div className="mt-4">
                        <h4 className="font-semibold text-gray-800 mb-3">Drop Locations</h4>
                        <div className="space-y-3">
                          {(selectedOrder.shipper?.dropLocations || []).map((location, index) => (
                            <div key={index} className="bg-white rounded-lg p-3 border border-yellow-200">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-gray-600">Name</p>
                                  <p className="font-medium text-gray-800">{location?.name || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">Address</p>
                                  <p className="font-medium text-gray-800">{location?.address || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">City</p>
                                  <p className="font-medium text-gray-800">{location?.city || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">State</p>
                                  <p className="font-medium text-gray-800">{location?.state || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">Zip Code</p>
                                  <p className="font-medium text-gray-800">{location?.zipCode || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">Weight (lbs)</p>
                                  <p className="font-medium text-gray-800">
                                    {typeof location?.weight !== 'undefined' && location?.weight !== null && location?.weight !== ''
                                      ? location.weight
                                      : 'N/A'}
                                  </p>
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
                {selectedOrder?.remarks && (
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
                      value={selectedOrder.status || 'open'}
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
                      {/* Bill To (Company) - dropdown */}
                      {/* Bill To (Company) - dropdown */}
                      {shippers.length > 0 ? (
                        <select
                          value={customer.billTo || ''}
                          onChange={(e) => handleCustomerChange(customerIndex, 'billTo', e.target.value)}
                          required
                          disabled={loadingShippers}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {/* Placeholder */}
                          <option value="" disabled>
                            {loadingShippers ? 'Loading companies...' : 'Select Company *'}
                          </option>

                          {/* Current value (agar list me na ho) */}
                          {customer.billTo &&
                            !shippers.some(s => (s.compName || '') === customer.billTo) && (
                              <option value={customer.billTo}>
                                {customer.billTo} (custom)
                              </option>
                            )
                          }

                          {/* Company options */}
                          {shippers.map(s => (
                            <option key={s._id} value={s.compName || ''}>
                              {s.compName || '(No name)'}
                            </option>
                          ))}
                        </select>
                      ) : (
                        // Fallback: companies load na ho to normal input
                        <input
                          type="text"
                          value={customer.billTo}
                          onChange={(e) => handleCustomerChange(customerIndex, 'billTo', e.target.value)}
                          required
                          disabled={loadingShippers}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={loadingShippers ? "Loading companies..." : "Bill To *"}
                        />
                      )}


                      {/* Dispatcher Name - dropdown (aliasName from CMT) */}
                      {dispatchers.length > 0 ? (
                        <select
                          value={customer.dispatcherName || ''}
                          onChange={(e) =>
                            handleCustomerChange(customerIndex, 'dispatcherName', e.target.value)
                          }
                          required
                          disabled={loadingDispatchers}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {/* Placeholder */}
                          <option value="" disabled>
                            {loadingDispatchers ? 'Loading dispatchers...' : 'Select Dispatcher *'}
                          </option>

                          {/* Current value (agar list me na ho) */}
                          {customer.dispatcherName &&
                            !dispatchers.some(
                              (d) => (d.aliasName || d.employeeName || '') === customer.dispatcherName
                            ) && (
                              <option value={customer.dispatcherName}>
                                {customer.dispatcherName} (custom)
                              </option>
                            )}

                          {/* Alias list (fallback to employeeName if alias missing) */}
                          {dispatchers
                            .filter((d) => (d.status || '').toLowerCase() === 'active')
                            .sort((a, b) =>
                              (a.aliasName || a.employeeName || '').localeCompare(
                                b.aliasName || b.employeeName || ''
                              )
                            )
                            .map((d) => (
                              <option key={d._id || d.empId} value={d.aliasName || d.employeeName}>
                                {d.aliasName || d.employeeName}
                                {d.empId ? ` (${d.empId})` : ''}
                              </option>
                            ))}
                        </select>
                      ) : (
                        // Fallback: list na aaye to normal input allow karo
                        <input
                          type="text"
                          value={customer.dispatcherName}
                          onChange={(e) =>
                            handleCustomerChange(customerIndex, 'dispatcherName', e.target.value)
                          }
                          required
                          disabled={loadingDispatchers}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={loadingDispatchers ? 'Loading dispatchers...' : 'Dispatcher Name *'}
                        />
                      )}

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