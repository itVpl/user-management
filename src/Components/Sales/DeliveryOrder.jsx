import React, { useEffect, useState } from 'react';
import axios from 'axios';
import apiService from '../../services/apiService.js';
import { FaArrowLeft, FaDownload } from 'react-icons/fa';
import { User, Mail, Phone, Building, FileText, CheckCircle, XCircle, Clock, PlusCircle, MapPin, Truck, Calendar, DollarSign, Search } from 'lucide-react';
import Logo from '../../assets/LogoFinal.png';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { DateRange } from 'react-date-range';
import { addDays, format } from 'date-fns';

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
  const dropdownRef = React.useRef(null);

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

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className={`w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent cursor-pointer ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400'
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
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
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

export default function DeliveryOrder() {
  // ⬇️ put these near the top-level states
  const MAX_DOC_MB = 10;
  const ALLOWED_MIME = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ];
  const sanitizeAlnum = (s = "") => s.replace(/[^A-Za-z0-9]/g, "");
  // money (>= 0, max 2 decimals)
  const isMoney2dp = (s = '') => {
    if (s === '' || s === null) return false;
    const str = String(s).trim();
    if (!/^(\d+(\.\d{0,2})?)$/.test(str)) return false;
    return Number(str) >= 0;
  };
  // ========= Clickable Date Input =========
  const ClickableDateInput = ({
    value,
    onChange,
    placeholder = 'mm/dd/yyyy --:-- --',
    error,
    min,
    max,
    mode = 'datetime', // 'date' | 'time' | 'datetime'
    className = '',
  }) => {
    const inputRef = React.useRef(null);

    const openPicker = () => {
      if (!inputRef.current) return;
      // Try to open native picker (Chrome/Edge)
      try { inputRef.current.showPicker?.(); } catch { }
      // Fallbacks
      inputRef.current.focus();
      // Safari/Firefox kuch cases me click se open hota hai
      try { inputRef.current.click(); } catch { }
    };

    const type =
      mode === 'date' ? 'date' :
        mode === 'time' ? 'time' : 'datetime-local';

    return (
      <div
        className={`relative cursor-pointer ${className}`}
        role="button"
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); } }}
      >
        <input
          ref={inputRef}
          type={type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          placeholder={placeholder}
          className={`w-full px-4 py-3 border rounded-lg bg-white focus:outline-none focus:ring-2
          ${error ? 'border-red-500 focus:ring-red-200 bg-red-50' : 'border-gray-300 focus:ring-blue-500'}`}
        />
        {/* Calendar icon (clicks pass-through to wrapper) */}
        <Calendar
          size={18}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  };
  // ===== Scroll & focus first error (no popup) =====
  const focusFirstError = () => {
    // wait till React paints error classes
    requestAnimationFrame(() => {
      // priority: any element we tagged as an error field
      const el =
        document.querySelector('.error-field') ||
        document.querySelector('[aria-invalid="true"]');

      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        try {
          // focus inputs; if wrapper div, try a child input
          if (typeof el.focus === 'function') el.focus({ preventScroll: true });
          else {
            const input = el.querySelector('input, textarea, select, [tabindex]');
            input?.focus?.({ preventScroll: true });
          }
        } catch { }
      } else {
        // fallback: scroll to top of form
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  };

  // typing/paste sanitize: keeps only digits + one dot, trims to 2 dp
  const clamp2dp = (s = '') => {
    let t = String(s).replace(/[^\d.]/g, '');
    const parts = t.split('.');
    if (parts.length > 2) t = parts[0] + '.' + parts.slice(1).join('');
    const [int = '0', dec = ''] = t.split('.');
    return dec !== '' ? `${int}.${dec.slice(0, 2)}` : int;
  };

  // numeric to 2dp (for totals/payloads)
  const toNum2 = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  };

  // block e/E/+/- but allow dot
  const blockMoneyChars = (e) => {
    if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
  };

  // Validators

  const isAlnum = (s = '') => /^[A-Za-z0-9]+$/.test(s.trim());
  const isNonNegInt = (s) => /^\d+$/.test(String(s)) && Number(s) >= 0;

  // US 5/9, India 6, Canada format
  // ZIP: only alphanumeric (no space/dash)
  // Supports: US 5 or 9 (contiguous), India 6, Canada A1A1A1
  const isZip = (s = '') => {
    const v = String(s).trim();
    return (
      /^\d{5}(\d{4})?$/.test(v)     // 12345 or 123456789
      || /^\d{6}$/.test(v)          // 560001 (India)
      || /^[A-Za-z]\d[A-Za-z]\d[A-Za-z]\d$/.test(v) // A1A1A1 (Canada, no space)
    );
  };

  // sanitize & keyguard for zip
  const sanitizeAlphaNum = (s = '') => s.replace(/[^A-Za-z0-9]/g, '');



  // Block invalid chars in integer-only inputs
  const blockIntChars = (e) => {
    if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault();
  };

  const [errors, setErrors] = useState({
    customers: [],      // [{billTo:'', dispatcherName:'', workOrderNo:'', lineHaul:'', fsc:'', other:''}]
    carrier: {},        // { carrierName:'', equipmentType:'', fees:'' , chargeRows:[{name:'', quantity:'', amt:''}] }
    shipper: {},        // { shipperName:'', containerNo:'', containerType:'' }
    pickups: [],        // [{name:'', address:'', city:'', state:'', zipCode:'', weight:'', pickUpDate:''}]
    drops: [],          // [{name:'', address:'', city:'', state:'', zipCode:'', weight:'', dropDate:''}]
    docs: ''            // error string
  });
// --- shared error style helpers ---
const errCls = (has) =>
  `w-full px-4 py-3 border rounded-lg focus:outline-none ${
    has ? 'border-red-500 bg-red-50 focus:ring-2 focus:ring-red-200 error-field' 
        : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
  }`;

// for dropdown error frame
const errBox = (has) =>
  `${has ? 'border-red-500 bg-red-50' : 'border-gray-300'} border rounded-lg`;



  const [orders, setOrders] = useState([]);
  const [viewDoc, setViewDoc] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reason, setReason] = useState('');
  const [showAddOrderForm, setShowAddOrderForm] = useState(false);
  const [loading, setLoading] = useState(true);
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [orderToDelete, setOrderToDelete] = useState(null);
  const logoSrc = Logo;
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

      const list = (res.data?.data || []).filter(x => (x.userType === 'shipper') && (x.status === 'approved'));

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
  // ✅ REPLACE: initial formData (with remarks on locations)
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

    // Shipper Information
    shipperName: '',
    containerNo: '',
    containerType: '',

    // Pickup Locations - each has weight, individual date, and remarks (optional)
    pickupLocations: [
      {
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        weight: '',
        pickUpDate: '',
        remarks: '' // 👈 NEW
      }
    ],

    // Drop Locations - each has weight, individual date, and remarks (optional)
    dropLocations: [
      {
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        weight: '',
        dropDate: '',
        remarks: '' // 👈 NEW
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
  // ✅ REPLACE: handleDuplicateOrder (preserve location remarks)
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
          name: '', address: '', city: '', state: '', zipCode: '', weight: '', pickUpDate: '', remarks: ''
        }]).map(l => ({
          ...l,
          pickUpDate: fmt(l?.pickUpDate || src.shipper?.pickUpDate),
          weight: l?.weight ?? '',
          remarks: l?.remarks ?? '' // 👈 NEW
        })),

        dropLocations: (src.shipper?.dropLocations || [{
          name: '', address: '', city: '', state: '', zipCode: '', weight: '', dropDate: '', remarks: ''
        }]).map(l => ({
          ...l,
          dropDate: fmt(l?.dropDate || src.shipper?.dropDate),
          weight: l?.weight ?? '',
          remarks: l?.remarks ?? '' // 👈 NEW
        })),

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
    // ✅ Work Order Number = only alphanumeric
    if (field === 'workOrderNo') {
      value = sanitizeAlnum(value);
    }
    // money fields sanitize while typing
    if (['lineHaul', 'fsc', 'other'].includes(field)) {
      value = clamp2dp(value);
    }

    setFormData(prev => {
      const updatedCustomers = [...prev.customers];
      updatedCustomers[index] = {
        ...updatedCustomers[index],
        [field]: value
      };

      // Calculate total amount for this customer
      const lh = parseFloat(updatedCustomers[index].lineHaul) || 0;
      const fsc = parseFloat(updatedCustomers[index].fsc) || 0;
      const oth = parseFloat(updatedCustomers[index].other) || 0;
      updatedCustomers[index].totalAmount = +(lh + fsc + oth).toFixed(2); // 3.66


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
      const val = field === 'zipCode' ? sanitizeAlphaNum(value) : value;
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, pickupLocations: updated };
    });
  };


  // Handle drop location input changes
  const handleDropLocationChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.dropLocations];
      const val = field === 'zipCode' ? sanitizeAlphaNum(value) : value;
      updated[index] = { ...updated[index], [field]: val };
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
        { name: '', address: '', city: '', state: '', zipCode: '', weight: '', pickUpDate: '', remarks: '' } // 👈 remarks added
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
        { name: '', address: '', city: '', state: '', zipCode: '', weight: '', dropDate: '', remarks: '' } // 👈 remarks added
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
  // ⬇️ REPLACE your handleFileChange
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setFormData(prev => ({ ...prev, docs: null }));
      setErrors(prev => ({ ...prev, docs: 'Please upload a document.' }));
      return;
    }

    if (!ALLOWED_MIME.includes(file.type)) {
      setFormData(prev => ({ ...prev, docs: null }));
      setErrors(prev => ({ ...prev, docs: 'Allowed types: PDF, DOC, DOCX, JPG, PNG.' }));
      alertify.error('Allowed types: PDF, DOC, DOCX, JPG, PNG');
      return;
    }

    const sizeMB = file.size / 1024 / 1024;
    if (sizeMB > MAX_DOC_MB) {
      setFormData(prev => ({ ...prev, docs: null }));
      setErrors(prev => ({ ...prev, docs: 'Please upload less than 10 MB.' }));
      alertify.error('Please upload less than 10 MB.');
      return;
    }

    setFormData(prev => ({ ...prev, docs: file }));
    setErrors(prev => ({ ...prev, docs: '' }));
  };


  // Handle charges popup
  const handleChargesClick = () => {
    console.log('Charges popup opened, current charges state:', charges);
    setShowChargesPopup(true);
  };
  // ===== Carrier Fees validation state & helpers =====
  const [chargeErrors, setChargeErrors] = useState([{ name: '', quantity: '', amt: '' }]);
  const [chargesPopupError, setChargesPopupError] = useState('');

  // keep errors array size in sync with charges rows
  useEffect(() => {
    setChargeErrors(prev =>
      (charges || []).map((_, i) => prev[i] || { name: '', quantity: '', amt: '' })
    );
  }, [charges]);

  // only letters & spaces (for charge name)
  const onlyAlpha = (s = '') => s.replace(/[^A-Za-z ]/g, '');

  // positive integers only (typing-friendly; empty allowed)
  const clampPosInt = (s = '') => s.replace(/[^\d]/g, '');

  // block e/E/+/-/. in number inputs (no negatives/scientific)
  const blockIntNoSign = (e) => {
    if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault();
  };

  // Handle charges input change
  // ✅ Replace your handleChargeChange with this
  const handleChargeChange = (index, field, value) => {
    const updated = [...charges];

    if (field === 'name') value = onlyAlpha(value);
    if (field === 'quantity' || field === 'amt') value = clampPosInt(value);

    updated[index] = { ...updated[index], [field]: value };

    // total = quantity * amount (integers; zero allowed for live calc)
    const q = parseInt(updated[index].quantity, 10) || 0;
    const a = parseInt(updated[index].amt, 10) || 0;
    updated[index].total = q * a;

    setCharges(updated);

    // clear inline error as user fixes the field
    setChargeErrors(prev => {
      const next = [...prev];
      next[index] = { ...next[index] };
      if (field === 'name') next[index].name = '';
      if (field === 'quantity') next[index].quantity = '';
      if (field === 'amt') next[index].amt = '';
      return next;
    });
    setChargesPopupError('');
  };

  // ✅ Replace your addCharge with this (keeps errors array in sync)
  const addCharge = () => {
    setCharges(prev => [...prev, { name: '', quantity: '', amt: '', total: 0 }]);
    setChargeErrors(prev => [...prev, { name: '', quantity: '', amt: '' }]);
  };

  // ✅ Replace your removeCharge with this (keeps errors array in sync)
  const removeCharge = (index) => {
    if (charges.length > 1) {
      setCharges(prev => prev.filter((_, i) => i !== index));
      setChargeErrors(prev => prev.filter((_, i) => i !== index));
    }
  };

  // ✅ Replace your applyCharges with this (popup-inside validation)
  const applyCharges = async () => {
    // 1) Nothing entered at all?
    const allEmpty = (charges || []).every(
      ch => !(ch?.name?.trim()) && !(String(ch?.quantity ?? '') !== '') && !(String(ch?.amt ?? '') !== '')
    );
    if (allEmpty) {
      setChargesPopupError('Please add Carrier Fees .');
      setChargeErrors(charges.map(() => ({ name: '', quantity: '', amt: '' })));
      return;
    }

    // 2) Row-wise validation
    const nextErrs = (charges || []).map((ch) => {
      const row = { name: '', quantity: '', amt: '' };
      const hasAny = (ch?.name || ch?.quantity || ch?.amt);

      if (hasAny) {
        // Name: required + alphabets only
        if (!ch?.name?.trim()) row.name = 'Please enter the charge name';
        else if (!/^[A-Za-z ]+$/.test(ch.name.trim())) row.name = 'Name should contain only alphabets';

        // Quantity: required + positive integer
        if (ch?.quantity === '' || ch?.quantity === undefined) row.quantity = 'Please enter the Quantity';
        else if (!/^[1-9]\d*$/.test(String(ch.quantity))) row.quantity = 'Quantity must be a positive integer';

        // Amount: required + positive integer
        if (ch?.amt === '' || ch?.amt === undefined) row.amt = 'Please enter the amount';
        else if (!/^[1-9]\d*$/.test(String(ch.amt))) row.amt = 'Amount must be a positive integer';
      }
      return row;
    });

    const hasErrors = nextErrs.some(r => r.name || r.quantity || r.amt);
    setChargeErrors(nextErrs);

    if (hasErrors) {
      setChargesPopupError('Please correct the charge rows (Name*, Quantity*, Amount*).');
      return; // keep popup open
    }

    // 3) Valid -> compute & apply to form
    const totalCharges = (charges || []).reduce((sum, ch) => sum + (Number(ch.total) || 0), 0);
    setFormData(prev => ({ ...prev, carrierFees: String(totalCharges) }));

    // If editing, push immediately to backend (optional – your previous logic)
    if (editingOrder && editingOrder._id) {
      const carrierFeesData = (charges || []).map(ch => ({
        name: ch.name.trim(),
        quantity: parseInt(ch.quantity, 10) || 0,
        amount: parseInt(ch.amt, 10) || 0,
        total: parseInt(ch.total, 10) || 0,
      }));
      await updateCarrierFees(editingOrder._id, carrierFeesData);
    }

    setChargesPopupError('');
    setShowChargesPopup(false);
  };



  // --- SHIPPER NAME: helpers ---
  const blockNonAlphaKeys = (e) => {
    // allow controls
    const ctrl = e.ctrlKey || e.metaKey;
    const allow = [
      'Backspace', 'Delete', 'Tab', 'Enter', 'Escape', 'ArrowLeft', 'ArrowRight', 'Home', 'End'
    ];
    if (allow.includes(e.key) || (ctrl && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase()))) return;

    // block non-letters/non-space single chars
    if (e.key.length === 1 && !/[A-Za-z ]/.test(e.key)) e.preventDefault();
  };

  const sanitizeAlphaSpaces = (s = '') => s.replace(/[^A-Za-z ]/g, '');

  // Real-time shipper name handler (sanitizes + clears/sets error)
  const handleShipperNameChange = (e) => {
    const raw = e.target.value;
    const val = sanitizeAlphaSpaces(raw);

    setFormData(prev => ({ ...prev, shipperName: val }));

    setErrors(prev => {
      const next = { ...prev, shipper: { ...(prev.shipper || {}) } };
      if (!val.trim()) next.shipper.shipperName = 'Please enter the Shipper Name ';
      else if (!/^[A-Za-z ]+$/.test(val.trim())) next.shipper.shipperName = 'Shipper Name should contain only alphabets';
      else next.shipper.shipperName = '';
      return next;
    });
  };

  // Close charges popup
  const closeChargesPopup = () => {
    setShowChargesPopup(false);
  };

  // Handle form submission
  // REPLACE THIS BLOCK: handleSubmit (JSON payload aur FormData me locations.weight bhejna; shipper.weight hata do)
  // DROP-IN REPLACEMENT for your handleSubmit
  // ✅ REPLACE: handleSubmit (remarks included in locations JSON + multipart)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm('add')) { focusFirstError(); return; }

    try {
      setSubmitting(true);

      // validations
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

      // user/emp
      const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
      const user = JSON.parse(userStr || '{}');
      const empId = user.empId || "EMP001";

      // customers
      const customersWithTotals = formData.customers.map(c => {
        const lh = toNum2(c.lineHaul);
        const fsc = toNum2(c.fsc);
        const oth = toNum2(c.other);
        return {
          billTo: c.billTo,
          dispatcherName: c.dispatcherName,
          workOrderNo: c.workOrderNo,
          lineHaul: lh,
          fsc: fsc,
          other: oth,
          totalAmount: toNum2(lh + fsc + oth),
        };
      });



      // carrier (from charges)
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

      // plain JSON payload (remarks included)
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
            weight: l.weight === '' ? 0 : parseInt(l.weight) || 0,
            pickUpDate: l.pickUpDate || '',
            remarks: l.remarks || '' // 👈
          })),
          containerNo: formData.containerNo,
          containerType: formData.containerType,
          dropLocations: formData.dropLocations.map(l => ({
            name: l.name,
            address: l.address,
            city: l.city,
            state: l.state,
            zipCode: l.zipCode,
            weight: l.weight === '' ? 0 : parseInt(l.weight) || 0,
            dropDate: l.dropDate || '',
            remarks: l.remarks || '' // 👈
          }))
        },
        remarks: formData.remarks
      };

      const token = sessionStorage.getItem("token") || localStorage.getItem("token");

      let response;

      // MULTIPART (file attached) — shipper/carrier strings me with remarks
      if (formData.docs) {
        const fd = new FormData();
        fd.append('empId', empId);

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
          containerNo: formData.containerNo,
          containerType: formData.containerType,
          pickUpLocations: formData.pickupLocations.map(l => ({
            name: l.name,
            address: l.address,
            city: l.city,
            state: l.state,
            zipCode: l.zipCode,
            weight: l.weight === '' ? 0 : parseInt(l.weight) || 0,
            pickUpDate: l.pickUpDate || '',
            remarks: l.remarks || '' // 👈
          })),
          dropLocations: formData.dropLocations.map(l => ({
            name: l.name,
            address: l.address,
            city: l.city,
            state: l.state,
            zipCode: l.zipCode,
            weight: l.weight === '' ? 0 : parseInt(l.weight) || 0,
            dropDate: l.dropDate || '',
            remarks: l.remarks || '' // 👈
          })),
        };

        fd.append('customers', JSON.stringify(customersWithTotals));
        fd.append('carrier', JSON.stringify(carrierJSON));
        fd.append('shipper', JSON.stringify(shipperJSON));
        fd.append('remarks', formData.remarks || '');
        fd.append('document', formData.docs);

        response = await axios.post(`${API_CONFIG.BASE_URL}/api/v1/do/do`, fd, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // plain JSON
        response = await axios.post(`${API_CONFIG.BASE_URL}/api/v1/do/do`, submitData, {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        });
      }

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
          pickupLocations: [{ name: '', address: '', city: '', state: '', zipCode: '', weight: '', pickUpDate: '', remarks: '' }],
          dropLocations: [{ name: '', address: '', city: '', state: '', zipCode: '', weight: '', dropDate: '', remarks: '' }],
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

  // ⬇️ ADD this function anywhere inside the component
  const validateForm = (mode = formMode) => {
    const next = {
      customers: [],
      carrier: {},
      shipper: {},
      pickups: [],
      drops: [],
      docs: ''
    };

    // --- Customers validation ---
    (formData.customers || []).forEach((c, idx) => {
      const rowErr = {};

      // 1) Company (Bill To)
      if (!c.billTo) rowErr.billTo = 'Please select the company name.';

      // 2) Dispatcher
      if (!c.dispatcherName) rowErr.dispatcherName = 'Please select the Dispatcher name.';

      // 3) Work Order No (required + alphanumeric)
      if (!c.workOrderNo) rowErr.workOrderNo = 'Please enter the Work Order Number.';
      else if (!isAlnum(c.workOrderNo)) rowErr.workOrderNo = 'Work Order Number must be alphanumeric.';

      // 4/5/6) Money-like fields: integer only, non-negative
      if (c.lineHaul === '' || c.lineHaul === null) rowErr.lineHaul = 'Please enter the Line Haul.';
      else if (!isMoney2dp(c.lineHaul)) rowErr.lineHaul = 'Enter a non-negative amount (max 2 decimals).';

      if (c.fsc === '' || c.fsc === null) rowErr.fsc = 'Please enter the FSC.';
      else if (!isMoney2dp(c.fsc)) rowErr.fsc = 'Enter a non-negative amount (max 2 decimals).';

      if (c.other === '' || c.other === null) rowErr.other = 'Please enter the Other.';
      else if (!isMoney2dp(c.other)) rowErr.other = 'Enter a non-negative amount (max 2 decimals).';


      next.customers[idx] = rowErr;
    });

    // --- Carrier section ---
    // --- Carrier section ---
    if (!formData.carrierName?.trim()) next.carrier.carrierName = 'Please enter the Carrier Name.';
    if (!formData.equipmentType?.trim()) next.carrier.equipmentType = 'Please enter the Equipment Type .';

    // Carrier Fees via charges[]
    const rows = charges || [];
    const hasAnyRow = rows.some(r =>
      (r?.name?.trim()) || (String(r?.quantity ?? '') !== '') || (String(r?.amt ?? '') !== '')
    );
    if (!hasAnyRow) {
      next.carrier.fees = 'Please add Carrier Fees .';
    }

    next.carrier.chargeRows = rows.map((r) => {
      const rErr = {};

      // Name: required + alphabets only
      if (!r.name?.trim()) rErr.name = 'Please enter the charge name';
      else if (!/^[A-Za-z ]+$/.test(r.name.trim())) rErr.name = 'Name should contain only alphabets';

      // Quantity: required + positive integer
      if (r.quantity === '' || r.quantity === null || r.quantity === undefined) {
        rErr.quantity = 'Please enter the Quantity';
      } else if (!/^[1-9]\d*$/.test(String(r.quantity))) {
        rErr.quantity = 'Quantity must be a positive integer';
      }

      // Amount: required + positive integer
      if (r.amt === '' || r.amt === null || r.amt === undefined) {
        rErr.amt = 'Please enter the amount';
      } else if (!/^[1-9]\d*$/.test(String(r.amt))) {
        rErr.amt = 'Amount must be a positive integer';
      }

      return rErr;
    });

    const anyChargeError = next.carrier.chargeRows.some(r => r.name || r.quantity || r.amt);
    if (anyChargeError) {
      next.carrier.fees = next.carrier.fees || 'Please correct the charge rows (Name*, Quantity*, Amount*).';
    }


    // --- Shipper ---
    if (!formData.shipperName?.trim()) {
      next.shipper.shipperName = 'Please enter the Shipper Name ';
    } else if (!/^[A-Za-z ]+$/.test(formData.shipperName.trim())) {
      next.shipper.shipperName = 'Shipper Name should contain only alphabets';
    }

    if (!formData.containerNo) next.shipper.containerNo = 'Please enter the Container Number  .';
    if (!formData.containerType) next.shipper.containerType = 'Please enter the Container Type  .';

    // --- Pickup Locations ---
    (formData.pickupLocations || []).forEach((l, i) => {
      const lErr = {};
      if (!l.name) lErr.name = 'Please enter the Location Name .';
      if (!l.address) lErr.address = 'Please enter the address .';
      if (!l.city) lErr.city = 'Please enter the city .';
      if (!l.state) lErr.state = 'Please enter the state .';
      if (!l.zipCode) lErr.zipCode = 'Please enter the zip code .';
      else if (!/^[A-Za-z0-9]+$/.test(l.zipCode)) lErr.zipCode = 'Zip code must be alphanumeric only.';
      else if (!isZip(l.zipCode)) lErr.zipCode = 'Enter a valid ZIP/Postal code.';

      if (l.weight === '' || l.weight === null) {
        lErr.weight = 'Please enter the weight.';
      } else if (!isNonNegInt(l.weight)) {
        lErr.weight = 'Weight must be a non-negative integer (0 allowed).';
      }

      if (!l.pickUpDate) lErr.pickUpDate = 'Please select the pickup date.';
      next.pickups[i] = lErr;
    });

    // --- Drop Locations ---
    (formData.dropLocations || []).forEach((l, i) => {
      const lErr = {};
      if (!l.name) lErr.name = 'Please enter the Location Name .';
      if (!l.address) lErr.address = 'Please enter the address .';
      if (!l.city) lErr.city = 'Please enter the city .';
      if (!l.state) lErr.state = 'Please enter the state .';
      if (!l.zipCode) lErr.zipCode = 'Please enter the zip code .';
      else if (!isZip(l.zipCode)) lErr.zipCode = 'Enter a valid ZIP/Postal code.';
      if (l.weight === '' || l.weight === null) {
        lErr.weight = 'Please enter the weight.';
      } else if (!isNonNegInt(l.weight)) {
        lErr.weight = 'Weight must be a non-negative integer (0 allowed).';
      }

      if (!l.dropDate) lErr.dropDate = 'Please select the drop date.';
      next.drops[i] = lErr;
    });

    // --- Docs (required on ADD; optional on EDIT unless you want to force it) ---
    if (mode !== 'edit') {
      if (!formData.docs) next.docs = 'Please upload a document.';
    }

    setErrors(next);

    // Decide valid
    const hasCustomerErr = next.customers.some(row => Object.keys(row || {}).length);
    const hasPickErr = next.pickups.some(row => Object.keys(row || {}).length);
    const hasDropErr = next.drops.some(row => Object.keys(row || {}).length);
    const hasCarrierErr =
      Object.keys(next.carrier || {}).length &&
      (next.carrier.carrierName || next.carrier.equipmentType || next.carrier.fees ||
        (Array.isArray(next.carrier.chargeRows) && next.carrier.chargeRows.some(r => r.name || r.quantity || r.amt)));

    const valid = !(
      hasCustomerErr || hasPickErr || hasDropErr || hasCarrierErr || next.shipper.shipperName || next.shipper.containerNo || next.shipper.containerType || next.docs
    );


    return valid;
  };



  // Reset form when modal closes
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

      // Shipper Information
      shipperName: '',
      containerNo: '',
      containerType: '',

      // Pickup Locations — with weight, date, remarks
      pickupLocations: [
        {
          name: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          weight: '',
          pickUpDate: '',
          remarks: '' // 👈
        }
      ],

      // Drop Locations — with weight, date, remarks
      dropLocations: [
        {
          name: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          weight: '',
          dropDate: '',
          remarks: '' // 👈
        }
      ],

      // General
      remarks: '',
      docs: null
    });

    // Reset charges state
    setCharges([{ name: '', quantity: '', amt: '', total: 0 }]);
    setShowChargesPopup(false);
    setFormMode('add');
    setEditingOrder(null);
  };


  // View: fetch by this row's DO _id (NOT by employee)
  const handleViewOrder = async (rowOrder) => {
    try {
      const orderId =
        rowOrder.originalId ||            // we saved this while transforming list
        rowOrder._id ||                   // if present
        null;

      if (!orderId) {
        alertify.error('Order ID not found for this row');
        return;
      }

      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/do/do/${orderId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res?.data?.success && res.data.data) {
        setSelectedOrder(res.data.data);  // exact DO doc
        setShowOrderModal(true);          // open your details modal
      } else {
        alertify.error('Could not load this delivery order');
      }
    } catch (err) {
      console.error('View order failed:', err?.response?.data || err);
      alertify.error('Failed to fetch order details');
    }
  };







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
            pickUpDate: formatDateForInput(l?.pickUpDate || fullOrderData.shipper?.pickUpDate),
            weight: l?.weight ?? '',
            remarks: l?.remarks ?? '' // 👈
          })),
          dropLocations: (fullOrderData.shipper?.dropLocations || [{ name: '', address: '', city: '', state: '', zipCode: '' }]).map(l => ({
            ...l,
            dropDate: formatDateForInput(l?.dropDate || fullOrderData.shipper?.dropDate),
            weight: l?.weight ?? '',
            remarks: l?.remarks ?? '' // 👈
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
        setShowEditModal(true);
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
          weight: order.quantity || '',
          pickUpDate: '',
          remarks: '' // 👈
        }],
        dropLocations: [{
          name: order.deliveryLocation || '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          weight: '',
          dropDate: '',
          remarks: '' // 👈
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
  // ✅ REPLACE: handleCloseEditModal
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

      // Shipper (NO top-level weight)
      shipperName: '',
      containerNo: '',
      containerType: '',

      // Locations with weight/date/remarks
      pickupLocations: [
        {
          name: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          weight: '',
          pickUpDate: '',
          remarks: '' // 👈
        }
      ],
      dropLocations: [
        {
          name: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          weight: '',
          dropDate: '',
          remarks: '' // 👈
        }
      ],

      remarks: '',
      docs: null
    });
  };



  // Handle delete order (mark as inactive)
  const handleDeleteOrder = async (e) => {
    e.preventDefault();
    try {
      if (!orderToDelete || !deleteReason.trim()) {
        alertify.error('Please provide a reason for deletion');
        return;
      }

      setSubmitting(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const orderId = orderToDelete.originalId || orderToDelete._id || orderToDelete.id.replace('DO-', '');

      // API call to mark order as inactive
      const response = await axios.patch(`${API_CONFIG.BASE_URL}/api/v1/do/do/${orderId}/simple-status`, {
        doStatus: "Inactive",
        statusReason: deleteReason.trim()
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        alertify.success('Delivery order marked as inactive successfully!');

        // Close modal and reset
        setShowDeleteModal(false);
        setDeleteReason('');
        setOrderToDelete(null);

        // Refresh the page to show updated data
        window.location.reload();
      } else {
        alertify.error('Failed to delete delivery order');
      }
    } catch (error) {
      console.error('Error deleting delivery order:', error);
      if (error.response?.data?.message) {
        alertify.error(`Delete failed: ${error.response.data.message}`);
      } else if (error.response) {
        alertify.error(`Delete failed: ${error.response.status} - ${error.response.statusText}`);
      } else {
        alertify.error('Failed to delete delivery order. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Open delete modal
  const openDeleteModal = (order) => {
    setOrderToDelete(order);
    setDeleteReason('');
    setShowDeleteModal(true);
  };

  // Close delete modal
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteReason('');
    setOrderToDelete(null);
  };

  // Handle update order 

  const handleUpdateOrder = async (e) => {
    e.preventDefault();
    if (!validateForm('edit')) { setSubmitting(false); focusFirstError(); return; }
    setSubmitting(true);
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");

      // Make sure we send the real Mongo _id, not "DO-xxxxxx"
      let orderId = editingOrder?._id;
      if (!orderId) { alertify.error('Order ID missing'); return; }
      if (String(orderId).startsWith('DO-')) {
        orderId = orderId.replace(/^DO-/, '');
      }

      // 👉 existing customers from the full order (to preserve loadNo & _id)
      const prevCustomers = editingOrder?.fullData?.customers || [];

      // --- REQUIRED fields quick check (BillTo/Dispatcher/W/O)
      for (let i = 0; i < (formData.customers?.length || 0); i++) {
        const c = formData.customers[i] || {};
        if (!c.billTo || !c.dispatcherName || !c.workOrderNo) {
          alertify.error(`Customer ${i + 1} ke required fields (Bill To, Dispatcher, W/O) bharo`);
          return;
        }
      }

      // --- Customers (⚠️ loadNo preserve)
      const customers = (formData.customers || []).map((c, idx) => {
        const preservedLoadNo =
          prevCustomers[idx]?.loadNo ||
          editingOrder?.doNum ||
          c.loadNo ||
          '';

        if (!preservedLoadNo) {
          alertify.error(`Customer ${idx + 1}: Load No missing`);
          throw new Error('Missing loadNo');
        }

        const lh = toNum2(c.lineHaul);
        const fsc = toNum2(c.fsc);
        const oth = toNum2(c.other);

        return {
          _id: prevCustomers[idx]?._id,
          loadNo: preservedLoadNo,
          billTo: (c.billTo || '').trim(),
          dispatcherName: (c.dispatcherName || '').trim(),
          workOrderNo: (c.workOrderNo || '').trim(),
          lineHaul: lh,
          fsc: fsc,
          other: oth,
          totalAmount: toNum2(lh + fsc + oth),
        };


      });

      // --- Carrier
      const carrierFees = (charges || [])
        .filter(ch => ch?.name)
        .map(ch => ({
          name: ch.name,
          quantity: Number(ch.quantity) || 0,
          amount: Number(ch.amt) || 0,
          total: (Number(ch.quantity) || 0) * (Number(ch.amt) || 0),
        }));

      const carrier = {
        carrierName: formData.carrierName || '',
        equipmentType: formData.equipmentType || '',
        carrierFees,
        totalCarrierFees: carrierFees.reduce((s, f) => s + (f.total || 0), 0),
      };

      // --- Shipper + per-location fields
      const shipper = {
        name: formData.shipperName || '',
        containerNo: formData.containerNo || '',
        containerType: formData.containerType || '',
        pickUpLocations: (formData.pickupLocations || []).map(l => ({
          name: l.name || '',
          address: l.address || '',
          city: l.city || '',
          state: l.state || '',
          zipCode: l.zipCode || '',
          weight: l.weight === '' ? 0 : Number(l.weight) || 0,
          pickUpDate: l.pickUpDate || '',
          remarks: l.remarks || ''
        })),
        dropLocations: (formData.dropLocations || []).map(l => ({
          name: l.name || '',
          address: l.address || '',
          city: l.city || '',
          state: l.state || '',
          zipCode: l.zipCode || '',
          weight: l.weight === '' ? 0 : Number(l.weight) || 0,
          dropDate: l.dropDate || '',
          remarks: l.remarks || ''
        })),
      };

      const updatePayload = {
        customers,  // ✅ includes loadNo
        carrier,
        shipper,
        remarks: formData.remarks || '',
      };

      // 1) JSON update
      const res = await axios.put(
        `${API_CONFIG.BASE_URL}/api/v1/do/do/${orderId}`,
        updatePayload,
        { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }
      );

      if (!res?.data?.success) {
        alertify.error(res?.data?.message || 'Update failed');
        return;
      }

      // 2) OPTIONAL document upload — same versioned base path to avoid 404
      if (formData.docs && formData.docs instanceof File) {
        try {
          const fd = new FormData();
          // NOTE: Change 'document' -> 'file' if your backend expects 'file'
          fd.append('document', formData.docs);

          const uploadUrl = `${API_CONFIG.BASE_URL}/api/v1/do/do/${orderId}/upload`;
          console.debug('Uploading document to:', uploadUrl, 'orderId:', orderId);

          const upRes = await axios.put(uploadUrl, fd, {
            headers: { Authorization: `Bearer ${token}` }, // axios sets multipart boundary automatically
            timeout: 20000,
          });

          if (upRes?.data?.success) {
            alertify.success('Document uploaded');
          } else {
            alertify.warning(upRes?.data?.message ? `Document upload failed: ${upRes.data.message}` : 'Document upload failed');
          }
        } catch (upErr) {
          console.error('Upload error:', upErr?.response?.data || upErr);
          const msg = upErr?.response?.data?.message || upErr?.message || 'Unknown error';
          alertify.warning(`Order updated, but document upload failed: ${msg}`);
        }
      }

      alertify.success('Delivery order updated!');
      setShowAddOrderForm(false);
      setEditingOrder(null);
      fetchOrders();
    } catch (err) {
      console.error('Update error:', err?.response?.data || err);
      alertify.error(err?.response?.data?.message || err.message || 'Failed to update delivery order');
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

  const generateRateLoadConfirmationPDF = async (order) => {
    try {
      // 1) Dispatcher info
      let dispatcherPhone = 'N/A';
      let dispatcherEmail = 'N/A';
      try {
        const cmtUsers = await apiService.getCMTUsers();
        const dispatcher = cmtUsers.find(
          (user) => user.aliasName === ((order.customers && order.customers[0] && order.customers[0].dispatcherName) || '')
        );
        if (dispatcher) {
          dispatcherPhone = dispatcher.mobileNo || 'N/A';
          dispatcherEmail = dispatcher.email || 'N/A';
        }
      } catch (err) {
        console.error('Error fetching dispatcher info:', err);
      }

      // 2) Helpers (NO nullish + logical mixing)
      const toNum = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };
      const currency = (n) =>
        Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const formatDateStr = (d) => {
        if (!d) return 'N/A';
        try { return new Date(d).toLocaleDateString(); } catch { return 'N/A'; }
      };
      const formatDateStrUS = (d) => {
        if (!d) return 'N/A';
        try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }); } catch { return 'N/A'; }
      };
      const formatAddr = (l) => {
        if (!l) return 'N/A';
        const parts = [l.address, l.city, l.state, l.zipCode].filter(Boolean);
        return parts.length ? parts.join(', ') : 'N/A';
      };

      // 3) Carrier fees (names + qty + rate + total)
      const rawFees = (order.carrier && Array.isArray(order.carrier.carrierFees)) ? order.carrier.carrierFees : [];
      const feeEntries = rawFees.map((ch, idx) => {
        let qtyRaw;
        if (ch && ch.qty !== undefined && ch.qty !== null) qtyRaw = ch.qty;
        else if (ch && ch.quantity !== undefined && ch.quantity !== null) qtyRaw = ch.quantity;
        else qtyRaw = 1;
        const qty = toNum(qtyRaw) || 1;

        let rateRaw = (ch && ch.rate !== undefined && ch.rate !== null) ? ch.rate : 0;
        const rate = toNum(rateRaw);

        let totalRaw = null;
        if (ch && ch.total !== undefined && ch.total !== null) totalRaw = ch.total;
        else if (ch && ch.amount !== undefined && ch.amount !== null) totalRaw = ch.amount;
        const total = totalRaw !== null ? toNum(totalRaw) : (rate * qty);

        let desc = 'Charge ' + (idx + 1);
        if (ch && ch.description) desc = ch.description;
        else if (ch && ch.name) desc = ch.name;
        else if (ch && ch.type) desc = ch.type;

        return { desc, qty, rate, total };
      });
      const totalCarrierFees = feeEntries.reduce((s, it) => s + toNum(it.total), 0);

      // Carrier Charges list (under Carrier Info)
      const chargesListItemsHTML = feeEntries.length
        ? feeEntries.map((it) =>
          '<div style="display:flex;justify-content:space-between;align-items:center;border:1px solid #ececec;border-radius:8px;padding:8px 10px;margin:6px 0;">' +
          `<div><div style="font-weight:700;">${it.desc}</div><div style="font-size:11px;color:#555;">Quantity: ${it.qty} × Amount: $${currency(it.rate)}</div></div>` +
          `<div style="font-weight:700;">$ ${currency(it.total)}</div>` +
          '</div>'
        ).join('')
        : '<div style="color:#777;border:1px dashed #ccc;border-radius:8px;padding:8px 10px;">No carrier charges</div>';

      const chargesListHTML =
        '<div style="margin:-6px 0 10px 0;padding:10px;border:1px solid #f0e8ff;background:#fbf7ff;border-radius:10px;">' +
        '<h4 style="font-size:12px;margin:0 0 8px 0;color:#2c3e50;">Carrier Charges</h4>' +
        chargesListItemsHTML +
        '</div>';

      // 4) Pickup/Drop sections (EACH location separately)
      const ship = order.shipper || {};
      const pickUps = Array.isArray(ship.pickUpLocations) ? ship.pickUpLocations : [];
      const drops = Array.isArray(ship.dropLocations) ? ship.dropLocations : [];

      const pickupSectionsHTML = pickUps.length
        ? pickUps.map((l, i) => {
          const addr = formatAddr(l);
          const dateStr = formatDateStr(l && l.pickUpDate);
          const hoursLabel = 'Shipping Hours';
          return (
            '<table class="rates-table">' +
            '<thead><tr><th colspan="2" style="text-align:left;background:#f0f0f0;font-size:14px;font-weight:bold;">Pickup Location ' + (i + 1) + '</th></tr></thead>' +
            '<tbody>' +
            '<tr>' +
            '<td colspan="2" style="padding:8px;font-weight:bold;border-bottom:1px solid #ddd;">' + addr + '</td>' +
            '</tr>' +
            '<tr>' +
            '<td style="width:50%;padding:8px;">' +
            '<strong>Date:</strong> ' + dateStr + '<br>' +
            '<strong>Time:</strong> N/A<br>' +
            '<strong>Type:</strong> ' + (ship.containerType || '40HC') + '<br>' +
            '<strong>Quantity:</strong> 1<br>' +
            '<strong>Weight:</strong> ' + ((ship.weight !== undefined && ship.weight !== null) ? ship.weight : 'N/A') + ' lbs' +
            '</td>' +
            '<td style="width:50%;padding:8px;">' +
            '<strong>Purchase Order #:</strong> N/A<br>' +
            '<strong>' + hoursLabel + ':</strong> N/A<br>' +
            '<strong>Appointment:</strong> No<br>' +
            '<strong>Container/Trailer Number:</strong> ' + (ship.containerNo || 'N/A') +
            '</td>' +
            '</tr>' +
            '</tbody>' +
            '</table>'
          );
        }).join('')
        : (
          '<table class="rates-table">' +
          '<thead><tr><th colspan="2" style="text-align:left;background:#f0f0f0;font-size:14px;font-weight:bold;">Pickup Location</th></tr></thead>' +
          '<tbody><tr><td colspan="2" style="padding:8px;">N/A</td></tr></tbody>' +
          '</table>'
        );

      const dropSectionsHTML = drops.length
        ? drops.map((l, i) => {
          const addr = formatAddr(l);
          const dateStr = formatDateStr(l && l.dropDate);
          const hoursLabel = 'Receiving Hours';
          return (
            '<table class="rates-table">' +
            '<thead><tr><th colspan="2" style="text-align:left;background:#f0f0f0;font-size:14px;font-weight:bold;">Drop Location ' + (i + 1) + '</th></tr></thead>' +
            '<tbody>' +
            '<tr>' +
            '<td colspan="2" style="padding:8px;font-weight:bold;border-bottom:1px solid #ddd;">' + addr + '</td>' +
            '</tr>' +
            '<tr>' +
            '<td style="width:50%;padding:8px;">' +
            '<strong>Date:</strong> ' + dateStr + '<br>' +
            '<strong>Time:</strong> N/A<br>' +
            '<strong>Type:</strong> ' + (ship.containerType || '40HC') + '<br>' +
            '<strong>Quantity:</strong> 1<br>' +
            '<strong>Weight:</strong> ' + ((ship.weight !== undefined && ship.weight !== null) ? ship.weight : 'N/A') + ' lbs' +
            '</td>' +
            '<td style="width:50%;padding:8px;">' +
            '<strong>Purchase Order #:</strong> N/A<br>' +
            '<strong>' + hoursLabel + ':</strong> N/A<br>' +
            '<strong>Appointment:</strong> No<br>' +
            '<strong>Container/Trailer Number:</strong> ' + (ship.containerNo || 'N/A') +
            '</td>' +
            '</tr>' +
            '</tbody>' +
            '</table>'
          );
        }).join('')
        : (
          '<table class="rates-table">' +
          '<thead><tr><th colspan="2" style="text-align:left;background:#f0f0f0;font-size:14px;font-weight:bold;">Drop Location</th></tr></thead>' +
          '<tbody><tr><td colspan="2" style="padding:8px;">N/A</td></tr></tbody>' +
          '</table>'
        );

      // 5) Bottom: total with signature
      const amountBottomBlockHTML =
        '<div style="margin-top: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9; max-width: 90%; margin-left: auto; margin-right: auto;">' +
        '<h3 style="text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 12px; color: #2c3e50;">Total Carrier Fees</h3>' +
        '<p style="text-align:center; font-size: 16px; font-weight: 700; margin: 0 0 14px 0;">$ ' + currency(totalCarrierFees) + '</p>' +
        '<div style="margin-top: 10px; font-size: 12px; line-height: 1.6;">' +
        '<p style="margin-bottom: 10px; text-align: center;">' +
        'Accepted By _________________________ Date ________________ Signature ____________________' +
        '</p>' +
        '<p style="text-align: center;">' +
        'Driver Name _________________________ Cell __________________ Truck _____________ Trailer _____________' +
        '</p>' +
        '</div>' +
        '</div>';

      // 6) Dates for header
      const todayUS = formatDateStrUS(new Date());
      const shipDateUS = formatDateStrUS(order.shipper && order.shipper.pickUpDate);

      // 7) Build HTML
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alertify.error('Popup blocked. Please allow popups and try again.');
        return;
      }

      const confirmationHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
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
      <img src="${logoSrc}" alt="Company Logo" class="logo"/>
      <div class="bill-to">
        <table style="border-collapse: collapse; width: 100%; font-size: 12px;">
          <tr>
            <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Dispatcher</td>
            <td style="padding: 2px 8px; border: 1px solid #ddd;">${(order.customers && order.customers[0] && order.customers[0].dispatcherName) || 'N/A'}</td>
            <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Load</td>
            <td style="padding: 2px 8px; border: 1px solid #ddd;">${order.doNum || (order.customers && order.customers[0] && order.customers[0].loadNo) || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Phone</td>
            <td style="padding: 2px 8px; border: 1px solid #ddd;">${dispatcherPhone}</td>
            <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Ship Date</td>
            <td style="padding: 2px 8px; border: 1px solid #ddd;">${shipDateUS}</td>
          </tr>
          <tr>
            <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Fax</td>
            <td style="padding: 2px 8px; border: 1px solid #ddd;">${(order.customers && order.customers[0] && order.customers[0].fax) || 'N/A'}</td>
            <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Today Date</td>
            <td style="padding: 2px 8px; border: 1px solid #ddd;">${todayUS}</td>
          </tr>
          <tr>
            <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Email</td>
            <td style="padding: 2px 8px; border: 1px solid #ddd;">${dispatcherEmail}</td>
            <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">W/O</td>
            <td style="padding: 2px 8px; border: 1px solid #ddd;">${(order.customers && order.customers[0] && order.customers[0].workOrderNo) || 'N/A'}</td>
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
          <th>Total Carrier Fees</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${(order.carrier && order.carrier.carrierName) || 'N/A'}</td>
          <td>${(order.carrier && order.carrier.phone) || 'N/A'}</td>
          <td>${(order.carrier && order.carrier.equipmentType) || 'N/A'}</td>
          <td>${order.status ? (order.status[0].toUpperCase() + order.status.slice(1)) : 'N/A'}</td>
          <td class="amount">$ ${currency(totalCarrierFees)}</td>
        </tr>
      </tbody>
    </table>

    <!-- Carrier Charges (names + qty + amount) -->
    ${chargesListHTML}

    <!-- Pickup Locations (each separately) -->
    ${pickupSectionsHTML}

    <!-- Drop Locations (each separately) -->
    ${dropSectionsHTML}

    <!-- Dispatcher Notes -->
    <div style="margin-top: 20px;">
      <h4 style="font-size: 14px; font-weight: bold; color:#0b0e11;">Dispatcher Notes:</h4>
    </div>
  </div>

  <!-- PAGE BREAK: Terms & Conditions (UNCHANGED, FULL) -->
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

  <!-- Bottom: Total with signature -->
  ${amountBottomBlockHTML}
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
      const billToDisplay = [companyName || 'N/A', billAddr].filter(Boolean).join('<br>');
      const workOrderNo = cust.workOrderNo || 'N/A';
      const invoiceNo = order.doNum || cust.loadNo || 'N/A';
      const todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });

      // ---- ONLY customer rates ----
      const LH = Number(cust.lineHaul) || 0;
      const FSC = Number(cust.fsc) || 0;
      const OTH = Number(cust.other) || 0;
      const CUSTOMER_TOTAL = LH + FSC + OTH;

      // helpers
      const fmtDate = (d) => {
        if (!d) return 'N/A';
        try {
          const dt = new Date(d);
          if (Number.isNaN(dt.getTime())) return 'Invalid Date';
          // Sirf date; UTC use kiya to avoid timezone issues
          return dt.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: 'UTC'
          });
        } catch (error) {
          console.error('Error formatting date:', error, d);
          return 'Invalid Date';
        }
      };

      const fullAddr = (loc) =>
        [loc?.address, loc?.city, loc?.state, loc?.zipCode].filter(Boolean).join(', ') || 'N/A';

      const pickRows = Array.isArray(order?.shipper?.pickUpLocations) ? order.shipper.pickUpLocations : [];
      const dropRows = Array.isArray(order?.shipper?.dropLocations) ? order.shipper.dropLocations : [];

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
  .billto{border-collapse:collapse;width:65%;font-size:12px;margin-left:auto}
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
      <img src="${logoSrc}" alt="Company Logo" class="logo">
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
          </tr>
        </thead>
        <tbody>
          ${pickRows.map(l => {
        const weight = (l?.weight ?? '') !== '' && l?.weight !== null ? l.weight : 'N/A';
        const contNo = l?.containerNo || order.shipper?.containerNo || 'N/A';
        const contTp = l?.containerType || order.shipper?.containerType || 'N/A';
        const qty = Number(l?.quantity ?? order.shipper?.quantity) || 1;
        const dateSrc = l?.pickUpDate || order.shipper?.pickUpDate;
        return `
              <tr>
                <td>${l?.name || 'N/A'}</td>
                <td>${fullAddr(l)}</td>
                <td>${weight}</td>
                <td>${contNo}</td>
                <td>${contTp}</td>
                <td>${qty}</td>
                <td>${fmtDate(dateSrc)}</td>
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
          </tr>
        </thead>
        <tbody>
          ${dropRows.map(l => {
        const weight = (l?.weight ?? '') !== '' && l?.weight !== null ? l.weight : 'N/A';
        const contNo = l?.containerNo || order.shipper?.containerNo || 'N/A';
        const contTp = l?.containerType || order.shipper?.containerType || 'N/A';
        const qty = Number(l?.quantity ?? order.shipper?.quantity) || 1;
        const dateSrc = l?.dropDate || order.shipper?.dropDate;
        return `
              <tr>
                <td>${l?.name || 'N/A'}</td>
                <td>${fullAddr(l)}</td>
                <td>${weight}</td>
                <td>${contNo}</td>
                <td>${contTp}</td>
                <td>${qty}</td>
                <td>${fmtDate(dateSrc)}</td>
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
                          onClick={() => handleViewOrder(order)}
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
                        {/* Only show Delete button for specific employee IDs */}
                        {(() => {
                          const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
                          if (!userStr) return null;
                          const user = JSON.parse(userStr);
                          const currentEmpId = user.empId;

                          // Only show delete button for empId "1234" and "VPL006"
                          if (currentEmpId === "1234" || currentEmpId === "VPL006") {
                            return (
                              <button
                                onClick={() => openDeleteModal(order)}
                                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                              >
                                Delete
                              </button>
                            );
                          }
                          return null;
                        })()}

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
            <form
              key={`form-${formMode}-${editingOrder?._id || 'new'}`}
              onSubmit={formMode === 'edit' ? handleUpdateOrder : handleSubmit}
              className="p-6 space-y-6"
            >
              {/* Customer Information Section */}
              {/* Customer Information Section */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-blue-800">Customer Information</h3>
                  <button type="button" onClick={addCustomer} className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition">
                    + Add Customer
                  </button>
                </div>

                {formData.customers.map((customer, customerIndex) => {
                  const cErr = errors.customers?.[customerIndex] || {};
                  return (
                    <div key={customerIndex} className="bg-white p-4 rounded-lg mb-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-md font-semibold text-gray-800">Customer {customerIndex + 1}</h4>
                        {formData.customers.length > 1 && (
                          <button type="button" onClick={() => removeCustomer(customerIndex)} className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition">
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        {/* Select Company * */}
                        <div>
                          {shippers.length > 0 ? (
                            <SearchableDropdown
                              value={customer.billTo || ''}
                              onChange={(value) => handleCustomerChange(customerIndex, 'billTo', value)}
                              options={[
                                ...(customer.billTo && !shippers.some(s => (s.compName || '') === customer.billTo)
                                  ? [{ value: customer.billTo, label: `${customer.billTo} (custom)` }]
                                  : []),
                                ...shippers.map(s => ({ value: s.compName || '', label: s.compName || '(No name)' }))
                              ]}
                              placeholder="Select Company *"
                              disabled={loadingShippers}
                              loading={loadingShippers}
                              searchPlaceholder="Search companies..."
                            />
                          ) : (
                            <input
                              type="text"
                              value={customer.billTo}
                              onChange={(e) => handleCustomerChange(customerIndex, 'billTo', e.target.value)}
                              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${cErr.billTo ? 'border-red-400' : 'border-gray-300'}`}
                              placeholder={loadingShippers ? "Loading companies..." : "Select Company *"}
                            />
                          )}
                          {cErr.billTo && <p className="text-red-600 text-xs mt-1">{cErr.billTo}</p>}
                        </div>

                        {/* Dispatcher * */}
                        <div>
                          {dispatchers.length > 0 ? (
                            <SearchableDropdown
                              value={customer.dispatcherName || ''}
                              onChange={(value) => handleCustomerChange(customerIndex, 'dispatcherName', value)}
                              options={[
                                ...(customer.dispatcherName &&
                                  !dispatchers.some(d => (d.aliasName || d.employeeName || '') === customer.dispatcherName)
                                  ? [{ value: customer.dispatcherName, label: `${customer.dispatcherName} (custom)` }]
                                  : []),
                                ...dispatchers
                                  .filter(d => (d.status || '').toLowerCase() === 'active')
                                  .sort((a, b) => (a.aliasName || a.employeeName || '').localeCompare(b.aliasName || b.employeeName || ''))
                                  .map(d => ({ value: d.aliasName || d.employeeName, label: `${d.aliasName || d.employeeName}${d.empId ? ` (${d.empId})` : ''}` }))
                              ]}
                              placeholder="Select Dispatcher *"
                              disabled={loadingDispatchers}
                              loading={loadingDispatchers}
                              searchPlaceholder="Search dispatchers..."
                            />
                          ) : (
                            <input
                              type="text"
                              value={customer.dispatcherName}
                              onChange={(e) => handleCustomerChange(customerIndex, 'dispatcherName', e.target.value)}
                              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${cErr.dispatcherName ? 'border-red-400' : 'border-gray-300'}`}
                              placeholder="Select Dispatcher *"
                            />
                          )}
                          {cErr.dispatcherName && <p className="text-red-600 text-xs mt-1">{cErr.dispatcherName}</p>}
                        </div>

                        {/* Work Order No * (alphanumeric) */}
                        <div>
                          <input
                            type="text"
                            value={customer.workOrderNo}
                            onChange={(e) => handleCustomerChange(customerIndex, 'workOrderNo', e.target.value)}
                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${cErr.workOrderNo ? 'border-red-400' : 'border-gray-300'}`}
                            // ⬇️ native guard + user-friendly tooltip
                            pattern="[A-Za-z0-9]+"
                            title="Only letters and numbers are allowed."
                            // optional: space disable (space alphanumeric nahi hai)
                            onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
                            autoComplete="off"
                            placeholder="Work Order No *"
                          />
                          {cErr.workOrderNo && <p className="text-red-600 text-xs mt-1">{cErr.workOrderNo}</p>}
                        </div>

                        {/* Line Haul * (non-negative integer) */}
                        <div>
                          <input
                            type="number"
                            value={customer.lineHaul}
                            onChange={(e) => handleCustomerChange(customerIndex, 'lineHaul', e.target.value)}

                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            onKeyDown={blockMoneyChars}

                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${cErr.lineHaul ? 'border-red-400' : 'border-gray-300'}`}
                            placeholder="Line Haul *"
                          />
                          {cErr.lineHaul && <p className="text-red-600 text-xs mt-1">{cErr.lineHaul}</p>}
                        </div>

                        {/* FSC * */}
                        <div>
                          <input
                            type="number"
                            value={customer.fsc}
                            onChange={(e) => handleCustomerChange(customerIndex, 'fsc', e.target.value)}

                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            onKeyDown={blockMoneyChars}
                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${cErr.fsc ? 'border-red-400' : 'border-gray-300'}`}
                            placeholder="FSC *"
                          />
                          {cErr.fsc && <p className="text-red-600 text-xs mt-1">{cErr.fsc}</p>}
                        </div>

                        {/* Other * */}
                        <div>
                          <input
                            type="number"
                            value={customer.other}
                            onChange={(e) => handleCustomerChange(customerIndex, 'other', e.target.value)}

                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            onKeyDown={blockMoneyChars}
                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${cErr.other ? 'border-red-400' : 'border-gray-300'}`}
                            placeholder="Other *"
                          />
                          {cErr.other && <p className="text-red-600 text-xs mt-1">{cErr.other}</p>}
                        </div>

                        {/* Total (read-only) */}
                        <div className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg flex items-center">
                          <span className="text-black-700 font-medium">Total: ${Number(customer.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>


              {/* Carrier Information Section */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800 mb-4">Carrier (Trucker) Information</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <input
                      type="text"
                      name="carrierName"
                      value={formData.carrierName}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.carrier?.carrierName ? 'border-red-400' : 'border-gray-300'}`}
                      placeholder="Carrier Name *"
                    />
                    {errors.carrier?.carrierName && <p className="text-red-600 text-xs mt-1">{errors.carrier.carrierName}</p>}
                  </div>

                  <div>
                    <input
                      type="text"
                      name="equipmentType"
                      value={formData.equipmentType}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.carrier?.equipmentType ? 'border-red-400' : 'border-gray-300'}`}
                      placeholder="Equipment Type *"
                    />
                    {errors.carrier?.equipmentType && <p className="text-red-600 text-xs mt-1">{errors.carrier.equipmentType}</p>}
                  </div>

                  {/* Carrier Fees is calculated from charges; click to open charges popup */}
                  <div>
                    <input
                      type="text"
                      name="carrierFees"
                      value={formData.carrierFees}
                      onClick={handleChargesClick}
                      readOnly
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer ${errors.carrier?.fees ? 'border-red-400' : 'border-gray-300'}`}
                      placeholder="Carrier Fees * (Click to add charges)"
                    />
                    {errors.carrier?.fees && <p className="text-red-600 text-xs mt-1">{errors.carrier.fees}</p>}
                  </div>
                </div>


              </div>


              {/* Shipper Information Section */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-800 mb-4">Shipper Information</h3>

                {/* Shipper Basic Info */}
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <input
                      name="shipperName"
                      value={formData.shipperName}
                      onChange={handleShipperNameChange}
                      onKeyDown={blockNonAlphaKeys}
                      onPaste={(e) => {
                        // paste sanitize
                        e.preventDefault();
                        const text = (e.clipboardData || window.clipboardData).getData('text');
                        const clean = sanitizeAlphaSpaces(text);
                        handleShipperNameChange({ target: { value: clean } });
                      }}
                      pattern="[A-Za-z ]+"
                      title="Only alphabets and spaces are allowed"
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2
    ${errors?.shipper?.shipperName ? 'border-red-500 bg-red-50 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'}`}
                    />
                    {errors?.shipper?.shipperName && (
                      <p className="mt-1 text-xs text-red-600">{errors.shipper.shipperName}</p>
                    )}

                  </div>

                  <div>
                    <input
                      type="text"
                      name="containerNo"
                      value={formData.containerNo}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.shipper?.containerNo ? 'border-red-400' : 'border-gray-300'}`}
                      placeholder="Container No *"
                    />
                    {errors.shipper?.containerNo && <p className="text-red-600 text-xs mt-1">{errors.shipper.containerNo}</p>}
                  </div>

                  <div>
                    <input
                      type="text"
                      name="containerType"
                      value={formData.containerType}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.shipper?.containerType ? 'border-red-400' : 'border-gray-300'}`}
                      placeholder="Container Type *"
                    />
                    {errors.shipper?.containerType && <p className="text-red-600 text-xs mt-1">{errors.shipper.containerType}</p>}
                  </div>
                </div>

                {/* Pickup Locations */}
                {/* Pickup Locations */}
                <div className="bg-white p-4 rounded-lg mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-md font-semibold text-gray-800">Pickup Locations</h4>
                    <button type="button" onClick={addPickupLocation} className="px-3 py-1 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition">
                      + Add Location
                    </button>
                  </div>

                  {formData.pickupLocations.map((location, locationIndex) => {
                    const lErr = errors.pickups?.[locationIndex] || {};
                    return (
                      <div key={locationIndex} className="bg-gray-50 p-4 rounded-lg mb-3">
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="text-sm font-semibold text-gray-700">Pickup Location {locationIndex + 1}</h5>
                          {formData.pickupLocations.length > 1 && (
                            <button type="button" onClick={() => removePickupLocation(locationIndex)} className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition">
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <input
                              type="text"
                              value={location.name}
                              onChange={(e) => handlePickupLocationChange(locationIndex, 'name', e.target.value)}
                              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${lErr.name ? 'border-red-400' : 'border-gray-300'}`}
                              placeholder="Location Name *"
                            />
                            {lErr.name && <p className="text-red-600 text-xs mt-1">{lErr.name}</p>}
                          </div>

                          <div>
                            <input
                              type="text"
                              value={location.address}
                              onChange={(e) => handlePickupLocationChange(locationIndex, 'address', e.target.value)}
                              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${lErr.address ? 'border-red-400' : 'border-gray-300'}`}
                              placeholder="Address *"
                            />
                            {lErr.address && <p className="text-red-600 text-xs mt-1">{lErr.address}</p>}
                          </div>

                          <div>
                            <input
                              type="text"
                              value={location.city}
                              onChange={(e) => handlePickupLocationChange(locationIndex, 'city', e.target.value)}
                              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${lErr.city ? 'border-red-400' : 'border-gray-300'}`}
                              placeholder="City *"
                            />
                            {lErr.city && <p className="text-red-600 text-xs mt-1">{lErr.city}</p>}
                          </div>

                          <div>
                            <input
                              type="text"
                              value={location.state}
                              onChange={(e) => handlePickupLocationChange(locationIndex, 'state', e.target.value)}
                              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${lErr.state ? 'border-red-400' : 'border-gray-300'}`}
                              placeholder="State *"
                            />
                            {lErr.state && <p className="text-red-600 text-xs mt-1">{lErr.state}</p>}
                          </div>

                          <div>
                            <input
                              type="text"
                              value={location.zipCode}
                              onChange={(e) => handlePickupLocationChange(locationIndex, 'zipCode', e.target.value)}
                              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${lErr.zipCode ? 'border-red-400' : 'border-gray-300'}`}
                              placeholder="Zip Code *"
                            />
                            {lErr.zipCode && <p className="text-red-600 text-xs mt-1">{lErr.zipCode}</p>}
                          </div>

                          <div>
                            <input
                              type="number"
                              value={formData.pickupLocations?.[locationIndex]?.weight ?? ''}
                              onChange={(e) => handlePickupLocationChange(locationIndex, 'weight', e.target.value)}
                              onKeyDown={blockIntChars}
                              min="0"
                              step="1"
                              inputMode="numeric"
                              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${lErr.weight ? 'border-red-400' : 'border-gray-300'}`}
                              placeholder="Weight (lbs) *"
                            />
                            {lErr.weight && <p className="text-red-600 text-xs mt-1">{lErr.weight}</p>}
                          </div>

                          {/* Make entire field area clickable by also focusing the input on container click */}
                          <div onClick={(e) => e.currentTarget.querySelector('input')?.focus()}>
                            <ClickableDateInput
                              value={formData.pickupLocations[0]?.pickUpDate || ''}
                              onChange={(val) => handlePickupLocationChange(0, 'pickUpDate', val)}
                              error={errors.pickups?.[0]?.pickUpDate}
                              mode="datetime"
                            />
                            {lErr.pickUpDate && <p className="text-red-600 text-xs mt-1">{lErr.pickUpDate}</p>}
                          </div>

                          <textarea
                            value={location.remarks || ''}
                            onChange={(e) => handlePickupLocationChange(locationIndex, 'remarks', e.target.value)}
                            className="col-span-3 w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mt-2"
                            placeholder="Pickup remarks (optional)"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>


                {/* Drop Locations */}
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

                  {formData.dropLocations.map((location, locationIndex) => {
                    const dErr = errors.drops?.[locationIndex] || {};
                    return (
                      <div key={locationIndex} className="bg-gray-50 p-4 rounded-lg mb-3">
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="text-sm font-semibold text-gray-700">
                            Drop Location {locationIndex + 1}
                          </h5>
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
                          {/* Location Name * */}
                          <div>
                            <input
                              type="text"
                              value={location.name}
                              onChange={(e) =>
                                handleDropLocationChange(locationIndex, 'name', e.target.value)
                              }
                              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${dErr.name ? 'border-red-400' : 'border-gray-300'
                                }`}
                              placeholder="Location Name *"
                            />
                            {dErr.name && (
                              <p className="text-red-600 text-xs mt-1">{dErr.name}</p>
                            )}
                          </div>

                          {/* Address * */}
                          <div>
                            <input
                              type="text"
                              value={location.address}
                              onChange={(e) =>
                                handleDropLocationChange(locationIndex, 'address', e.target.value)
                              }
                              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${dErr.address ? 'border-red-400' : 'border-gray-300'
                                }`}
                              placeholder="Address *"
                            />
                            {dErr.address && (
                              <p className="text-red-600 text-xs mt-1">{dErr.address}</p>
                            )}
                          </div>

                          {/* City * */}
                          <div>
                            <input
                              type="text"
                              value={location.city}
                              onChange={(e) =>
                                handleDropLocationChange(locationIndex, 'city', e.target.value)
                              }
                              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${dErr.city ? 'border-red-400' : 'border-gray-300'
                                }`}
                              placeholder="City *"
                            />
                            {dErr.city && (
                              <p className="text-red-600 text-xs mt-1">{dErr.city}</p>
                            )}
                          </div>

                          {/* State * */}
                          <div>
                            <input
                              type="text"
                              value={location.state}
                              onChange={(e) =>
                                handleDropLocationChange(locationIndex, 'state', e.target.value)
                              }
                              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${dErr.state ? 'border-red-400' : 'border-gray-300'
                                }`}
                              placeholder="State *"
                            />
                            {dErr.state && (
                              <p className="text-red-600 text-xs mt-1">{dErr.state}</p>
                            )}
                          </div>

                          {/* Zip Code * (alphanumeric + format) */}
                          <div>
                            <input
                              type="text"
                              value={location.zipCode}
                              onChange={(e) =>
                                handleDropLocationChange(locationIndex, 'zipCode', e.target.value)
                              }
                              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${dErr.zipCode ? 'border-red-400' : 'border-gray-300'
                                }`}
                              placeholder="Zip Code *"
                            />
                            {dErr.zipCode && (
                              <p className="text-red-600 text-xs mt-1">{dErr.zipCode}</p>
                            )}
                          </div>

                          {/* Weight * (digits only, positive; block e/E/+/-/.) */}
                          <div>
                            <input
                              type="number"
                              value={formData.dropLocations?.[locationIndex]?.weight ?? ''}
                              onChange={(e) =>
                                handleDropLocationChange(locationIndex, 'weight', e.target.value)
                              }
                              onKeyDown={blockIntChars}
                              min="0"
                              step="1"
                              inputMode="numeric"
                              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${dErr.weight ? 'border-red-400' : 'border-gray-300'
                                }`}
                              placeholder="Weight (lbs) *"
                            />
                            {dErr.weight && (
                              <p className="text-red-600 text-xs mt-1">{dErr.weight}</p>
                            )}
                          </div>

                          {/* Drop Date * (make whole area clickable to open picker) */}
                          <div
                            onClick={(e) => {
                              const input = e.currentTarget.querySelector('input');
                              if (input?.showPicker) input.showPicker();
                              else input?.focus();
                            }}
                          >
                            <input
                              type="datetime-local"
                              value={location.dropDate}
                              onChange={(e) =>
                                handleDropLocationChange(locationIndex, 'dropDate', e.target.value)
                              }
                              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${dErr.dropDate ? 'border-red-400' : 'border-gray-300'
                                }`}
                              placeholder="Drop Date & Time *"
                            />
                            {dErr.dropDate && (
                              <p className="text-red-600 text-xs mt-1">{dErr.dropDate}</p>
                            )}
                          </div>

                          {/* Remarks (optional) */}
                          <textarea
                            value={location.remarks || ''}
                            onChange={(e) =>
                              handleDropLocationChange(locationIndex, 'remarks', e.target.value)
                            }
                            className="col-span-3 w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mt-2"
                            placeholder="Drop remarks (optional)"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>

              {/* Document Upload */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Document Upload <span className="text-red-500">*</span></h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-center w-full">
                    <label htmlFor="file-upload" className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${errors.docs ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}>
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {/* ...icon... */}
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PDF, DOC, DOCX, JPG, PNG (MAX. 10MB)</p>
                      </div>
                      <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                    </label>
                  </div>

                  {errors.docs && <p className="text-red-600 text-xs">{errors.docs}</p>}

                  {formData.docs && (
                    <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {/* ...icon... */}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{formData.docs.name}</p>
                          <p className="text-xs text-gray-500">{(formData.docs.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, docs: null }))} className="text-red-500 hover:text-red-700 transition-colors">
                        {/* X icon */}
                        Remove
                      </button>
                    </div>
                  )}
                </div>
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


                    </div>

                    {/* Pickup Locations (WITH Weight and Date) */}
                    {((selectedOrder.shipper?.pickUpLocations || []).length > 0) && (
                      <div className="mt-4">
                        <h4 className="font-semibold text-gray-800 mb-3">Pickup Locations</h4>
                        <div className="space-y-3">
                          {(selectedOrder.shipper?.pickUpLocations || []).map((location, index) => (
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
                                <div>
                                  <p className="text-sm text-gray-600">Pickup Date</p>
                                  <p className="font-medium text-gray-800">
                                    {location?.pickUpDate
                                      ? (() => {
                                        try {
                                          const date = new Date(location.pickUpDate);
                                          if (isNaN(date.getTime())) {
                                            return 'Invalid Date';
                                          }
                                          // Format as UTC to avoid timezone conversion issues
                                          return date.toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            timeZone: 'UTC'
                                          });
                                        } catch (error) {
                                          console.error('Error formatting pickup date:', error, location.pickUpDate);
                                          return 'Invalid Date';
                                        }
                                      })()
                                      : 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Drop Locations (WITH Weight and Date) */}
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
                                <div>
                                  <p className="text-sm text-gray-600">Drop Date</p>
                                  <p className="font-medium text-gray-800">
                                    {location?.dropDate
                                      ? (() => {
                                        try {
                                          const date = new Date(location.dropDate);
                                          if (isNaN(date.getTime())) {
                                            return 'Invalid Date';
                                          }
                                          // Format as UTC to avoid timezone conversion issues
                                          return date.toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            timeZone: 'UTC'
                                          });
                                        } catch (error) {
                                          console.error('Error formatting drop date:', error, location.dropDate);
                                          return 'Invalid Date';
                                        }
                                      })()
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

                {/* Document Display */}
                {(selectedOrder?.docUpload || (selectedOrder?.uploadedFiles && selectedOrder.uploadedFiles.length > 0)) && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="text-blue-600" size={20} />
                      <h3 className="text-lg font-bold text-gray-800">Uploaded Documents</h3>
                    </div>

                    {/* Single Document */}
                    {selectedOrder?.docUpload && (
                      <div className="bg-white rounded-lg p-4 border border-blue-200 mb-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <p className="text-sm text-gray-600 mb-2">Document Name</p>
                            <p className="font-medium text-gray-800">{selectedOrder.docUpload}</p>
                          </div>
                          <div className="flex gap-2">
                            <a
                              href={`${API_CONFIG.BASE_URL}/${selectedOrder.docUpload}`}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                            >
                              <FaDownload size={14} />
                              Download
                            </a>
                            <button
                              onClick={() => setPreviewImg(`${API_CONFIG.BASE_URL}/${selectedOrder.docUpload}`)}
                              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                            >
                              <FileText size={14} />
                              Preview
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Multiple Documents */}
                    {selectedOrder?.uploadedFiles && selectedOrder.uploadedFiles.length > 0 && (
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
                    )}
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
                    <SearchableDropdown
                      value={selectedOrder.status || 'open'}
                      onChange={(value) => handleStatusChange(value)}
                      options={[
                        { value: 'open', label: 'Open' },
                        { value: 'close', label: 'Close' }
                      ]}
                      placeholder="Select Status"
                      searchPlaceholder="Search status..."
                    />
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

            {/* Header */}
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

              {/* Popup-wide error banner (INSIDE the popup) */}
              {chargesPopupError && (
                <div className="mb-4 -mt-2 px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
                  {chargesPopupError}
                </div>
              )}

              {/* Table header */}
              <div className="grid grid-cols-5 gap-4 bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl font-semibold text-gray-700 border border-gray-200">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Name <span className="text-red-500">*</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">#</span>
                  <span>Quantity <span className="text-red-500">*</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span>Amount <span className="text-red-500">*</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">$</span>
                  <span>Total</span>
                </div>
                <div className="text-center">Action</div>
              </div>

              {/* Rows */}
              {charges.map((charge, index) => (
                <div key={index} className="grid grid-cols-5 gap-4 items-start p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  {/* Name */}
                  <div>
                    <input
                      type="text"
                      value={charge.name}
                      onChange={(e) => handleChargeChange(index, 'name', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all
                  ${chargeErrors[index]?.name ? 'border-red-500 bg-red-50 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'}`}
                      placeholder="Enter charge name"
                    />
                    {chargeErrors[index]?.name && (
                      <p className="mt-1 text-xs text-red-600">{chargeErrors[index].name}</p>
                    )}
                  </div>

                  {/* Quantity */}
                  <div>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      onKeyDown={blockIntNoSign}
                      value={charge.quantity}
                      onChange={(e) => handleChargeChange(index, 'quantity', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all
                  ${chargeErrors[index]?.quantity ? 'border-red-500 bg-red-50 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'}`}
                      placeholder="0"
                    />
                    {chargeErrors[index]?.quantity && (
                      <p className="mt-1 text-xs text-red-600">{chargeErrors[index].quantity}</p>
                    )}
                  </div>

                  {/* Amount */}
                  <div>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      onKeyDown={blockIntNoSign}
                      value={charge.amt}
                      onChange={(e) => handleChargeChange(index, 'amt', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all
                  ${chargeErrors[index]?.amt ? 'border-red-500 bg-red-50 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'}`}
                      placeholder="0"
                    />
                    {chargeErrors[index]?.amt && (
                      <p className="mt-1 text-xs text-red-600">{chargeErrors[index].amt}</p>
                    )}
                  </div>

                  {/* Row total */}
                  <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg font-semibold text-gray-800 border border-green-200">
                    ${Number(charge.total || 0).toFixed(2)}
                  </div>

                  {/* Delete */}
                  <div className="flex justify-center pt-1">
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

              {/* Add row */}
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

              {/* Total & Apply */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-xl border border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-500 p-3 rounded-lg">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 font-medium">Total Charges</div>
                      <div className="text-2xl font-bold text-gray-800">
                        ${(charges || []).reduce((sum, ch) => sum + (Number(ch.total) || 0), 0).toFixed(2)}
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
  <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4">
    {/* Hide scrollbar for modal content */}
    <style>{`
      .hide-scrollbar::-webkit-scrollbar { display: none; }
      .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
    `}</style>

    <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto hide-scrollbar">
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
          <button onClick={handleCloseEditModal} className="text-white hover:text-gray-200 text-2xl font-bold">×</button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleUpdateOrder} className="p-6 space-y-6">
        {/* Customer Information */}
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

              <div className="grid grid-cols-4 gap-4">
                {/* Bill To (Company) */}
                <div>
                  {shippers.length > 0 ? (
                    <div className={errBox(!!errors.customers?.[customerIndex]?.billTo)}>
                      <SearchableDropdown
                        value={customer.billTo || ''}
                        onChange={(value) => handleCustomerChange(customerIndex, 'billTo', value)}
                        options={[
                          ...(customer.billTo && !shippers.some(s => (s.compName || '') === customer.billTo)
                            ? [{ value: customer.billTo, label: `${customer.billTo} (custom)` }]
                            : []
                          ),
                          ...shippers.map(s => ({ value: s.compName || '', label: s.compName || '(No name)' }))
                        ]}
                        placeholder="Select Company *"
                        disabled={loadingShippers}
                        loading={loadingShippers}
                        searchPlaceholder="Search companies..."
                        className="w-full"
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={customer.billTo}
                      onChange={(e) => handleCustomerChange(customerIndex, 'billTo', e.target.value)}
                      className={errCls(!!errors.customers?.[customerIndex]?.billTo)}
                      placeholder={loadingShippers ? "Loading companies..." : "Bill To *"}
                    />
                  )}
                  {errors.customers?.[customerIndex]?.billTo && (
                    <p className="mt-1 text-xs text-red-600">{errors.customers[customerIndex].billTo}</p>
                  )}
                </div>

                {/* Dispatcher */}
                <div>
                  {dispatchers.length > 0 ? (
                    <div className={errBox(!!errors.customers?.[customerIndex]?.dispatcherName)}>
                      <SearchableDropdown
                        value={customer.dispatcherName || ''}
                        onChange={(value) => handleCustomerChange(customerIndex, 'dispatcherName', value)}
                        options={[
                          ...(customer.dispatcherName &&
                            !dispatchers.some(d => (d.aliasName || d.employeeName || '') === customer.dispatcherName)
                              ? [{ value: customer.dispatcherName, label: `${customer.dispatcherName} (custom)` }]
                              : []
                          ),
                          ...dispatchers
                            .filter(d => (d.status || '').toLowerCase() === 'active')
                            .sort((a,b) => (a.aliasName || a.employeeName || '').localeCompare(b.aliasName || b.employeeName || ''))
                            .map(d => ({ value: d.aliasName || d.employeeName, label: `${d.aliasName || d.employeeName}${d.empId ? ` (${d.empId})` : ''}` }))
                        ]}
                        placeholder="Select Dispatcher *"
                        disabled={loadingDispatchers}
                        loading={loadingDispatchers}
                        searchPlaceholder="Search dispatchers..."
                        className="w-full"
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={customer.dispatcherName}
                      onChange={(e) => handleCustomerChange(customerIndex, 'dispatcherName', e.target.value)}
                      className={errCls(!!errors.customers?.[customerIndex]?.dispatcherName)}
                      placeholder={loadingDispatchers ? 'Loading dispatchers...' : 'Dispatcher Name *'}
                    />
                  )}
                  {errors.customers?.[customerIndex]?.dispatcherName && (
                    <p className="mt-1 text-xs text-red-600">{errors.customers[customerIndex].dispatcherName}</p>
                  )}
                </div>

                {/* Work Order No (alphanumeric only) */}
                <div>
                  <input
                    type="text"
                    value={customer.workOrderNo}
                    onChange={(e) => handleCustomerChange(customerIndex, 'workOrderNo', e.target.value)}
                    className={errCls(!!errors.customers?.[customerIndex]?.workOrderNo)}
                    placeholder="Work Order No *"
                  />
                  {errors.customers?.[customerIndex]?.workOrderNo && (
                    <p className="mt-1 text-xs text-red-600">{errors.customers[customerIndex].workOrderNo}</p>
                  )}
                </div>

                {/* Line Haul */}
                <div>
                  <input
                    type="text"
                    value={customer.lineHaul}
                    onKeyDown={blockMoneyChars}
                    onChange={(e) => handleCustomerChange(customerIndex, 'lineHaul', e.target.value)}
                    className={errCls(!!errors.customers?.[customerIndex]?.lineHaul)}
                    placeholder="Line Haul *"
                    inputMode="decimal"
                  />
                  {errors.customers?.[customerIndex]?.lineHaul && (
                    <p className="mt-1 text-xs text-red-600">{errors.customers[customerIndex].lineHaul}</p>
                  )}
                </div>

                {/* FSC */}
                <div>
                  <input
                    type="text"
                    value={customer.fsc}
                    onKeyDown={blockMoneyChars}
                    onChange={(e) => handleCustomerChange(customerIndex, 'fsc', e.target.value)}
                    className={errCls(!!errors.customers?.[customerIndex]?.fsc)}
                    placeholder="FSC *"
                    inputMode="decimal"
                  />
                  {errors.customers?.[customerIndex]?.fsc && (
                    <p className="mt-1 text-xs text-red-600">{errors.customers[customerIndex].fsc}</p>
                  )}
                </div>

                {/* Other */}
                <div>
                  <input
                    type="text"
                    value={customer.other}
                    onKeyDown={blockMoneyChars}
                    onChange={(e) => handleCustomerChange(customerIndex, 'other', e.target.value)}
                    className={errCls(!!errors.customers?.[customerIndex]?.other)}
                    placeholder="Other *"
                    inputMode="decimal"
                  />
                  {errors.customers?.[customerIndex]?.other && (
                    <p className="mt-1 text-xs text-red-600">{errors.customers[customerIndex].other}</p>
                  )}
                </div>

                {/* Total */}
                <div className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg">
                  <span className="text-gray-700 font-medium">Total: ${customer.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Carrier (Trucker) Information */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800 mb-4">Carrier (Trucker) Information</h3>
          <div className="grid grid-cols-3 gap-4">
            {/* Carrier Name */}
            <div>
              <input
                type="text"
                name="carrierName"
                value={formData.carrierName}
                onChange={handleInputChange}
                className={errCls(!!errors.carrier?.carrierName)}
                placeholder="Carrier Name *"
              />
              {errors.carrier?.carrierName && (
                <p className="mt-1 text-xs text-red-600">{errors.carrier.carrierName}</p>
              )}
            </div>

            {/* Equipment Type */}
            <div>
              <input
                type="text"
                name="equipmentType"
                value={formData.equipmentType}
                onChange={handleInputChange}
                className={errCls(!!errors.carrier?.equipmentType)}
                placeholder="Equipment Type *"
              />
              {errors.carrier?.equipmentType && (
                <p className="mt-1 text-xs text-red-600">{errors.carrier.equipmentType}</p>
              )}
            </div>

            {/* Carrier Fees (opens popup) */}
            <div>
              <input
                type="text"
                name="carrierFees"
                value={formData.carrierFees}
                onClick={handleChargesClick}
                readOnly
                className={`${errCls(!!errors.carrier?.fees)} cursor-pointer`}
                placeholder="Carrier Fees * (Click to add charges)"
                aria-invalid={!!errors.carrier?.fees}
              />
              {errors.carrier?.fees && (
                <p className="mt-1 text-xs text-red-600">{errors.carrier.fees}</p>
              )}
            </div>
          </div>
        </div>

        {/* Shipper Information */}
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-800 mb-4">Shipper Information</h3>

          {/* Shipper Basic */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            {/* Shipper Name (alpha only) */}
            <div>
              <input
                type="text"
                name="shipperName"
                value={formData.shipperName}
                onChange={handleShipperNameChange}
                onKeyDown={blockNonAlphaKeys}
                className={errCls(!!errors.shipper?.shipperName)}
                placeholder="Shipper Name *"
              />
              {errors.shipper?.shipperName && (
                <p className="mt-1 text-xs text-red-600">{errors.shipper.shipperName}</p>
              )}
            </div>

            <div>
              <input
                type="text"
                name="containerNo"
                value={formData.containerNo}
                onChange={handleInputChange}
                className={errCls(!!errors.shipper?.containerNo)}
                placeholder="Container No *"
              />
              {errors.shipper?.containerNo && (
                <p className="mt-1 text-xs text-red-600">{errors.shipper.containerNo}</p>
              )}
            </div>

            <div>
              <input
                type="text"
                name="containerType"
                value={formData.containerType}
                onChange={handleInputChange}
                className={errCls(!!errors.shipper?.containerType)}
                placeholder="Container Type *"
              />
              {errors.shipper?.containerType && (
                <p className="mt-1 text-xs text-red-600">{errors.shipper.containerType}</p>
              )}
            </div>
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
                  {/* Name */}
                  <div>
                    <input
                      type="text"
                      value={location.name}
                      onChange={(e) => handlePickupLocationChange(locationIndex, 'name', e.target.value)}
                      className={errCls(!!errors.pickups?.[locationIndex]?.name)}
                      placeholder="Location Name *"
                    />
                    {errors.pickups?.[locationIndex]?.name && (
                      <p className="mt-1 text-xs text-red-600">{errors.pickups[locationIndex].name}</p>
                    )}
                  </div>

                  {/* Address */}
                  <div>
                    <input
                      type="text"
                      value={location.address}
                      onChange={(e) => handlePickupLocationChange(locationIndex, 'address', e.target.value)}
                      className={errCls(!!errors.pickups?.[locationIndex]?.address)}
                      placeholder="Address *"
                    />
                    {errors.pickups?.[locationIndex]?.address && (
                      <p className="mt-1 text-xs text-red-600">{errors.pickups[locationIndex].address}</p>
                    )}
                  </div>

                  {/* City */}
                  <div>
                    <input
                      type="text"
                      value={location.city}
                      onChange={(e) => handlePickupLocationChange(locationIndex, 'city', e.target.value)}
                      className={errCls(!!errors.pickups?.[locationIndex]?.city)}
                      placeholder="City *"
                    />
                    {errors.pickups?.[locationIndex]?.city && (
                      <p className="mt-1 text-xs text-red-600">{errors.pickups[locationIndex].city}</p>
                    )}
                  </div>

                  {/* State */}
                  <div>
                    <input
                      type="text"
                      value={location.state}
                      onChange={(e) => handlePickupLocationChange(locationIndex, 'state', e.target.value)}
                      className={errCls(!!errors.pickups?.[locationIndex]?.state)}
                      placeholder="State *"
                    />
                    {errors.pickups?.[locationIndex]?.state && (
                      <p className="mt-1 text-xs text-red-600">{errors.pickups[locationIndex].state}</p>
                    )}
                  </div>

                  {/* Zip */}
                  <div>
                    <input
                      type="text"
                      value={location.zipCode}
                      onChange={(e) => handlePickupLocationChange(locationIndex, 'zipCode', e.target.value)}
                      className={errCls(!!errors.pickups?.[locationIndex]?.zipCode)}
                      placeholder="Zip Code *"
                    />
                    {errors.pickups?.[locationIndex]?.zipCode && (
                      <p className="mt-1 text-xs text-red-600">{errors.pickups[locationIndex].zipCode}</p>
                    )}
                  </div>

                  {/* Weight */}
                  <div>
                    <input
                      type="text"
                      value={location.weight}
                      onKeyDown={blockIntChars}
                      onChange={(e) => handlePickupLocationChange(locationIndex, 'weight', e.target.value)}
                      className={errCls(!!errors.pickups?.[locationIndex]?.weight)}
                      placeholder="Weight (lbs) *"
                      inputMode="numeric"
                    />
                    {errors.pickups?.[locationIndex]?.weight && (
                      <p className="mt-1 text-xs text-red-600">{errors.pickups[locationIndex].weight}</p>
                    )}
                  </div>

                  {/* Date - fully clickable */}
                  <div className="col-span-3">
                    <ClickableDateInput
                      value={location.pickUpDate}
                      onChange={(v) => handlePickupLocationChange(locationIndex, 'pickUpDate', v)}
                      error={errors.pickups?.[locationIndex]?.pickUpDate}
                      mode="datetime"
                      className={errors.pickups?.[locationIndex]?.pickUpDate ? 'error-field' : ''}
                      placeholder="Pickup Date & Time *"
                    />
                  </div>
                </div>

                {/* Remarks */}
                <textarea
                  value={location.remarks || ''}
                  onChange={(e) => handlePickupLocationChange(locationIndex, 'remarks', e.target.value)}
                  className="col-span-3 w-full mt-2 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Pickup remarks (optional)"
                />
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
                  {/* Name */}
                  <div>
                    <input
                      type="text"
                      value={location.name}
                      onChange={(e) => handleDropLocationChange(locationIndex, 'name', e.target.value)}
                      className={errCls(!!errors.drops?.[locationIndex]?.name)}
                      placeholder="Location Name *"
                    />
                    {errors.drops?.[locationIndex]?.name && (
                      <p className="mt-1 text-xs text-red-600">{errors.drops[locationIndex].name}</p>
                    )}
                  </div>

                  {/* Address */}
                  <div>
                    <input
                      type="text"
                      value={location.address}
                      onChange={(e) => handleDropLocationChange(locationIndex, 'address', e.target.value)}
                      className={errCls(!!errors.drops?.[locationIndex]?.address)}
                      placeholder="Address *"
                    />
                    {errors.drops?.[locationIndex]?.address && (
                      <p className="mt-1 text-xs text-red-600">{errors.drops[locationIndex].address}</p>
                    )}
                  </div>

                  {/* City */}
                  <div>
                    <input
                      type="text"
                      value={location.city}
                      onChange={(e) => handleDropLocationChange(locationIndex, 'city', e.target.value)}
                      className={errCls(!!errors.drops?.[locationIndex]?.city)}
                      placeholder="City *"
                    />
                    {errors.drops?.[locationIndex]?.city && (
                      <p className="mt-1 text-xs text-red-600">{errors.drops[locationIndex].city}</p>
                    )}
                  </div>

                  {/* State */}
                  <div>
                    <input
                      type="text"
                      value={location.state}
                      onChange={(e) => handleDropLocationChange(locationIndex, 'state', e.target.value)}
                      className={errCls(!!errors.drops?.[locationIndex]?.state)}
                      placeholder="State *"
                    />
                    {errors.drops?.[locationIndex]?.state && (
                      <p className="mt-1 text-xs text-red-600">{errors.drops[locationIndex].state}</p>
                    )}
                  </div>

                  {/* Zip */}
                  <div>
                    <input
                      type="text"
                      value={location.zipCode}
                      onChange={(e) => handleDropLocationChange(locationIndex, 'zipCode', e.target.value)}
                      className={errCls(!!errors.drops?.[locationIndex]?.zipCode)}
                      placeholder="Zip Code *"
                    />
                    {errors.drops?.[locationIndex]?.zipCode && (
                      <p className="mt-1 text-xs text-red-600">{errors.drops[locationIndex].zipCode}</p>
                    )}
                  </div>

                  {/* Weight */}
                  <div>
                    <input
                      type="text"
                      value={location.weight}
                      onKeyDown={blockIntChars}
                      onChange={(e) => handleDropLocationChange(locationIndex, 'weight', e.target.value)}
                      className={errCls(!!errors.drops?.[locationIndex]?.weight)}
                      placeholder="Weight (lbs) *"
                      inputMode="numeric"
                    />
                    {errors.drops?.[locationIndex]?.weight && (
                      <p className="mt-1 text-xs text-red-600">{errors.drops[locationIndex].weight}</p>
                    )}
                  </div>

                  {/* Date - fully clickable */}
                  <div className="col-span-3">
                    <ClickableDateInput
                      value={location.dropDate}
                      onChange={(v) => handleDropLocationChange(locationIndex, 'dropDate', v)}
                      error={errors.drops?.[locationIndex]?.dropDate}
                      mode="datetime"
                      className={errors.drops?.[locationIndex]?.dropDate ? 'error-field' : ''}
                      placeholder="Drop Date & Time *"
                    />
                  </div>
                </div>

                {/* Remarks */}
                <textarea
                  value={location.remarks || ''}
                  onChange={(e) => handleDropLocationChange(locationIndex, 'remarks', e.target.value)}
                  className="col-span-3 w-full mt-2 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Drop remarks (optional)"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Document Upload (optional in Edit) */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Document Upload <span className="text-gray-500 text-sm font-normal">(optional in Edit)</span>
          </h3>
          <p className="text-xs text-gray-500 -mt-3 mb-3">Allowed: PDF, DOC, DOCX, JPG, PNG (MAX. 10MB)</p>

          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="file-upload-edit"
                className={`flex flex-col items-center justify-center w-full h-32 border-2 ${errors.docs ? 'border-red-500 bg-red-50' : 'border-gray-300'} border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors`}
              >
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

            {errors.docs && (
              <p className="text-xs text-red-600">{errors.docs}</p>
            )}

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

        {/* Form Actions */}
        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCloseEditModal}
            disabled={submitting}
            className={`px-6 py-3 border border-gray-300 rounded-lg transition-colors ${submitting ? 'opacity-50 cursor-not-allowed text-gray-400' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold transition-colors ${submitting ? 'opacity-50 cursor-not-allowed' : 'hover:from-green-600 hover:to-green-700'}`}
            onClick={(e) => {
              // ensure validation blocks submit if invalid
              if (!validateForm('edit')) { e.preventDefault(); focusFirstError(); }
            }}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                Updating...
              </span>
            ) : (
              'Update Delivery Order'
            )}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

      {/* Delete Order Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] relative">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Delete Delivery Order</h2>
                    <p className="text-red-100">Confirm deletion</p>
                  </div>
                </div>
                <button
                  onClick={closeDeleteModal}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                    <span className="text-red-700 font-medium">Warning</span>
                  </div>
                  <p className="text-red-600 text-sm mt-2">
                    You are about to delete the delivery order <strong>{orderToDelete?.id}</strong>
                    {orderToDelete?.customers?.[0]?.loadNo && (
                      <> with Load Number <strong>{orderToDelete.customers[0].loadNo}</strong></>
                    )}.
                    This action will mark the order as inactive.
                  </p>
                </div>

                <div className="mb-4">
                  <label htmlFor="delete-reason" className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for deletion <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="delete-reason"
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    placeholder="Please provide a reason for deleting this delivery order..."
                    required
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={submitting}
                  className={`px-6 py-2 border border-gray-300 rounded-lg transition-colors ${submitting
                    ? 'opacity-50 cursor-not-allowed text-gray-400'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteOrder}
                  disabled={submitting || !deleteReason.trim()}
                  className={`px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold transition-colors ${submitting || !deleteReason.trim()
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:from-red-600 hover:to-red-700'
                    }`}
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Deleting...
                    </div>
                  ) : (
                    'Delete Order'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
