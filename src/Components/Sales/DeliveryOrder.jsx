import React, { useEffect, useState } from 'react';
import axios from 'axios';
import apiService from '../../services/apiService.js';
import { FaArrowLeft, FaDownload } from 'react-icons/fa';
import { User, Mail, Phone, Building, FileText, CheckCircle, XCircle, Clock, PlusCircle, MapPin, Truck, Calendar, DollarSign, Search, Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import Logo from '../../assets/LogoFinal.png';
import IdentificaLogo from '../../assets/identifica_logo.png';
import MtPoconoLogo from '../../assets/mtPocono.png';
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
  searchPlaceholder = "Search...",
  onOpen = null // Callback when dropdown is opened
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
  const hasError = className.includes('border-red');

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className={`w-full px-4 py-3 border rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent cursor-pointer ${hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'} ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400'
          }`}
        onClick={() => {
          if (!disabled && !loading) {
            const willOpen = !isOpen;
            setIsOpen(willOpen);
            // Call onOpen callback when opening the dropdown
            if (willOpen && onOpen && typeof onOpen === 'function') {
              onOpen();
            }
          }
        }}
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
  const ALLOWED_OTR_TYPES = [
    'Dry Van',
    'Reefer',
    'Step Deck',
    'Double Drop / Lowboy',
    'Conestoga',
    'Livestock Trailer',
    'Car Hauler',
    'Container Chassis',
    'End Dump',
    'Side Dump',
    'Hopper Bottom'
  ];
  const sanitizeAlnum = (s = "") => s.replace(/[^A-Za-z0-9-]/g, "");
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
        {/* {error && <p className="mt-1 text-xs text-red-600">{error}</p>} */}
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

  // LIVE typing ke liye: ek hi dot allow, trailing dot ko preserve, max 2 dp
  const clamp2dpLive = (s = '') => {
    let t = String(s).replace(/[^\d.]/g, '');

    // sirf pehla dot rakho
    const firstDot = t.indexOf('.');
    if (firstDot !== -1) {
      const before = t.slice(0, firstDot);
      const after = t.slice(firstDot + 1).replace(/\./g, '');
      t = `${before}.${after}`;
    }

    if (t === '.') return '0.';         // sirf dot -> 0.
    if (t.endsWith('.')) return t;      // trailing dot rehne do (user abhi digits likhega)

    if (firstDot !== -1) {
      const [int, dec = ''] = t.split('.');
      return `${int}.${dec.slice(0, 2)}`;
    }
    return t;
  };

  // Blur pe normalize (optional): "12." -> "12", "12.3" -> "12.3", "12.345" -> "12.34"
  const ensureMoney2dp = (s = '') => {
    let t = String(s).replace(/[^\d.]/g, '');
    if (!t) return '';
    // multiple dots fix
    const firstDot = t.indexOf('.');
    if (firstDot !== -1) {
      const before = t.slice(0, firstDot);
      const after = t.slice(firstDot + 1).replace(/\./g, '');
      t = `${before}.${after}`;
    }
    if (t === '.' || t === '0.') return '0';
    if (t.endsWith('.')) t = t.slice(0, -1);
    const [int, dec = ''] = t.split('.');
    return dec ? `${int}.${dec.slice(0, 2)}` : int;
  };


  // Validators

  const isAlnum = (s = '') => /^[A-Za-z0-9-]+$/.test(s.trim());
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

  // Weight ke liye: sirf digits
  const digitsOnly = (s = '') => s.replace(/\D/g, '');

  // Block invalid chars in integer-only inputs
  const blockIntChars = (e) => {
    if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault();
  };

  const [errors, setErrors] = useState({
    customers: [],      // [{billTo:'', dispatcherName:'', workOrderNo:'', lineHaul:'', fsc:'', other:''}]
    carrier: {},        // { carrierName:'', equipmentType:'', fees:'' , chargeRows:[{name:'', quantity:'', amt:''}] }
    shipper: {},        // { shipmentNo:'', containerNo:'', containerType:'' }
    pickups: [],        // [{name:'', address:'', city:'', state:'', zipCode:'', weight:'', pickUpDate:''}]
    drops: [],          // [{name:'', address:'', city:'', state:'', zipCode:'', weight:'', dropDate:''}]
    returnLocation: {},  // { address:'', city:'', state:'', zipCode:'' } for DRAYAGE
    company: '',        // Company Name validation error
    docs: ''            // error string
  });
  // --- shared error style helpers ---
  const errCls = (has) =>
    `w-full px-4 py-3 border rounded-lg focus:outline-none ${has ? 'border-red-500 bg-red-50 focus:ring-2 focus:ring-red-200 error-field'
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
  const [loads, setLoads] = useState([]);
  const [loadingLoads, setLoadingLoads] = useState(false);
  const [selectedLoadData, setSelectedLoadData] = useState(null);
  const [loadingSelectedLoad, setLoadingSelectedLoad] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [orderToAssign, setOrderToAssign] = useState(null);
  const [assigningOrder, setAssigningOrder] = useState(false);

  const logoSrc = Logo;
  // top-level states ke saath
  const [formMode, setFormMode] = useState('add'); // 'add' | 'edit' | 'duplicate'
  // ADD: shipper companies (for Bill To dropdown)
  const [shippers, setShippers] = useState([]);
  const [loadingShippers, setLoadingShippers] = useState(false);
  // ADD: truckers/carriers (for Carrier Name dropdown)
  const [truckers, setTruckers] = useState([]);
  const [loadingTruckers, setLoadingTruckers] = useState(false);
  
  // ADD: get approved truckers (for Carrier Name dropdown)
  const fetchTruckersList = async () => {
    // Skip if already loading
    if (loadingTruckers) return;
    
    try {
      setLoadingTruckers(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/truckers/all`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      // API returns { success: true, truckers: [{ carrierId, name }] }
      const truckersData = res.data?.truckers || [];
      // Map API response to match component expectations
      const list = truckersData.map(t => ({
        _id: t.carrierId,
        carrierId: t.carrierId,
        compName: t.name,
        name: t.name
      }));
      list.sort((a, b) => (a.compName || '').localeCompare(b.compName || ''));
      setTruckers(list);
    } catch (err) {
      console.error('Error loading truckers:', err);
      alertify.error('Failed to load carrier list');
      setTruckers([]);
    } finally {
      setLoadingTruckers(false);
    }
  };
  
  // ADD: get approved shippers (company names for Bill To)
  const fetchShippersList = async () => {
    // Skip if already loading
    if (loadingShippers) return;
    
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
    startDate: null,
    endDate: null,
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

      setCustomerNameInput(selectedOrder.customerName || '');
    }
  }, [selectedOrder]);
  // Charges popup state - Separate for Customer and Carrier
  const [showChargesPopup, setShowChargesPopup] = useState(false);
  const [chargesPopupType, setChargesPopupType] = useState(null); // 'customer' or 'carrier'
  const [customerCharges, setCustomerCharges] = useState([
    { name: '', quantity: '', amt: '', total: 0 }
  ]);
  const [carrierCharges, setCarrierCharges] = useState([
    { name: '', quantity: '', amt: '', total: 0 }
  ]);
  const [currentCustomerIndex, setCurrentCustomerIndex] = useState(null); // Track which customer's "Other" field is being edited
  
  // Get current charges based on popup type
  const charges = chargesPopupType === 'customer' ? customerCharges : carrierCharges;
  const setCharges = chargesPopupType === 'customer' ? setCustomerCharges : setCarrierCharges;

  // LoadType state (DRAYAGE or OTR)
  const [selectedLoadType, setSelectedLoadType] = useState('OTR');

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
    carrierId: '', // Store carrier ID for API
    equipmentType: '',
    carrierFees: '',
    totalRates: '',
    bolInformation: '',

    // Location Information (formerly Shipper Information)
    shipmentNo: '', // Changed from shipperName to shipmentNo
    shipperName: '', // Keep for display
    shipperId: '', // Store shipper ID for API
    containerNo: '',
    containerType: '',
    commodity: '', // Commodity field
    selectedLoad: '', // Load reference dropdown
    company: '', // Company field
    loadType: 'OTR', // Load type: DRAYAGE or OTR
  returnLocation: { // Return location for DRAYAGE
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      returnDate: '' // Return date for DRAYAGE
    },

    // Pickup Locations - each has weight, individual date, and remarks (optional)
    pickupLocations: [
      {
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        weight: '',
        commodity: '', // Commodity field for API
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
        commodity: '', // Commodity field for API
        dropDate: '',
        remarks: '' // 👈 NEW
      }
    ],

    remarks: '',
    bols: [{ bolNo: '' }],
    docs: null
  });



  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
  const [pagination, setPagination] = useState(null);
  const [allOrdersForCount, setAllOrdersForCount] = useState([]); // For Total Orders and Today counts
  const [activeSearchTerm, setActiveSearchTerm] = useState(''); // The actual search term used for API calls

  // Monitor customers array to ensure it's never empty
  useEffect(() => {
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
    }
  }, [formData.customers]);

  // Fetch data from API with search and pagination
  const fetchOrders = async (searchQuery = '', page = 1, limit = itemsPerPage, fetchAllForCount = false) => {
    try {
      setLoading(true);

      const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
      if (!userStr) return;
      const user = JSON.parse(userStr);
      const empId = user.empId;
      if (!empId) return;

      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      // Build query parameters
      const params = new URLSearchParams();
      if (searchQuery && searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (!fetchAllForCount) {
        params.append('page', page.toString());
        params.append('limit', limit.toString());
      }
      
      const queryString = params.toString();
      const url = `${API_CONFIG.BASE_URL}/api/v1/do/do/employee/${empId}${queryString ? `?${queryString}` : ''}`;
      
      const response = await axios.get(
        url,
        {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data && response.data.success) {
        const apiData = response.data.data || [];
        
        const transformedOrders = (Array.isArray(apiData) ? apiData : []).map(order => {
          // Handle new API response format
          // Check if it's the new format (has loadNo at top level) or old format
          const isNewFormat = order.loadNo !== undefined;
          
          let loadNo, billTo, dispatcherName, workOrderNo, lineHaul, fsc, otherCharges;
          let carrierData, shipperData;
          let puLocs = [], drLocs = [];
          let customers = [];
          
          if (isNewFormat) {
            // New API format
            loadNo = order.loadNo || 'N/A';
            billTo = order.billTo || 'N/A';
            dispatcherName = order.dispatureName || order.dispatcherName || 'N/A'; // Handle typo in API
            workOrderNo = order.workOrderNo || 'N/A';
            lineHaul = order.lineHaul || 0;
            fsc = order.fsc || 0;
            // Ensure otherCharges is always an array
            otherCharges = Array.isArray(order.other) ? order.other : [];
            carrierData = order.carrier || {};
            shipperData = order.shipper || {};
            
            // Build customers array from new format
            const otherTotal = otherCharges.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
            const totalAmount = (lineHaul || 0) + (fsc || 0) + otherTotal;
            
            customers = [{
              billTo: billTo,
              dispatcherName: dispatcherName,
              workOrderNo: workOrderNo,
              lineHaul: lineHaul,
              fsc: fsc,
              other: otherCharges,
              totalAmount: totalAmount,
              loadNo: loadNo
            }];
            
            // Try to get locations from shipper if available (for backward compatibility)
            puLocs = shipperData.pickUpLocations || shipperData.pickupLocations || [];
            drLocs = shipperData.dropLocations || shipperData.deliveryLocations || [];
            
            // Store containerNo in shipper object for backward compatibility if not already present
            // Also ensure shipmentNo is preserved
            if (order.containerNo && !shipperData.containerNo) {
              shipperData.containerNo = order.containerNo;
            }
            // Ensure shipmentNo is preserved from order level if present
            if (order.shipmentNo && !shipperData.shipmentNo) {
              shipperData.shipmentNo = order.shipmentNo;
            }
          } else {
            // Old API format (backward compatibility).
            puLocs =
              order.shipper?.pickUpLocations ||
              order.shipper?.pickupLocations || [];
            drLocs =
              order.shipper?.dropLocations ||
              order.shipper?.deliveryLocations || [];
            
            loadNo = order.customers?.[0]?.loadNo || 'N/A';
            billTo = order.customers?.[0]?.billTo || 'N/A';
            customers = order.customers || [];
            carrierData = order.carrier || {};
            shipperData = order.shipper || {};
          }

          const puW = puLocs[0]?.weight;
          const drW = drLocs[0]?.weight;

          // Calculate assignment status from assignedToCMT
          const assignmentStatus = order.assignedToCMT?.employeeName 
            ? 'assigned' 
            : (order.assignmentStatus || 'unassigned');

          // Generate a unique ID if _id is not present
          const orderId = order._id || order.id || `temp-${Date.now()}-${Math.random()}`;
          const idSuffix = String(orderId).slice(-6);

          // Handle createdBy - new format is an object with empId, employeeName, department
          const createdByData = order.createdBy || {};
          const createdByName = createdByData.employeeName 
            ? `${createdByData.employeeName} (${createdByData.empId || 'N/A'})`
            : `Employee ${order.empId || createdByData.empId || empId || 'N/A'}`;
          const createdByEmpId = createdByData.empId || order.empId || empId || 'N/A';

          return {
            id: `DO-${idSuffix}`,
            originalId: orderId,
            doNum: loadNo,
            clientName: billTo,
            clientEmail: `${(billTo || 'customer').toLowerCase().replace(/\s+/g, '')}@example.com`,
            pickupLocation: puLocs[0]?.name || shipperData?.compAdd || 'Pickup Location',
            deliveryLocation: drLocs[0]?.name || 'Delivery Location',
            amount: customers[0]?.totalAmount || 0,
            description: `Load: ${loadNo}`,
            priority: 'normal',
            status: order.status || 'open',
            assignmentStatus: assignmentStatus,
            assignedToCMT: order.assignedToCMT || null,
            createdAt: order.createdAt ? new Date(order.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            createdBy: createdByName,
            createdByEmpId: createdByEmpId,
            createdByData: createdByData, // Store full createdBy object
            containerNo: order.containerNo || shipperData?.containerNo || 'N/A', // Add containerNo (check both locations)
            docUpload: 'sample-doc.jpg',
            productName: shipperData?.containerType || 'N/A',
            quantity: (puW ?? drW ?? shipperData?.weight ?? 0),
            remarks: order.remarks || '',
            shipperName: shipperData?.compName || shipperData?.name || 'N/A',
            shipmentNo: order.shipmentNo || shipperData?.shipmentNo || 'N/A', // Add shipmentNo for consistency
            carrierName: carrierData?.compName || carrierData?.carrierName || carrierData?.name || 'N/A', // Check multiple possible fields
            carrierFees: carrierData?.totalCarrierFees || 0,
            createdBySalesUser: order.createdBySalesUser || 'N/A',
            supportingDocs: order.supportingDocs || [],
            addDispature: order.addDispature || '',
            // Store customers and shipper data for table display
            customers: customers,
            shipper: {
              ...shipperData,
              // Ensure containerNo and shipmentNo are in shipper object for view modal consistency
              containerNo: order.containerNo || shipperData?.containerNo || 'N/A',
              shipmentNo: order.shipmentNo || shipperData?.shipmentNo || 'N/A'
            },
            carrier: {
              ...carrierData,
              // Ensure carrierName is consistent
              carrierName: carrierData?.compName || carrierData?.carrierName || carrierData?.name || 'N/A'
            },
            // Store full order data for view modal
            _fullOrderData: order
          };
        });

        if (fetchAllForCount) {
          // Store all orders for Total Orders and Today counts
          setAllOrdersForCount(transformedOrders);
        } else {
          // Store paginated orders for display
          setOrders(transformedOrders);
          // Store pagination info if available
          if (response.data.pagination) {
            setPagination(response.data.pagination);
          } else {
            // Fallback: calculate pagination from data length
            setPagination({
              page: page,
              limit: limit,
              total: transformedOrders.length,
              totalPages: Math.ceil(transformedOrders.length / limit)
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      alertify.error(`Failed to load orders: ${error.response?.status || 'Network Error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all orders for Total Orders and Today counts (without pagination)
  const fetchAllOrdersForCount = async () => {
    await fetchOrders('', 1, 1, true);
  };



  // Fetch dispatchers from CMT department
  const fetchDispatchers = async () => {
    // Skip if already loading
    if (loadingDispatchers) return;
    
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

  // Fetch loads for load reference dropdown
  const fetchLoads = async () => {
    // Skip if already loading
    if (loadingLoads) return;
    
    try {
      setLoadingLoads(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");


      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/load/inhouse-created`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data && response.data.loads) {
        setLoads(response.data.loads);

      } else {
        console.error('No loads data in response:', response.data);
        setLoads([]);
      }
    } catch (error) {
      console.error('Error fetching loads:', error);
      console.error('Error details:', error.response?.data || error.message);
      alertify.error('Failed to load loads');
      setLoads([]);
    } finally {
      setLoadingLoads(false);
    }
  };

  // Live search effect with debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setActiveSearchTerm(searchTerm.trim());
      setCurrentPage(1);
    }, 800);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Initial load and page change effect
  useEffect(() => {
    // If date range is active, fetch ALL matching records (limit=1000) so we can filter client-side
    // Otherwise, fetch standard page
    const isDateFilter = range.startDate && range.endDate;
    const limit = isDateFilter ? 1000 : itemsPerPage;
    const page = isDateFilter ? 1 : currentPage; // Always fetch page 1 (full list) if doing client-side filtering
    
    fetchOrders(activeSearchTerm, page, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, activeSearchTerm, range.startDate, range.endDate]);

  // Initial load for Total Orders and Today counts
  useEffect(() => {
    fetchAllOrdersForCount(); // Fetch all orders for Total Orders and Today counts
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

      // Handle customers - convert other array back to single value for form
      const prefCustomers = (src.customers || []).map(c => {
          const lh = Number(c.lineHaul) || 0;
          const fscPercent = Number(c.fsc) || 0;
          const fscAmount = lh * (fscPercent / 100); // FSC is percentage of Line Haul
          // If other is an array, sum it up; otherwise use the value directly
          const oth = Array.isArray(c.other) 
            ? (c.otherTotal || c.other.reduce((sum, item) => sum + (Number(item?.total) || 0), 0))
            : (Number(c.other) || 0);
        return {
          billTo: c.billTo || '',
          dispatcherName: c.dispatcherName || '',
          workOrderNo: c.workOrderNo || '',
          lineHaul: String(lh),
          fsc: String(fscPercent),
          other: String(oth),
          totalAmount: lh + fscAmount + oth,
          // Store the original other array for charges popup
          chargeRows: Array.isArray(c.other) ? c.other.map(item => ({
            name: item?.name || '',
            quantity: String(item?.quantity || 0),
            amt: String(item?.amount || 0),
            total: Number(item?.total || 0)
          })) : []
        };
      });

      // Get shipperId and carrierId
      const shipperId = typeof src.shipperId === 'object' ? src.shipperId?._id : src.shipperId;
      const carrierId = typeof src.carrierId === 'object' ? src.carrierId?._id : src.carrierId;

      const prefForm = {
        customers: prefCustomers.length ? prefCustomers : [{
          billTo: '', dispatcherName: '', workOrderNo: '',
          lineHaul: '', fsc: '', other: '', totalAmount: 0
        }],

        carrierName: src.carrier?.carrierName || (typeof src.carrierId === 'object' ? src.carrierId?.compName : ''),
        carrierId: carrierId || '',
        equipmentType: src.carrier?.equipmentType || '',
        carrierFees: src.carrier?.totalCarrierFees || '',
        totalRates: src.carrier?.totalCarrierFees || '',

        shipperName: src.shipper?.name || (typeof src.shipperId === 'object' ? src.shipperId?.compName : ''),
        shipperId: shipperId || '',
        shipmentNo: src.shipper?.shipmentNo || '',
        containerNo: src.shipper?.containerNo || '',
        containerType: src.shipper?.containerType || '',
        commodity: src.shipper?.pickUpLocations?.[0]?.commodity || src.shipper?.dropLocations?.[0]?.commodity || '',
        selectedLoad: '', // Keep blank for duplicate so user can select manually
        company: src.company || src.addDispature || src.customerName || '',
        loadType: src.loadType || 'OTR',

        // Return location for DRAYAGE
        returnLocation: src.loadType === 'DRAYAGE' && src.returnLocation ? {
          name: src.returnLocation.name || src.returnLocation.locationName || '',
          address: src.returnLocation.returnFullAddress || '',
          city: src.returnLocation.city || '',
          state: src.returnLocation.state || '',
          zipCode: src.returnLocation.zipCode || '',
          returnDate: fmt(src.returnLocation.returnDate)
        } : {
          name: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          returnDate: ''
        },

        pickupLocations: (src.shipper?.pickUpLocations || [{
          name: '', address: '', city: '', state: '', zipCode: '', weight: '', commodity: '', pickUpDate: '', remarks: ''
        }]).map(l => ({
          name: l?.name || '',
          address: l?.address || '',
          city: l?.city || '',
          state: l?.state || '',
          zipCode: l?.zipCode || '',
          weight: l?.weight ?? '',
          commodity: l?.commodity || '',
          pickUpDate: fmt(l?.pickUpDate || src.shipper?.pickUpDate),
          remarks: l?.remarks ?? ''
        })),

        dropLocations: (src.shipper?.dropLocations || [{
          name: '', address: '', city: '', state: '', zipCode: '', weight: '', commodity: '', dropDate: '', remarks: ''
        }]).map(l => ({
          name: l?.name || '',
          address: l?.address || '',
          city: l?.city || '',
          state: l?.state || '',
          zipCode: l?.zipCode || '',
          weight: l?.weight ?? '',
          commodity: l?.commodity || '',
          dropDate: fmt(l?.dropDate || src.shipper?.dropDate),
          remarks: l?.remarks ?? ''
        })),

        remarks: src.remarks || '',
        bols: (src.bols && src.bols.length
          ? src.bols.map(b => ({ bolNo: b.bolNo || '' }))
          : (src.bolInformation ? [{ bolNo: src.bolInformation }] : [{ bolNo: '' }])
        ),
        docs: null,
      };

      const fees = (src.carrier?.carrierFees || []).map(f => ({
        name: f.name || '',
        quantity: Number(f.quantity) || 0,
        amt: Number(f.amount) || 0,
        total: Number(f.total) || ((Number(f.quantity) || 0) * (Number(f.amount) || 0)),
      }));

      setFormData(prefForm);
      // Set carrier charges when loading order data
      setCarrierCharges(fees.length ? fees : [{ name: '', quantity: '', amt: '', total: 0 }]);
      
      // Set load type for the form
      setSelectedLoadType(src.loadType || 'OTR');

      setEditingOrder(null);
      setFormMode('duplicate');
      setShowAddOrderForm(true);
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


  // Normalize BOL values for display in View modal
  const extractBols = (order) => {
    const out = [];
    if (Array.isArray(order?.bols)) {
      order.bols.forEach((b) => {
        const v = typeof b === 'string' ? b : (b?.bolNo || b?.number || '');
        if (v && String(v).trim()) out.push(String(v).trim());
      });
    }
    // legacy single field
    if (!out.length && order?.bolInformation) out.push(String(order.bolInformation));
    // unique
    return Array.from(new Set(out));
  };

  // Helper function to get load number from order (similar to getLoadNumber in view modal)
  const getLoadNumberForSearch = (order) => {
    if (!order) return '';

    // 1) customers[].loadNo (first non-empty)
    const fromCustomers = Array.isArray(order.customers)
      ? (order.customers.map(c => (c?.loadNo || '').trim()).find(v => v))
      : null;

    // 2) doNum field (commonly used for Load Number)
    const fromDoNum = (order.doNum || '').trim();

    // 3) legacy/other fields on order object
    const fromOrder =
      (order.loadNo || order.loadNumber || order.loadId || order.referenceNo || '').trim();

    // 4) workOrderNo as fallback
    const fromWON =
      Array.isArray(order.customers)
        ? (order.customers.map(c => (c?.workOrderNo || '').trim()).find(v => v) || '')
        : '';

    // priority: customers.loadNo → doNum → order.* → workOrderNo → ''
    return (fromCustomers || fromDoNum || fromOrder || fromWON || '').toLowerCase();
  };

  // Filter orders based on date range only (search is now server-side)
  const filteredOrders = orders.filter(order => {
    const created = order.createdAt || ''; // e.g., "2025-08-27"
    // Only apply date filter if dates are selected
    const inRange = !range.startDate || !range.endDate || (created >= ymd(range.startDate) && created <= ymd(range.endDate));
    return inRange;
  });

  // Apply date filter to allOrdersForCount for Total Orders and Today counts
  const filteredAllOrdersForCount = allOrdersForCount.filter(order => {
    const created = order.createdAt || '';
    const inRange = !range.startDate || !range.endDate || (created >= ymd(range.startDate) && created <= ymd(range.endDate));
    return inRange;
  });

  // Use filtered orders for display (date filter only, search is server-side)
  // If date filter is active, we are doing client-side pagination on the filtered result
  const isDateFilter = range.startDate && range.endDate;
  
  let currentOrders = filteredOrders;
  let totalPages = pagination?.totalPages || 1;
  let totalItems = pagination?.total || filteredOrders.length;

  if (isDateFilter) {
      // Client-side pagination logic
      totalItems = filteredOrders.length;
      totalPages = Math.ceil(totalItems / itemsPerPage);
      const startIndex = (currentPage - 1) * itemsPerPage;
      currentOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);
  }

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Update date range filter effect - only affects client-side filtering, no API call needed
  // Date filtering is done client-side on already fetched data

  // Generate smart pagination page numbers
  const getPaginationPages = () => {
    const pages = [];
    const maxVisible = 7; // Maximum visible page numbers
    
    if (totalPages <= maxVisible) {
      // If total pages are less than maxVisible, show all
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage <= 4) {
        // Near the beginning
        for (let i = 2; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // Near the end
        pages.push('ellipsis');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle
        pages.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    
    return pages;
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

  // Handle company selection
  const handleCompanyChange = (value) => {
    setFormData(prev => ({
      ...prev,
      company: value,
      addDispature: value // Also set addDispature when company is selected
    }));
  };

  // Handle load selection
  const handleLoadChange = async (value) => {
    setFormData(prev => ({
      ...prev,
      selectedLoad: value
    }));

    // Fetch load data when a load is selected
    if (value) {
      try {
        setLoadingSelectedLoad(true);

        const response = await apiService.getLoadById(value);

        if (response.success && response.load) {
          const loadData = response.load;
          setSelectedLoadData(loadData);

          // Auto-fill form fields with load data
          setFormData(prev => ({
            ...prev,
            selectedLoad: value,
            
            // Auto-fill shipper information
            shipperName: loadData.shipper?.compName || prev.shipperName,
            shipperId: loadData.shipper?._id || prev.shipperId,
            // Auto-fill container no with BOL number (priority) or container no
            containerNo: loadData.bolNumber || loadData.containerNo || prev.containerNo,
            // Auto-fill shipment no
            shipmentNo: loadData.shipmentNumber || prev.shipmentNo,
            containerType: loadData.vehicleType || prev.containerType,
            
            // Auto-fill carrier information
            carrierName: loadData.assignedTo?.compName || prev.carrierName,
            carrierId: loadData.assignedTo?._id || prev.carrierId,
            equipmentType: loadData.commodity || prev.equipmentType,
            
            // Auto-fill pickup locations
            pickupLocations: loadData.origins && loadData.origins.length > 0 ? 
              loadData.origins.map((origin, index) => {
                // Format pickupDate for datetime-local input (YYYY-MM-DDTHH:mm)
                // Try origin.pickupDate first, then fallback to loadData.pickupDate
                let formattedPickupDate = '';
                const dateSource = origin.pickupDate || loadData.pickupDate;
                if (dateSource) {
                  try {
                    const date = new Date(dateSource);
                    if (!isNaN(date.getTime())) {
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      const hours = String(date.getHours()).padStart(2, '0');
                      const minutes = String(date.getMinutes()).padStart(2, '0');
                      formattedPickupDate = `${year}-${month}-${day}T${hours}:${minutes}`;
                    }
                  } catch (e) {
                    console.error('Error formatting pickup date:', e);
                  }
                }
                
                return {
                  name: origin.addressLine1 || '', // addressLine1 goes to Location field
                  address: origin.addressLine1 || '', // addressLine1 also goes to Address field
                  city: origin.city || '',
                  state: origin.state || '',
                  zipCode: origin.zip || '', // zipCode from origins
                  weight: origin.weight || '',
                  commodity: origin.commodity || loadData.commodity || '',
                  pickUpDate: formattedPickupDate, // properly formatted datetime
                  remarks: ''
                };
              }) : prev.pickupLocations,
            
            // Auto-fill drop locations
            dropLocations: loadData.destinations && loadData.destinations.length > 0 ? 
              loadData.destinations.map((destination, index) => {
                // Format deliveryDate for datetime-local input (YYYY-MM-DDTHH:mm)
                // Try destination.deliveryDate first, then fallback to loadData.deliveryDate
                let formattedDeliveryDate = '';
                const dateSource = destination.deliveryDate || loadData.deliveryDate;
                if (dateSource) {
                  try {
                    const date = new Date(dateSource);
                    if (!isNaN(date.getTime())) {
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      const hours = String(date.getHours()).padStart(2, '0');
                      const minutes = String(date.getMinutes()).padStart(2, '0');
                      formattedDeliveryDate = `${year}-${month}-${day}T${hours}:${minutes}`;
                    }
                  } catch (e) {
                    console.error('Error formatting delivery date:', e);
                  }
                }
                
                return {
                  name: destination.addressLine1 || '', // addressLine1 goes to Location field
                  address: destination.addressLine1 || '', // addressLine1 also goes to Address field
                  city: destination.city || '',
                  state: destination.state || '',
                  zipCode: destination.zip || '', // zipCode from destinations
                  weight: destination.weight || '',
                  commodity: destination.commodity || loadData.commodity || '',
                  dropDate: formattedDeliveryDate, // properly formatted datetime
                  remarks: ''
                };
              }) : prev.dropLocations,
            
            // Auto-fill customer information with load details
            customers: [{
              billTo: loadData.shipper?.compName || prev.customers[0]?.billTo || '',
              // Keep dispatcher empty; user must select manually
              dispatcherName: prev.customers[0]?.dispatcherName || '',
              // Auto-fill work order no with shipment number
              workOrderNo: loadData.shipmentNumber || prev.customers[0]?.workOrderNo || '',
              lineHaul: loadData.rateDetails?.lineHaul || prev.customers[0]?.lineHaul || '',
              fsc: loadData.rateDetails?.fsc || prev.customers[0]?.fsc || '',
              other: loadData.rateDetails?.other?.reduce((sum, charge) => sum + (charge.total || 0), 0) || prev.customers[0]?.other || '',
              totalAmount: loadData.rate || prev.customers[0]?.totalAmount || 0,
              // Map chargeRows for customer charges popup
              chargeRows: loadData.rateDetails?.other?.map(c => ({
                name: c.name || '',
                quantity: c.quantity || 1,
                amount: c.amount || c.amt || 0,
                total: c.total || 0
              })) || prev.customers[0]?.chargeRows || []
            }],
            
            // Auto-fill BOL information
            bols: loadData.bolNumber ? [{ bolNo: loadData.bolNumber }] : prev.bols,
            
            // Auto-fill remarks with comprehensive load information
            remarks: `=== LOAD INFORMATION ===\n` +
                    `Load ID: ${loadData._id}\n` +
                    `Shipment Number: ${loadData.shipmentNumber || 'N/A'}\n` +
                    `Status: ${loadData.status}\n` +
                    `Load Type: ${loadData.loadType}\n` +
                    `Vehicle Type: ${loadData.vehicleType}\n` +
                    `Rate Type: ${loadData.rateType}\n` +
                    `Total Rate: $${loadData.rate}\n` +
                    `Weight: ${loadData.weight} lbs\n` +
                    `Commodity: ${loadData.commodity}\n` +
                    `PO Number: ${loadData.poNumber || 'N/A'}\n` +
                    `Container No: ${loadData.containerNo || 'N/A'}\n\n` +
                    `=== SHIPPER INFO ===\n` +
                    `Company: ${loadData.shipper?.compName || 'N/A'}\n` +
                    `MC/DOT: ${loadData.shipper?.mc_dot_no || 'N/A'}\n` +
                    `Location: ${loadData.shipper?.city || 'N/A'}, ${loadData.shipper?.state || 'N/A'}\n` +
                    `Phone: ${loadData.shipper?.phoneNo || 'N/A'}\n` +
                    `Email: ${loadData.shipper?.email || 'N/A'}\n\n` +
                    `=== CARRIER INFO ===\n` +
                    `Company: ${loadData.assignedTo?.compName || 'N/A'}\n` +
                    `MC/DOT: ${loadData.assignedTo?.mc_dot_no || 'N/A'}\n` +
                    `Location: ${loadData.assignedTo?.city || 'N/A'}, ${loadData.assignedTo?.state || 'N/A'}\n` +
                    `Phone: ${loadData.assignedTo?.phoneNo || 'N/A'}\n` +
                    `Email: ${loadData.assignedTo?.email || 'N/A'}\n\n` +
                    `=== DRIVER INFO ===\n` +
                    `Driver: ${loadData.acceptedBid?.driverName || 'N/A'}\n` +
                    `Phone: ${loadData.acceptedBid?.driverPhone || 'N/A'}\n` +
                    `Vehicle: ${loadData.acceptedBid?.vehicleNumber || 'N/A'}\n` +
                    `Bid Rate: $${loadData.acceptedBid?.rate || 'N/A'}\n` +
                    `Message: ${loadData.acceptedBid?.message || 'N/A'}\n\n` +
                    `=== DATES ===\n` +
                    `Pickup: ${loadData.pickupDate ? new Date(loadData.pickupDate).toLocaleDateString() : 'N/A'}\n` +
                    `Delivery: ${loadData.deliveryDate ? new Date(loadData.deliveryDate).toLocaleDateString() : 'N/A'}\n` +
                    `Bid Deadline: ${loadData.bidDeadline ? new Date(loadData.bidDeadline).toLocaleDateString() : 'N/A'}\n\n` +
                    (prev.remarks ? `=== ADDITIONAL REMARKS ===\n${prev.remarks}` : '')
          }));

          // Calculate carrier charges
          let mappedCharges = [{ name: '', quantity: '', amt: '', total: 0 }];
          let totalRatesValue = '';
          
          if (loadData.acceptedBid?.rates && Array.isArray(loadData.acceptedBid.rates) && loadData.acceptedBid.rates.length > 0) {
             mappedCharges = loadData.acceptedBid.rates.map(rate => ({
              name: rate.name || '',
              quantity: rate.quantity || '',
              amt: rate.amount || rate.amt || '', 
              total: rate.total || 0
            }));
            totalRatesValue = loadData.acceptedBid?.totalrates || loadData.acceptedBid?.totalRates || '';
          } else if (loadData.rate) {
            // Fallback: Use main load rate as a single Flat Rate
            mappedCharges = [{
                name: 'Flat Rate',
                quantity: 1,
                amt: loadData.rate,
                total: loadData.rate
            }];
            totalRatesValue = String(loadData.rate);
          }
          
          // Update state if we have valid charges
          if (totalRatesValue) {
             setCarrierCharges(mappedCharges);
             setFormData(prev => ({
              ...prev,
              totalRates: totalRatesValue,
              carrierFees: `$${Number(totalRatesValue).toFixed(2)}`
            }));
          }

          // Auto-fill attachment from acceptedBid
          if (loadData.acceptedBid?.attachment || loadData.acceptedBid?.acceptanceAttachment1) {
            const fileUrl = loadData.acceptedBid.attachment || loadData.acceptedBid.acceptanceAttachment1;
            // Extract filename or use default
            let fileName = fileUrl.split('/').pop();
            if (fileName.includes('?')) fileName = fileName.split('?')[0]; // Remove query params if any
            if (!fileName) fileName = 'attachment.pdf';
            
            try {
              // Fetch the file to create a File object for the form
              const fileRes = await fetch(fileUrl);
              if (!fileRes.ok) throw new Error('Network response was not ok');
              const blob = await fileRes.blob();
              
              const file = new File([blob], fileName, { type: blob.type });
              
              setFormData(prev => ({
                ...prev,
                docs: file
              }));
            } catch (err) {
              console.error("Error auto-filling attachment (fetch failed, falling back to reference):", err);
              // Fallback: If fetch fails (e.g. CORS), store a reference object
              setFormData(prev => ({
                ...prev,
                docs: {
                  name: fileName,
                  isExisting: true,
                  url: fileUrl,
                  size: 0
                }
              }));
            }
          }
          
          alertify.success('Load data loaded and form fields auto-filled!');
        } else {
          console.error('No load data in response:', response);
          setSelectedLoadData(null);
        }
      } catch (error) {
        console.error('Error fetching load data:', error);
        alertify.error('Failed to load selected load data');
        setSelectedLoadData(null);
      } finally {
        setLoadingSelectedLoad(false);
      }
    } else {
      // Clear load data when no load is selected
      setSelectedLoadData(null);
      setCarrierCharges([{ name: '', quantity: '', amt: '', total: 0 }]);
      
      setFormData(prev => ({
        ...prev,
        selectedLoad: '',
        
        // Reset shipper information (keep manual entries if any, or reset?)
        // Better to reset to initial state for a fresh start, or keep what user might have typed manually before?
        // User asked "mera data bhi ht jaye", so reset auto-filled fields.
        shipperName: '',
        shipperId: '',
        containerNo: '',
        shipmentNo: '',
        containerType: '',
        
        // Reset carrier information
        carrierName: '',
        carrierId: '',
        equipmentType: '',
        totalRates: '',
        carrierFees: '',
        
        // Reset pickup locations to default single empty entry
        pickupLocations: [{ name: '', address: '', city: '', state: '', zipCode: '', weight: '', commodity: '', pickUpDate: '', remarks: '' }],
        
        // Reset drop locations to default single empty entry
        dropLocations: [{ name: '', address: '', city: '', state: '', zipCode: '', weight: '', commodity: '', dropDate: '', remarks: '' }],
        
        // Reset customer information
        customers: [{
          billTo: '',
          dispatcherName: '',
          workOrderNo: '',
          lineHaul: '',
          fsc: '',
          other: '',
          totalAmount: 0,
          chargeRows: []
        }],
        
        // Reset BOLs
        bols: [{ bolNo: '' }],
        
        // Reset remarks
        remarks: '',
        
        // Reset attachment
        docs: null
      }));
    }
  };

  // Handle customer input changes
  const handleCustomerChange = (index, field, value) => {
    // ✅ Work Order Number = only alphanumeric
    if (field === 'workOrderNo') {
      value = sanitizeAlnum(value);
    }
    // money fields sanitize while typing
    if (['lineHaul', 'fsc', 'other'].includes(field)) {
      value = clamp2dpLive(value);  // ✅ live typing friendly
    }


    setFormData(prev => {
      const updatedCustomers = [...prev.customers];
      updatedCustomers[index] = {
        ...updatedCustomers[index],
        [field]: value
      };

      // Calculate total amount for this customer
      const lh = parseFloat(updatedCustomers[index].lineHaul) || 0;
      const fscPercent = parseFloat(updatedCustomers[index].fsc) || 0;
      const fscAmount = lh * (fscPercent / 100); // FSC is percentage of Line Haul
      const oth = parseFloat(updatedCustomers[index].other) || 0;
      updatedCustomers[index].totalAmount = +(lh + fscAmount + oth).toFixed(2);


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
      // ZIP => alphanumeric only, WEIGHT => allow decimals
      let val = value;
      if (field === 'zipCode') {
        val = sanitizeAlphaNum(value);
      } else if (field === 'weight') {
        // Allow decimal points for weight (max 2 decimal places)
        val = value.replace(/[^\d.]/g, '');
        // Ensure only one decimal point
        const parts = val.split('.');
        if (parts.length > 2) {
          val = parts[0] + '.' + parts.slice(1).join('');
        }
        // Limit to 2 decimal places
        if (parts[1] && parts[1].length > 2) {
          val = parts[0] + '.' + parts[1].substring(0, 2);
        }
      }

      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, pickupLocations: updated };
    });
  };



  // Handle drop location input changes
  const handleDropLocationChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.dropLocations];
      // ZIP => alphanumeric only, WEIGHT => allow decimals
      let val = value;
      if (field === 'zipCode') {
        val = sanitizeAlphaNum(value);
      } else if (field === 'weight') {
        // Allow decimal points for weight (max 2 decimal places)
        val = value.replace(/[^\d.]/g, '');
        // Ensure only one decimal point
        const parts = val.split('.');
        if (parts.length > 2) {
          val = parts[0] + '.' + parts.slice(1).join('');
        }
        // Limit to 2 decimal places
        if (parts[1] && parts[1].length > 2) {
          val = parts[0] + '.' + parts[1].substring(0, 2);
        }
      }

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
        { name: '', address: '', city: '', state: '', zipCode: '', weight: '', commodity: '', pickUpDate: '', remarks: '' } // 👈 remarks and commodity added
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
        { name: '', address: '', city: '', state: '', zipCode: '', weight: '', commodity: '', dropDate: '', remarks: '' } // 👈 remarks and commodity added
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


  // Handle charges popup for Carrier
  const handleChargesClick = () => {

    setChargesPopupType('carrier');
    setCurrentCustomerIndex(null);
    
    // In edit mode, carrierCharges state is already loaded, so use it directly
    // In add mode, load from formData if available
    if (formMode === 'edit' && carrierCharges && carrierCharges.length > 0) {
      // Edit mode: use existing carrierCharges state (already loaded)
      // No need to reload, just open popup
    } else {
      // Add mode or edit mode with empty state: load from formData
      const existingCharges = formData.carrier?.carrierFees || [];
      if (existingCharges.length > 0 && Array.isArray(existingCharges)) {
        setCarrierCharges(existingCharges.map(ch => ({
          name: ch.name || '',
          quantity: String(ch.quantity || ''),
          amt: String(ch.amt || ch.amount || ''),
          total: ch.total || 0
        })));
      } else if (!carrierCharges || carrierCharges.length === 0) {
        // Set empty if no data found
        setCarrierCharges([{ name: '', quantity: '', amt: '', total: 0 }]);
      }
    }
    setShowChargesPopup(true);
  };
  
  // Handle charges popup for Customer
  const handleCustomerChargesClick = (customerIndex) => {

    setChargesPopupType('customer');
    setCurrentCustomerIndex(customerIndex);
    // Load existing customer charges if available
    const customer = formData.customers[customerIndex];
    const existingCharges = customer?.chargeRows || [];
    if (existingCharges.length > 0 && Array.isArray(existingCharges)) {
      setCustomerCharges(existingCharges.map(ch => ({
        name: ch.name || '',
        quantity: String(ch.quantity || ''),
        amt: String(ch.amt || ch.amount || ''),
        total: ch.total || 0
      })));
    } else {
      setCustomerCharges([{ name: '', quantity: '', amt: '', total: 0 }]);
    }
    setShowChargesPopup(true);
  };
  // ===== Carrier Fees validation state & helpers =====
  const [customerChargeErrors, setCustomerChargeErrors] = useState([{ name: '', quantity: '', amt: '' }]);
  const [carrierChargeErrors, setCarrierChargeErrors] = useState([{ name: '', quantity: '', amt: '' }]);
  const [chargesPopupError, setChargesPopupError] = useState('');

  // Get current charge errors based on popup type
  const chargeErrors = chargesPopupType === 'customer' ? customerChargeErrors : carrierChargeErrors;
  const setChargeErrors = chargesPopupType === 'customer' ? setCustomerChargeErrors : setCarrierChargeErrors;

  // keep errors array size in sync with charges rows
  useEffect(() => {
    if (chargesPopupType === 'customer') {
      setCustomerChargeErrors(prev =>
        (customerCharges || []).map((_, i) => prev[i] || { name: '', quantity: '', amt: '' })
      );
    } else if (chargesPopupType === 'carrier') {
      setCarrierChargeErrors(prev =>
        (carrierCharges || []).map((_, i) => prev[i] || { name: '', quantity: '', amt: '' })
      );
    }
  }, [customerCharges, carrierCharges, chargesPopupType]);

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
    if (field === 'quantity') value = clampPosInt(value);
    if (field === 'amt') {
      // Allow decimal points for amounts (max 2 decimal places)
      value = value.replace(/[^\d.]/g, '');
      // Ensure only one decimal point
      const parts = value.split('.');
      if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
      }
      // Limit to 2 decimal places
      if (parts[1] && parts[1].length > 2) {
        value = parts[0] + '.' + parts[1].substring(0, 2);
      }
    }

    updated[index] = { ...updated[index], [field]: value };

    // total = quantity * amount (quantity as integer, amount as decimal; zero allowed for live calc)
    const q = parseInt(updated[index].quantity, 10) || 0;
    const a = parseFloat(updated[index].amt) || 0;
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

  // ✅ Replace your applyCharges with this (popup-inside validation) - Updated for separate Customer and Carrier
  const applyCharges = async () => {
    const currentCharges = chargesPopupType === 'customer' ? customerCharges : carrierCharges;
    
    // 1) sab rows bilkul khaali?
    const allEmpty = (currentCharges || []).every(
      ch => !(ch?.name?.trim()) &&
        !(String(ch?.quantity ?? '') !== '') &&
        !(String(ch?.amt ?? '') !== '')
    );

    if (allEmpty) {
      // row 0 pe inline errors dikhane ke liye
      const errs = (currentCharges || []).map((_, i) =>
        i === 0
          ? {
            name: 'Please enter the charge name',
            quantity: 'Please enter the Quantity',
            amt: 'Please enter the amount',
          }
          : { name: '', quantity: '', amt: '' }
      );
      setChargeErrors(errs);
      const errorMsg = chargesPopupType === 'customer' 
        ? 'Please add Customer Charges.' 
        : 'Please add Carrier Fees.';
      setChargesPopupError(errorMsg);
      focusFirstError?.();
      return;
    }

    // 2) row-by-row validation (exact messages)
    const nextErrs = (currentCharges || []).map((ch) => {
      const row = { name: '', quantity: '', amt: '' };
      const hasAny = (ch?.name || ch?.quantity || ch?.amt);

      if (hasAny) {
        const nm = (ch?.name || '').trim();
        if (!nm) row.name = 'Please enter the charge name';
        else if (!/^[A-Za-z ]+$/.test(nm)) row.name = 'Name should contain only alphabets';

        const qRaw = String(ch?.quantity ?? '');
        if (qRaw === '') row.quantity = 'Please enter the Quantity';
        else if (!/^[1-9]\d*$/.test(qRaw)) row.quantity = 'Quantity must be a positive integer';

        const aRaw = String(ch?.amt ?? '');
        if (aRaw === '') row.amt = 'Please enter the amount';
        else if (!/^\d+(\.\d{1,2})?$/.test(aRaw)) row.amt = 'Amount must be a positive number (max 2 decimal places)';
      }
      return row;
    });

    const hasErrors = nextErrs.some(r => r.name || r.quantity || r.amt);
    setChargeErrors(nextErrs);

    if (hasErrors) {
      setChargesPopupError('Please correct the charge rows (Name*, Quantity*, Amount*).');
      focusFirstError?.();
      return;
    }

    // 3) valid -> totals apply
    const totalCharges = (currentCharges || []).reduce((sum, ch) => sum + (Number(ch.total) || 0), 0);
    
    // Apply based on type
    if (chargesPopupType === 'customer' && currentCustomerIndex !== null) {
      // Apply to customer
      setFormData(prev => {
        const updatedCustomers = [...prev.customers];
        if (updatedCustomers[currentCustomerIndex]) {
          updatedCustomers[currentCustomerIndex] = {
            ...updatedCustomers[currentCustomerIndex],
            other: String(totalCharges),
            chargeRows: currentCharges.map(ch => ({
              name: ch.name.trim(),
              quantity: parseInt(ch.quantity, 10) || 0,
              amount: parseFloat(ch.amt) || 0,
              total: (parseInt(ch.quantity, 10) || 0) * (parseFloat(ch.amt) || 0),
            })),
            totalAmount: (() => {
              const lh = toNum2(updatedCustomers[currentCustomerIndex].lineHaul || 0);
              const fscPercent = toNum2(updatedCustomers[currentCustomerIndex].fsc || 0);
              const fscAmount = lh * (fscPercent / 100); // FSC is percentage of Line Haul
              return toNum2(lh + fscAmount + totalCharges);
            })()
          };
        }
        return { ...prev, customers: updatedCustomers };
      });
      setCurrentCustomerIndex(null);
    } else if (chargesPopupType === 'carrier') {
      // Apply to carrier
      setFormData(prev => ({ 
        ...prev, 
        carrierFees: `$${totalCharges.toFixed(2)}`,
        totalRates: String(totalCharges)
      }));

      // If editing order, update carrier fees via API
      if (editingOrder && editingOrder._id) {
        const carrierFeesData = currentCharges.map(ch => ({
          name: ch.name.trim(),
          quantity: parseInt(ch.quantity, 10) || 0,
          amount: parseFloat(ch.amt) || 0,
          total: (parseInt(ch.quantity, 10) || 0) * (parseFloat(ch.amt) || 0),
        }));
        await updateCarrierFees(editingOrder._id, carrierFeesData);
      }
    }

    setChargesPopupError('');
    setShowChargesPopup(false);
    setChargesPopupType(null);
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
    setChargesPopupType(null);
    setCurrentCustomerIndex(null);
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

      // Load reference is now optional - validation removed

      // user/emp
      const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
      const user = JSON.parse(userStr || '{}');
      const empId = user.empId || "EMP001";

      // Get shipperId - try to find by name in shippers list, or use stored shipperId
      let shipperId = formData.shipperId || '';
      if (!shipperId && formData.shipperName) {
        const foundShipper = shippers.find(s => s.compName === formData.shipperName);
        shipperId = foundShipper?._id || '';
      }
      // If still no shipperId, try to find from customers' billTo
      if (!shipperId && formData.customers?.[0]?.billTo) {
        const foundShipper = shippers.find(s => s.compName === formData.customers[0].billTo);
        shipperId = foundShipper?._id || '';
      }

      // Get carrierId - use stored carrierId or find by name
      let carrierId = formData.carrierId || '';
      if (!carrierId && formData.carrierName) {
        const foundCarrier = truckers.find(t => t.compName === formData.carrierName);
        carrierId = foundCarrier?.carrierId || foundCarrier?._id || '';
      }

      // Helper function to convert datetime-local to ISO string
      const formatDateToISO = (dateString) => {
        if (!dateString) return '';
        try {
          // If it's already in ISO format, return as is
          if (dateString.includes('T') && dateString.includes('Z')) return dateString;
          // If it's in datetime-local format (YYYY-MM-DDTHH:mm), convert to ISO
          if (dateString.includes('T')) {
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
              return date.toISOString();
            }
          }
          // If it's just a date, add time
          const date = new Date(dateString);
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
        } catch (e) {
          console.error('Error formatting date:', e);
        }
        return '';
      };

      // Helper function to format return location date
      const formatReturnDateToISO = (dateString) => {
        if (!dateString) return '';
        return formatDateToISO(dateString);
      };

      // Clean pickup and drop locations: drop any rows missing required datetime
      const cleanedPickupLocations = (formData.pickupLocations || [])
        .map(l => ({
          name: (l.name || '').trim(),
          address: (l.address || '').trim(),
          city: (l.city || '').trim(),
          state: (l.state || '').trim(),
          zipCode: (l.zipCode || '').trim(),
          weight: l.weight === '' ? 0 : parseInt(l.weight) || 0,
          commodity: (l.commodity || formData.commodity || '').trim(),
          pickUpDate: formatDateToISO(l.pickUpDate),
          remarks: (l.remarks || '').trim(),
        }))
        .filter(l => l.pickUpDate && l.pickUpDate.trim());

      const cleanedDropLocations = (formData.dropLocations || [])
        .map(l => ({
          name: (l.name || '').trim(),
          address: (l.address || '').trim(),
          city: (l.city || '').trim(),
          state: (l.state || '').trim(),
          zipCode: (l.zipCode || '').trim(),
          weight: l.weight === '' ? 0 : parseInt(l.weight) || 0,
          commodity: (l.commodity || formData.commodity || '').trim(),
          dropDate: formatDateToISO(l.dropDate),
          remarks: (l.remarks || '').trim(),
        }))
        .filter(l => l.dropDate && l.dropDate.trim());

      if (!cleanedPickupLocations.length) {
        alertify.error('Please enter pickUpDate for at least one pickup location');
        setSubmitting(false);
        return;
      }

      // customers - convert other field to array format
      const customersWithTotals = formData.customers.map(c => {
        const lh = toNum2(c.lineHaul);
        const fscPercent = toNum2(c.fsc);
        const fscAmount = lh * (fscPercent / 100); // FSC is percentage of Line Haul
        const oth = toNum2(c.other);
        
        // Use detailed chargeRows if available, otherwise fallback to generic
        const otherArray = (c.chargeRows && c.chargeRows.length > 0) 
          ? c.chargeRows.map(r => ({
              name: r.name,
              quantity: parseInt(r.quantity) || 0,
              amount: parseFloat(r.amount) || parseFloat(r.amt) || 0,
              total: parseFloat(r.total) || 0
            }))
          : (oth > 0 ? [{
              name: "Other Charges",
              quantity: 1,
              amount: oth,
              total: oth
            }] : []);
        
        return {
          billTo: c.billTo,
          dispatcherName: c.dispatcherName,
          workOrderNo: c.workOrderNo,
          lineHaul: lh,
          fsc: fscPercent, // Store percentage value
          other: otherArray,
          otherTotal: oth,
          totalAmount: toNum2(lh + fscAmount + oth),
        };
      });

      // carrier (from charges)
      const carrierData = {
        carrierName: formData.carrierName,
        equipmentType: formData.equipmentType,
        carrierFees: (carrierCharges || []).map(ch => ({
          name: ch.name,
          quantity: parseInt(ch.quantity) || 0,
          amount: parseFloat(ch.amt) || 0,
          total: (parseInt(ch.quantity) || 0) * (parseFloat(ch.amt) || 0)
        })),
        totalCarrierFees: (carrierCharges || []).reduce((s, ch) => s + (ch.total || 0), 0)
      };

      if ((formData.loadType || selectedLoadType) === 'OTR') {
        const et = (formData.equipmentType || '').trim();
        if (!ALLOWED_OTR_TYPES.includes(et)) {
          alertify.error('Select a valid equipment type for OTR');
          setSubmitting(false);
          return;
        }
      }

      // Format return location for DRAYAGE - only include if all required fields are present
      const returnLocationData = (formData.loadType === 'DRAYAGE' || selectedLoadType === 'DRAYAGE') && formData.returnLocation ? {
        returnFullAddress: [
          formData.returnLocation.address,
        ].filter(Boolean).join(', ') || '',
        name: formData.returnLocation.name || '',
        city: formData.returnLocation.city || '',
        state: formData.returnLocation.state || '',
        zipCode: formData.returnLocation.zipCode || '',
        weight: formData.returnLocation.weight === '' ? 0 : (Number(formData.returnLocation.weight) || 0),
        returnDate: formatReturnDateToISO(formData.returnLocation.returnDate || '')
      } : null;

      // plain JSON payload (new API format)
      const submitData = {
        empId,
        loadType: formData.loadType || selectedLoadType,
        shipperId: shipperId || '',
        carrierId: carrierId || '',
        company: formData.company || formData.addDispature || '',
        addDispature: formData.company || formData.addDispature || '',
        customers: customersWithTotals,
        carrier: carrierData,
        shipper: {
          containerNo: formData.containerNo || '',
          containerType: (formData.loadType || selectedLoadType) === 'DRAYAGE' 
            ? ((formData.equipmentType || formData.containerType || '').trim()) 
            : ((formData.equipmentType || formData.containerType || '').trim()),
          shipmentNo: formData.shipmentNo || '',
          pickUpLocations: cleanedPickupLocations,
          dropLocations: cleanedDropLocations
        },
        bols: (formData.bols || [])
          .filter(b => (b.bolNo || '').trim())
          .map(b => ({ bolNo: b.bolNo.trim() })),
        ...(returnLocationData ? { returnLocation: returnLocationData } : {}),
        loadReference: formData.selectedLoad && formData.selectedLoad.trim() ? formData.selectedLoad : '',
        supportingDocs: formData.docs ? '' : '' // Will be handled in multipart
      };




      const token = sessionStorage.getItem("token") || localStorage.getItem("token");

      let response;

      // MULTIPART (file attached) — new API format
      // Only use multipart if it's a real File object (has size > 0 usually, or is File instance)
      if (formData.docs && !formData.docs.isExisting) {
        const fd = new FormData();
        fd.append('empId', empId);
        fd.append('loadType', formData.loadType || selectedLoadType);
        fd.append('shipperId', shipperId || '');
        fd.append('carrierId', carrierId || '');
        fd.append('company', formData.company || formData.addDispature || ''); // Company name for both DRAYAGE and OTR
        fd.append('addDispature', formData.company || formData.addDispature || ''); // Also set addDispature field
        fd.append('companyName', formData.company || formData.addDispature || ''); // Company name for both DRAYAGE and OTR

        fd.append('customers', JSON.stringify(customersWithTotals));

        const carrierJSON = {
          equipmentType: formData.equipmentType,
          carrierFees: (charges || []).map(ch => ({
            name: ch.name,
            quantity: parseInt(ch.quantity) || 0,
            amount: parseFloat(ch.amt) || 0,
            total: (parseInt(ch.quantity) || 0) * (parseFloat(ch.amt) || 0),
          })),
          totalCarrierFees: (charges || []).reduce((s, ch) => s + (ch.total || 0), 0),
        };
        fd.append('carrier', JSON.stringify(carrierJSON));

        const shipperJSON = {
          containerNo: formData.containerNo || '',
          containerType: (formData.loadType || selectedLoadType) === 'DRAYAGE' 
            ? ((formData.equipmentType || formData.containerType || '').trim()) 
            : ((formData.equipmentType || formData.containerType || '').trim()),
          shipmentNo: formData.shipmentNo || '',
          pickUpLocations: cleanedPickupLocations,
          dropLocations: cleanedDropLocations
        };
        fd.append('shipper', JSON.stringify(shipperJSON));

        // BOLs
        (formData.bols || []).forEach((b, i) => {
          const val = (b?.bolNo || '').trim();
          if (val) fd.append(`bols[${i}][bolNo]`, val);
        });

        // Return location for DRAYAGE
        if (returnLocationData) {
          fd.append('returnLocation', JSON.stringify(returnLocationData));
        }

        // Load reference
        if (formData.selectedLoad && formData.selectedLoad.trim()) {
          fd.append('loadReference', formData.selectedLoad);
        } else {
          fd.append('loadReference', '');
        }

        // Supporting docs
        fd.append('supportingDocs', '');
        fd.append('document', formData.docs);

        response = await axios.post(`${API_CONFIG.BASE_URL}/api/v1/do/do`, fd, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // plain JSON
        // If we have an existing document (URL), we might want to pass it
        // Check if formData.docs.isExisting is true, then pass the URL in supportingDocs
        if (formData.docs && formData.docs.isExisting) {
            submitData.supportingDocs = formData.docs.url;
        }

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
        setCurrentPage(1); // Reset to first page
        await fetchOrders(activeSearchTerm, currentPage, itemsPerPage); // Refresh orders
        setFormData({
          customers: [{
            billTo: '', dispatcherName: '', workOrderNo: '',
            lineHaul: '', fsc: '', other: '', totalAmount: 0
          }],
          carrierName: '',
          carrierId: '',
          equipmentType: '',
          carrierFees: '',
          shipperName: '',
          shipperId: '',
          shipmentNo: '',
          containerNo: '',
          containerType: '',
          commodity: '',
          selectedLoad: '',
          company: '',
          loadType: 'OTR',
          returnLocation: {
            name: '',
            address: '',
            city: '',
            state: '',
            zipCode: '',
            returnDate: ''
          },
          pickupLocations: [{ name: '', address: '', city: '', state: '', zipCode: '', weight: '', commodity: '', pickUpDate: '', remarks: '' }],
          dropLocations: [{ name: '', address: '', city: '', state: '', zipCode: '', weight: '', commodity: '', dropDate: '', remarks: '' }],
          remarks: '',
          bols: [{ bolNo: '' }],
          docs: null
        });
        // Reset both customer and carrier charges
        setCustomerCharges([{ name: '', quantity: '', amt: '', total: 0 }]);
        setCarrierCharges([{ name: '', quantity: '', amt: '', total: 0 }]);

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
 // ✅ FIXED: Enhanced validateForm function for customer validation
const validateForm = (mode = formMode) => {
  const next = {
    customers: [],
    carrier: {},
    shipper: {},
    pickups: [],
    drops: [],
    company: '',
    docs: ''
  };

  // --- Enhanced Customers validation ---
  (formData.customers || []).forEach((c, idx) => {
    const rowErr = {};

    // 1) Company (Bill To) - required
    if (!c.billTo || c.billTo.trim() === '') {
      rowErr.billTo = 'Please select the company name.';
    }

    // 2) Dispatcher - required
    if (!c.dispatcherName || c.dispatcherName.trim() === '') {
      rowErr.dispatcherName = 'Please select the Dispatcher name.';
    }

    // 3) Work Order No (required + alphanumeric)
    if (!c.workOrderNo || c.workOrderNo.trim() === '') {
      rowErr.workOrderNo = 'Please enter the Work Order Number.';
    } else if (!isAlnum(c.workOrderNo)) {
      rowErr.workOrderNo = 'Work Order Number must be alphanumeric (hyphens allowed).';
    }

    // 4/5/6) Money-like fields: non-negative numbers
    if (c.lineHaul === '' || c.lineHaul === null || c.lineHaul === undefined) {
      rowErr.lineHaul = 'Please enter the Line Haul.';
    } else if (!isMoney2dp(c.lineHaul)) {
      rowErr.lineHaul = 'Enter a non-negative amount (max 2 decimals).';
    }

    if (c.fsc === '' || c.fsc === null || c.fsc === undefined) {
      rowErr.fsc = 'Please enter the FSC.';
    } else if (!isMoney2dp(c.fsc)) {
      rowErr.fsc = 'Enter a non-negative amount (max 2 decimals).';
    }

    if (c.other === '' || c.other === null || c.other === undefined) {
      rowErr.other = 'Please enter the Other.';
    } else if (!isMoney2dp(c.other)) {
      rowErr.other = 'Enter a non-negative amount (max 2 decimals).';
    }

    next.customers[idx] = rowErr;
  });

  // Carrier Validation
  const carrierErr = {};
  if (!formData.carrierName?.trim()) carrierErr.carrierName = 'Carrier Name is required';
  if (!formData.equipmentType?.trim()) carrierErr.equipmentType = 'Equipment Type is required';
  if (!formData.carrierFees && formData.carrierFees !== 0) carrierErr.fees = 'Carrier Fees are required';
  next.carrier = carrierErr;

  // Shipper Validation
  const shipperErr = {};
  if (!formData.shipmentNo?.trim()) shipperErr.shipmentNo = 'Shipment No is required';
  if (!formData.containerNo?.trim()) shipperErr.containerNo = 'Container No is required';
  if (selectedLoadType === 'DRAYAGE') {
     const ct = formData.containerType || formData.equipmentType;
     if (!ct?.trim()) shipperErr.containerType = 'Container Type is required';
  }
  next.shipper = shipperErr;

  // Pickup Validation
  (formData.pickupLocations || []).forEach((l, i) => {
     const row = {};
     if (!l.name?.trim()) row.name = 'Location Name is required';
     if (!l.address?.trim()) row.address = 'Address is required';
     if (!l.city?.trim()) row.city = 'City is required';
     if (!l.state?.trim()) row.state = 'State is required';
     if (!l.zipCode?.trim()) row.zipCode = 'Zip Code is required';
     if (l.weight === '' || l.weight === null) row.weight = 'Weight is required';
     if (!l.pickUpDate) row.pickUpDate = 'Pickup Date is required';
     next.pickups[i] = row;
  });

  // Drop Validation
  (formData.dropLocations || []).forEach((l, i) => {
     const row = {};
     if (!l.name?.trim()) row.name = 'Location Name is required';
     if (!l.address?.trim()) row.address = 'Address is required';
     if (!l.city?.trim()) row.city = 'City is required';
     if (!l.state?.trim()) row.state = 'State is required';
     if (!l.zipCode?.trim()) row.zipCode = 'Zip Code is required';
     if (l.weight === '' || l.weight === null) row.weight = 'Weight is required';
     if (!l.dropDate) row.dropDate = 'Drop Date is required';
     next.drops[i] = row;
  });

  // Return Location Validation (for DRAYAGE)
  if ((formData.loadType === 'DRAYAGE' || selectedLoadType === 'DRAYAGE') && formData.returnLocation) {
      const l = formData.returnLocation;
      const row = {};
      if (!l.name?.trim()) row.name = 'Location Name is required';
      if (!l.address?.trim()) row.address = 'Address is required';
      if (!l.city?.trim()) row.city = 'City is required';
      if (!l.state?.trim()) row.state = 'State is required';
      if (!l.zipCode?.trim()) row.zipCode = 'Zip Code is required';
      if (!l.returnDate) row.returnDate = 'Return Date is required';
      next.returnLocation = row;
  }

  // Company Name Validation
  if (!formData.company || formData.company.trim() === '') {
    next.company = 'Please select the company name.';
  }

  setErrors(next);

  // Check if any customer has errors
  const hasCustomerErr = next.customers.some(row => 
    row && Object.keys(row).length > 0 && Object.values(row).some(err => err !== '')
  );

  const hasPickErr = next.pickups.some(row => Object.keys(row || {}).length);
  const hasDropErr = next.drops.some(row => Object.keys(row || {}).length);
  const hasCarrierErr = Object.keys(next.carrier || {}).length > 0;
  const hasReturnLocationErr = (formData.loadType === 'DRAYAGE' || selectedLoadType === 'DRAYAGE') && next.returnLocation && Object.keys(next.returnLocation).length > 0;
  const hasShipperErr = Object.keys(next.shipper || {}).length > 0;
  const hasCompanyErr = next.company && next.company.trim() !== '';

  const valid = !(
    hasCustomerErr || hasPickErr || hasDropErr || hasCarrierErr || hasShipperErr || hasReturnLocationErr || hasCompanyErr || next.docs
  );

  return valid;
};



  // Handle LoadType toggle
  const handleLoadTypeToggle = (type) => {
    setSelectedLoadType(type);
    setFormData(prev => ({
      ...prev,
      loadType: type,
      equipmentType: '', // Reset equipment type when switching load types
      // Reset pickup/drop locations to single for DRAYAGE
      pickupLocations: type === 'DRAYAGE' ? [prev.pickupLocations[0] || {
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        weight: '',
        pickUpDate: '',
        remarks: ''
      }] : prev.pickupLocations,
      dropLocations: type === 'DRAYAGE' ? [prev.dropLocations[0] || {
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        weight: '',
        dropDate: '',
        remarks: ''
      }] : prev.dropLocations
    }));
  };

  // Reset form when modal closes
  const handleCloseModal = async () => {
    setShowAddOrderForm(false);
    // Removed unnecessary fetchOrders() call - only refresh if data was actually changed
    setSelectedLoadType('OTR');
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
      totalRates: '',

      // Location Information (formerly Shipper Information)
      shipmentNo: '',
      containerNo: '',
      containerType: '',
      commodity: '',
      loadType: 'OTR',
      returnLocation: {
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: ''
      },

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
      bols: [{ bolNo: '' }],
      docs: null
    });

    // Reset charges state
    setCustomerCharges([{ name: '', quantity: '', amt: '', total: 0 }]);
    setCarrierCharges([{ name: '', quantity: '', amt: '', total: 0 }]);
    setShowChargesPopup(false);
    setChargesPopupType(null);
    setCurrentCustomerIndex(null);
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

        // Get shipperId and carrierId
        const shipperId = typeof fullOrderData.shipperId === 'object' ? fullOrderData.shipperId?._id : fullOrderData.shipperId;
        const carrierId = typeof fullOrderData.carrierId === 'object' ? fullOrderData.carrierId?._id : fullOrderData.carrierId;

        // Handle customers - convert other array back to single value for form
        // IMPORTANT: Preserve ALL original customer fields to avoid "missing required fields" error
        const editCustomers = (fullOrderData.customers || []).map(c => {
          const lh = Number(c.lineHaul) || 0;
          const fscPercent = Number(c.fsc) || 0;
          const fscAmount = lh * (fscPercent / 100); // FSC is percentage of Line Haul
          // If other is an array, sum it up; otherwise use the value directly
          const oth = Array.isArray(c.other) 
            ? (c.otherTotal || c.other.reduce((sum, item) => sum + (Number(item?.total) || 0), 0))
            : (Number(c.other) || 0);
          
          // Log original customer data for debugging

          return {
            billTo: c.billTo || '',
            dispatcherName: c.dispatcherName || '',
            workOrderNo: c.workOrderNo || '',
            lineHaul: ensureMoney2dp(String(lh)),
            fsc: ensureMoney2dp(String(fscPercent)),
            other: ensureMoney2dp(String(oth)),
            totalAmount: lh + fscAmount + oth,
            // DO NOT set loadNo, fax, phone, etc. here - they're not form fields
            // They will be preserved from _originalData when building update payload
            // Store the original other array for charges popup
            chargeRows: Array.isArray(c.other) ? c.other.map(item => ({
              name: item?.name || '',
              quantity: String(item?.quantity || 0),
              amt: String(item?.amount || 0),
              total: Number(item?.total || 0)
            })) : [],
            // Preserve the COMPLETE original customer object - this is critical!
            _originalData: c
          };
        });

        const editFormData = {
          customers: editCustomers.length ? editCustomers : [{
            billTo: '', dispatcherName: '', workOrderNo: '',
            lineHaul: '', fsc: '', other: '', totalAmount: 0
          }],
          carrierName: fullOrderData.carrier?.carrierName || (typeof fullOrderData.carrierId === 'object' ? fullOrderData.carrierId?.compName : ''),
          carrierId: carrierId || '',
          equipmentType: fullOrderData.carrier?.equipmentType || '',
          carrierFees: fullOrderData.carrier?.totalCarrierFees || '',
          totalRates: fullOrderData.carrier?.totalCarrierFees || '',
          shipperName: fullOrderData.shipper?.name || (typeof fullOrderData.shipperId === 'object' ? fullOrderData.shipperId?.compName : ''),
          shipperId: shipperId || '',
          shipmentNo: fullOrderData.shipper?.shipmentNo || '',
          containerNo: fullOrderData.shipper?.containerNo || '',
          containerType: fullOrderData.shipper?.containerType || '',
          commodity: fullOrderData.shipper?.pickUpLocations?.[0]?.commodity || fullOrderData.shipper?.dropLocations?.[0]?.commodity || '',
          selectedLoad: fullOrderData.loadReference || '',
          company: fullOrderData.company || fullOrderData.addDispature || fullOrderData.customerName || '',
          addDispature: fullOrderData.company || fullOrderData.addDispature || fullOrderData.customerName || '',
          loadType: fullOrderData.loadType || 'OTR',
          
          // Return location for DRAYAGE
          returnLocation: fullOrderData.loadType === 'DRAYAGE' && fullOrderData.returnLocation ? {
            name: fullOrderData.returnLocation.name || fullOrderData.returnLocation.locationName || '',
            address: fullOrderData.returnLocation.returnFullAddress || '',
            city: fullOrderData.returnLocation.city || '',
            state: fullOrderData.returnLocation.state || '',
            zipCode: fullOrderData.returnLocation.zipCode || '',
            weight: fullOrderData.returnLocation.weight ?? '',
            returnDate: formatDateForInput(fullOrderData.returnLocation.returnDate)
          } : {
            name: '',
            address: '',
            city: '',
            state: '',
            zipCode: '',
            weight: '',
            returnDate: ''
          },
          
          pickupLocations: (fullOrderData.shipper?.pickUpLocations || [{
            name: '', address: '', city: '', state: '', zipCode: '', weight: '', commodity: '', pickUpDate: '', remarks: ''
          }]).map(l => ({
            name: l?.name || '',
            address: l?.address || '',
            city: l?.city || '',
            state: l?.state || '',
            zipCode: l?.zipCode || '',
            weight: l?.weight ?? '',
            commodity: l?.commodity || '',
            pickUpDate: formatDateForInput(l?.pickUpDate || fullOrderData.shipper?.pickUpDate),
            remarks: l?.remarks ?? ''
          })),
          dropLocations: (fullOrderData.shipper?.dropLocations || [{
            name: '', address: '', city: '', state: '', zipCode: '', weight: '', commodity: '', dropDate: '', remarks: ''
          }]).map(l => ({
            name: l?.name || '',
            address: l?.address || '',
            city: l?.city || '',
            state: l?.state || '',
            zipCode: l?.zipCode || '',
            weight: l?.weight ?? '',
            commodity: l?.commodity || '',
            dropDate: formatDateForInput(l?.dropDate || fullOrderData.shipper?.dropDate),
            remarks: l?.remarks ?? ''
          })),
          remarks: fullOrderData.remarks || '',
          bols: (Array.isArray(fullOrderData.bols) && fullOrderData.bols.length
            ? fullOrderData.bols.map(b => ({ bolNo: b.bolNo || '' }))
            : (fullOrderData.bolInformation ? [{ bolNo: fullOrderData.bolInformation }] : [{ bolNo: '' }])
          ),
          docs: (fullOrderData.uploadedFiles && fullOrderData.uploadedFiles.length > 0) 
            ? {
                name: fullOrderData.uploadedFiles[0].fileName || 'Document',
                isExisting: true,
                url: fullOrderData.uploadedFiles[0].fileUrl
              } 
            : (fullOrderData.docUpload ? {
                name: fullOrderData.docUpload.split(/[/\\]/).pop(),
                isExisting: true,
                url: `${API_CONFIG.BASE_URL}/${fullOrderData.docUpload}`
              } : null)
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
        // Set carrier charges when editing order
        setCarrierCharges(processedCharges);
        setSelectedLoadType(fullOrderData.loadType || 'OTR');
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
        bols: [{ bolNo: order.bolInformation || '' }],
        docs: null
      };

      setFormData(fallbackFormData);
      // Reset both customer and carrier charges for fallback
      setCustomerCharges([{ name: '', quantity: '', amt: '', total: 0 }]);
      setCarrierCharges([{ name: '', quantity: '', amt: '', total: 0 }]);
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
      bols: [{ bolNo: '' }],
      docs: null
    });
  };

  const handleAssignOrder = (order) => {
    if (order.assignmentStatus === 'assigned') {
      alertify.warning('This order is already assigned to CMT team.');
      return;
    }
    setOrderToAssign(order);
    setShowAssignModal(true);
  };

  const handleConfirmAssign = async () => {
    try {
      setAssigningOrder(true);

      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      if (!token) {
        alertify.error('Authentication token not found. Please login again.');
        return;
      }

      const originalId = orderToAssign.originalId || orderToAssign.id.replace('DO-', '');

      const response = await axios.put(
        `${API_CONFIG.BASE_URL}/api/v1/do/do/auto-assign-to-cmt`,
        {
          doId: originalId
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data && response.data.success) {
        alertify.success(`Order ${orderToAssign.id} assigned to CMT team successfully!`);

        // Update the order status in the local state
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order.id === orderToAssign.id
              ? { ...order, assignmentStatus: 'assigned' }
              : order
          )
        );

        setShowAssignModal(false);
        setOrderToAssign(null);
      } else {
        alertify.error('Failed to assign order. Please try again.');
      }
    } catch (error) {
      console.error('Error assigning order:', error);
      if (error.response?.data?.message) {
        alertify.error(`Failed to assign order: ${error.response.data.message}`);
      } else {
        alertify.error('Failed to assign order. Please try again.');
      }
    } finally {
      setAssigningOrder(false);
    }
  };

  const handleCancelAssign = () => {
    setShowAssignModal(false);
    setOrderToAssign(null);
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

// ✅ REPLACE your handleUpdateOrder with this fixed version
// ✅ FIXED: handleUpdateOrder function
// ✅ FIXED: handleUpdateOrder function with proper customer validation
const handleUpdateOrder = async (e) => {
  e.preventDefault();
  
  // Validate form first
  if (!validateForm('edit')) { 
    setSubmitting(false); 
    focusFirstError(); 
    return; 
  }
  
  setSubmitting(true);
  try {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");

    // Get the correct order ID
    let orderId = editingOrder?._id;
    if (!orderId) { 
      alertify.error('Order ID missing'); 
      setSubmitting(false);
      return; 
    }
    
    // Clean up order ID if it has DO- prefix
    if (String(orderId).startsWith('DO-')) {
      orderId = orderId.replace(/^DO-/, '');
    }

    // Get user/employee info
    const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
    const user = JSON.parse(userStr || '{}');
    const empId = user.empId || "EMP001";

    // --- FIXED: Customers data preparation with proper validation ---
    // IMPORTANT: Include ALL customer fields to avoid "missing required fields" error
    const customers = (formData.customers || []).map((c, idx) => {
      // Ensure all required fields have values
      const billTo = (c.billTo || '').trim();
      const dispatcherName = (c.dispatcherName || '').trim();
      const workOrderNo = (c.workOrderNo || '').trim();
      
      // Convert money fields with proper fallbacks
      const lh = toNum2(c.lineHaul || '0');
      const fscPercent = toNum2(c.fsc || '0');
      const fscAmount = lh * (fscPercent / 100); // FSC is percentage of Line Haul
      const oth = toNum2(c.other || '0');

      // Convert other to array format as expected by API
      // Use detailed chargeRows if available, otherwise fallback to generic
      const otherArray = (c.chargeRows && c.chargeRows.length > 0)
        ? c.chargeRows.map(r => ({
            name: r.name,
            quantity: parseInt(r.quantity) || 0,
            amount: parseFloat(r.amount) || parseFloat(r.amt) || 0,
            total: parseFloat(r.total) || 0
          }))
        : (oth > 0 ? [{
            name: "Other Charges",
            quantity: 1,
            amount: oth,
            total: oth
          }] : []);

      // Get original data if available (from edit mode) - preserve ALL original fields
      const originalData = c._originalData || {};
      const customerData = {
        // Preserve all original fields first (this includes loadNo, fax, phone, email, address, etc.)
        ...originalData,
        // Override ONLY the form fields (these take priority for editable fields)
        billTo: billTo || originalData.billTo || '',
        dispatcherName: dispatcherName || originalData.dispatcherName || '',
        workOrderNo: workOrderNo || originalData.workOrderNo || '',
        lineHaul: lh,
        fsc: fscPercent, // Store percentage value
        other: otherArray,
        otherTotal: oth,
        totalAmount: toNum2(lh + fscAmount + oth),
        // DO NOT override loadNo, fax, phone, email, address, etc. - they're already in originalData
        // Only override if form has a value for them (which it doesn't, so they stay from originalData)
      };

      // Remove internal fields that shouldn't be sent to API
      if (customerData._originalData) {
        delete customerData._originalData;
      }
      if (customerData.chargeRows) {
        delete customerData.chargeRows;
      }
      
      // Ensure loadNo is present (required field) - use original if available
      // Don't set to empty string if it doesn't exist - let API handle it
      if (!customerData.loadNo && originalData.loadNo) {
        customerData.loadNo = originalData.loadNo;
      }

      console.log(`Customer ${idx + 1} loadNo:`, customerData.loadNo, '(from original:', originalData.loadNo, ')');
      return customerData;
    });

    // Validate that we have at least one customer with required fields
    const validCustomers = customers.filter(c => 
      c.billTo && c.dispatcherName && c.workOrderNo
    );
    
    if (validCustomers.length === 0) {
      alertify.error('Please fill in all required customer fields (Bill To, Dispatcher Name, Work Order No)');
      setSubmitting(false);
      return;
    }

    // --- Carrier data preparation ---
    const carrierFees = (carrierCharges || [])
      .filter(ch => ch?.name && ch.name.trim() !== '')
      .map(ch => ({
        name: ch.name.trim(),
        quantity: Number(ch.quantity) || 0,
        amount: Number(ch.amt) || 0,
        total: (Number(ch.quantity) || 0) * (Number(ch.amt) || 0),
      }));

    const carrier = {
      carrierName: formData.carrierName || '',
      equipmentType: formData.equipmentType || '',
      carrierFees: carrierFees,
      totalCarrierFees: carrierFees.reduce((s, f) => s + (f.total || 0), 0),
    };

    // --- Shipper data preparation ---
    const shipper = {
      shipmentNo: formData.shipmentNo || '',
      containerNo: formData.containerNo || '',
      containerType: formData.containerType || '',
      pickUpLocations: (formData.pickupLocations || []).map(l => ({
        name: l.name || '',
        address: l.address || '',
        city: l.city || '',
        state: l.state || '',
        zipCode: l.zipCode || '',
        weight: l.weight === '' ? 0 : Number(l.weight) || 0,
        commodity: l.commodity || formData.commodity || '',
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
        commodity: l.commodity || formData.commodity || '',
        dropDate: l.dropDate || '',
        remarks: l.remarks || ''
      })),
    };

    // --- Return location for DRAYAGE ---
    const returnLocationData = (formData.loadType === 'DRAYAGE' || selectedLoadType === 'DRAYAGE') && formData.returnLocation ? {
      returnFullAddress: [
        formData.returnLocation.address,
      ].filter(Boolean).join(', ') || '',
      name: formData.returnLocation.name || '',
      city: formData.returnLocation.city || '',
      state: formData.returnLocation.state || '',
      zipCode: formData.returnLocation.zipCode || '',
      weight: formData.returnLocation.weight === '' ? 0 : (Number(formData.returnLocation.weight) || 0),
      returnDate: formData.returnLocation.returnDate || ''
    } : null;

    // --- Complete update payload ---
    const updatePayload = {
      empId: empId,
      loadType: formData.loadType || selectedLoadType,
      customers: customers,
      carrier: carrier,
      shipper: shipper,
      ...(formData.selectedLoad && formData.selectedLoad.trim() ? { loadReference: formData.selectedLoad } : {}),
      company: formData.company || formData.addDispature || '',
      addDispature: formData.company || formData.addDispature || '',
      remarks: formData.remarks || '',
      bols: (formData.bols || [])
        .filter(b => (b.bolNo || '').trim())
        .map(b => ({ bolNo: b.bolNo.trim() })),
      ...(returnLocationData ? { returnLocation: returnLocationData } : {}),
    };

    console.log('Final update payload:', JSON.stringify(updatePayload, null, 2));

    // 1) Make the main API call to update the order
    const response = await axios.put(
      `${API_CONFIG.BASE_URL}/api/v1/do/do/${orderId}`,
      updatePayload,
      { 
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        timeout: 30000
      }
    );

    if (!response?.data?.success) {
      console.error('Update failed:', response?.data);
      alertify.error(response?.data?.message || 'Update failed');
      setSubmitting(false);
      return;
    }

    // 2) OPTIONAL: Handle document upload if a new file is selected
    if (formData.docs && formData.docs instanceof File) {
      try {
        const fd = new FormData();
        fd.append('document', formData.docs);

        const uploadUrl = `${API_CONFIG.BASE_URL}/api/v1/do/do/${orderId}/upload`;

        const uploadResponse = await axios.put(uploadUrl, fd, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          timeout: 20000,
        });

        if (uploadResponse?.data?.success) {

          alertify.success('Document uploaded successfully');
        } else {
          console.warn('Document upload response not successful:', uploadResponse?.data);
          alertify.warning(uploadResponse?.data?.message || 'Document upload completed with warnings');
        }
      } catch (uploadError) {
        console.error('Document upload error:', uploadError?.response?.data || uploadError);
        const errorMsg = uploadError?.response?.data?.message || uploadError?.message || 'Unknown upload error';
        alertify.warning(`Order updated, but document upload failed: ${errorMsg}`);
      }
    }

    // Success message and cleanup
    alertify.success('Delivery order updated successfully!');
    
    // Close modal and refresh data
    setShowAddOrderForm(false);
    setEditingOrder(null);
    
    // Refresh the orders list - reset to first page and fetch fresh data
    setCurrentPage(1); // Reset to first page
    await fetchOrders(searchTerm, 1, itemsPerPage); // Refresh orders with page 1
    // Also refresh the count data
    await fetchAllOrdersForCount();
    
  } catch (error) {
    console.error('Update error:', error);
    console.error('Error response:', error.response?.data);
    
    let errorMessage = 'Failed to update delivery order';
    if (error.response?.data?.message) {
      errorMessage = `API Error: ${error.response.data.message}`;
    } else if (error.response?.data?.error) {
      errorMessage = `API Error: ${error.response.data.error}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    alertify.error(errorMessage);
    
    // Show specific field errors if available
    if (error.response?.data?.errors) {
      console.error('Field errors:', error.response.data.errors);
      Object.values(error.response.data.errors).forEach(err => {
        alertify.error(err);
      });
    }
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

      }
      // If not found, try from orders array
      else if (editingOrder && editingOrder._id) {
        currentOrder = orders.find(order => order._id === editingOrder._id);
        if (currentOrder && currentOrder.carrier) {
          existingCarrierData = currentOrder.carrier;

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

      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/do/do/${orderId}`, updateData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.data && response.data.success) {
        alertify.success('Carrier fees updated successfully!');
        fetchOrders(searchTerm, currentPage, itemsPerPage); // Refresh orders
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
    // Determine logo based on company name
    const companyName = order?.company || order?.addDispature || '';
    let pdfLogo = Logo;
    if (companyName === 'IDENTIFICA LLC') {
      pdfLogo = IdentificaLogo;
    } else if (companyName === 'MT. POCONO TRANSPORTATION INC') {
      pdfLogo = MtPoconoLogo;
    }

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

    // Fixed date formatting - parses date correctly without timezone shifts
    const formatDateStr = (d) => {
      if (!d) return 'N/A';
      try {
        // Handle ISO date strings (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss) by parsing directly
        let year, month, day;
        if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
          // ISO format: extract date parts directly from string
          const parts = d.split('T')[0].split('-');
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          day = parseInt(parts[2], 10);
        } else {
          // Other formats: use Date object but extract UTC components to avoid timezone shift
          const dt = new Date(d);
          if (Number.isNaN(dt.getTime())) return 'N/A';
          // Use UTC methods to avoid timezone conversion issues
          year = dt.getUTCFullYear();
          month = dt.getUTCMonth() + 1;
          day = dt.getUTCDate();
        }
        return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
      } catch { return 'N/A'; }
    };
    const formatDateStrUS = (d) => {
      if (!d) return 'N/A';
      try {
        // Handle ISO date strings (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss) by parsing directly
        let year, month, day;
        if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
          // ISO format: extract date parts directly from string
          const parts = d.split('T')[0].split('-');
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          day = parseInt(parts[2], 10);
        } else {
          // Other formats: use Date object but extract UTC components to avoid timezone shift
          const dt = new Date(d);
          if (Number.isNaN(dt.getTime())) return 'N/A';
          // Use UTC methods to avoid timezone conversion issues
          year = dt.getUTCFullYear();
          month = dt.getUTCMonth() + 1;
          day = dt.getUTCDate();
        }
        return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
      } catch { return 'N/A'; }
    };
    const formatTimeStr = (d) => {
      if (!d) return 'N/A';
      try { return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); } catch { return 'N/A'; }
    };
    const formatAddr = (l) => {
      if (!l) return 'N/A';
      const parts = [l.address, l.city, l.state, l.zipCode].filter(Boolean);
      return parts.length ? parts.join(', ') : 'N/A';
    };
    // NEW: name + address line
    const formatLocLine = (l) => {
      if (!l) return 'N/A';
      const name = (l.name || '').trim();
      const addr = formatAddr(l);
      return name ? `${name} — ${addr}` : addr;
    };

    // 3) Carrier fees (names + qty + rate + total)
    const rawFees = (order.carrier && Array.isArray(order.carrier.carrierFees)) ? order.carrier.carrierFees : [];
    const feeEntries = rawFees.map((ch, idx) => {
      let qtyRaw;
      if (ch && ch.qty !== undefined && ch.qty !== null) qtyRaw = ch.qty;
      else if (ch && ch.quantity !== undefined && ch.quantity !== null) qtyRaw = ch.quantity;
      else qtyRaw = 1;
      const qty = toNum(qtyRaw) || 1;

      let rateRaw = null;
      if (ch && ch.rate !== undefined && ch.rate !== null) rateRaw = ch.rate;
      else if (ch && ch.amount !== undefined && ch.amount !== null) rateRaw = ch.amount;
      else if (ch && ch.amt !== undefined && ch.amt !== null) rateRaw = ch.amt;
      else if (ch && ch.price !== undefined && ch.price !== null) rateRaw = ch.price;
      const rate = toNum(rateRaw);

      let totalRaw = (ch && ch.total !== undefined && ch.total !== null) ? ch.total : null;
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
    const drops  = Array.isArray(ship.dropLocations) ? ship.dropLocations : [];

    const pickupSectionsHTML = pickUps.length
      ? pickUps.map((l, i) => {
          const addrLine = formatLocLine(l); // << name + address
          const dateStr = formatDateStr(l && l.pickUpDate);
          const hoursLabel = 'Shipping Hours';
          return (
            '<table class="rates-table">' +
            '<thead><tr><th colspan="2" style="text-align:left;background:#f0f0f0;font-size:14px;font-weight:bold;">Pickup Location ' + (i + 1) + '</th></tr></thead>' +
            '<tbody>' +
            '<tr>' +
            '<td colspan="2" style="padding:8px;font-weight:bold;border-bottom:1px solid #ddd;">' + addrLine + '</td>' +
            '</tr>' +
            '<tr>' +
            '<td style="width:50%;padding:8px;">' +
            '<strong>Date:</strong> ' + dateStr + '<br>' +
            // '<strong>Time:</strong> N/A<br>' +
            '<strong>Type:</strong> ' + (ship.containerType || '40HC') + '<br>' +
            '<strong>Quantity:</strong> 1<br>' +
            '<strong>Weight:</strong> ' + ((l.weight !== undefined && l.weight !== null && l.weight !== '') ? l.weight : (order.weight || 'N/A')) + ' lbs' +
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
          const addrLine = formatLocLine(l); // << name + address
          const dateStr = formatDateStr(l && l.dropDate);
          const hoursLabel = 'Receiving Hours';
          return (
            '<table class="rates-table">' +
            '<thead><tr><th colspan="2" style="text-align:left;background:#f0f0f0;font-size:14px;font-weight:bold;">Drop Location ' + (i + 1) + '</th></tr></thead>' +
            '<tbody>' +
            '<tr>' +
            '<td colspan="2" style="padding:8px;font-weight:bold;border-bottom:1px solid #ddd;">' + addrLine + '</td>' +
            '</tr>' +
            '<tr>' +
            '<td style="width:50%;padding:8px;">' +
            '<strong>Date:</strong> ' + dateStr + '<br>' +
            // '<strong>Time:</strong> N/A<br>' +
            '<strong>Type:</strong> ' + (ship.containerType || '40HC') + '<br>' +
            '<strong>Quantity:</strong> 1<br>' +
            '<strong>Weight:</strong> ' + ((l.weight !== undefined && l.weight !== null && l.weight !== '') ? l.weight : (order.weight || 'N/A')) + ' lbs' +
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
  .logo { width: 180px; height: 120px; object-fit: contain; }
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
      <img src="${pdfLogo}" alt="Company Logo" class="logo"/>
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

    <!-- Return Location (only for DRAYAGE if exists) -->
    ${(() => {
      const returnLoc = order.returnLocation || {};
      const loadType = order.loadType || '';
      
      // Only show if loadType is DRAYAGE and return location has data
      if (loadType !== 'DRAYAGE' || !returnLoc) {
        return '';
      }
      
      // Check if return location has any meaningful data
      const hasReturnData = returnLoc.address || returnLoc.returnFullAddress || 
                           returnLoc.city || returnLoc.state || returnLoc.zipCode;
      
      if (!hasReturnData) {
        return '';
      }
      
      // Format return location address line (same as pickup/drop)
      const returnAddrLine = formatLocLine({
        name: returnLoc.name || returnLoc.locationName || '',
        address: returnLoc.returnFullAddress || returnLoc.address || '',
        city: returnLoc.city || '',
        state: returnLoc.state || '',
        zipCode: returnLoc.zipCode || ''
      });
      const returnDateStr = formatDateStr(returnLoc.returnDate);
      const returnTimeStr = returnLoc.returnDate ? formatTimeStr(returnLoc.returnDate) : 'N/A';
      const hoursLabel = 'Return Hours';
      
      return (
        '<table class="rates-table">' +
        '<thead><tr><th colspan="2" style="text-align:left;background:#f0f0f0;font-size:14px;font-weight:bold;">Return Location</th></tr></thead>' +
        '<tbody>' +
        '<tr>' +
        '<td colspan="2" style="padding:8px;font-weight:bold;border-bottom:1px solid #ddd;">' + returnAddrLine + '</td>' +
        '</tr>' +
        '<tr>' +
        '<td style="width:50%;padding:8px;">' +
        '<strong>Date:</strong> ' + returnDateStr + '<br>' +
        // '<strong>Time:</strong> ' + returnTimeStr + '<br>' +
        '<strong>Type:</strong> ' + (ship.containerType || '40HC') + '<br>' +
        '<strong>Quantity:</strong> 1<br>' +
        '<strong>Weight:</strong> ' + (returnLoc.weight ? returnLoc.weight + ' lbs' : 'N/A') +
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
    })()}

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

      // Determine logo based on company name
      const orderCompanyName = order?.company || order?.addDispature || '';
      let pdfLogo = Logo;
      if (orderCompanyName === 'IDENTIFICA LLC') {
        pdfLogo = IdentificaLogo;
      } else if (orderCompanyName === 'MT. POCONO TRANSPORTATION INC') {
        pdfLogo = MtPoconoLogo;
      }

      // ---- Company Name and Address based on selection ----
      let companyDisplayName = '';
      let companyDisplayAddress = '';
      if (orderCompanyName === 'V Power Logistics') {
        companyDisplayName = 'V Power Logistics';
        companyDisplayAddress = '7945 14TH AVE SW SEATTLE, WA 98106';
      } else if (orderCompanyName === 'IDENTIFICA LLC') {
        companyDisplayName = 'IDENTIFICA LLC';
        companyDisplayAddress = '8601 FURRAY RD HOUSTON, TX USA 77028';
      } else if (orderCompanyName === 'MT. POCONO TRANSPORTATION INC') {
        companyDisplayName = 'MT. POCONO TRANSPORTATION INC';
        companyDisplayAddress = '1900 CORPORATE CENTER DRIVE EAST TOBYHANNA, PA 18466';
      }

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
      const FSC_PERCENT = Number(cust.fsc) || 0;
      const FSC = LH * (FSC_PERCENT / 100); // FSC is percentage of Line Haul
      const OTH = Number(cust.otherTotal) || 0;
      const CUSTOMER_TOTAL = LH + FSC + OTH;

      // helpers - Fixed date formatting without timezone conversion
      const fmtDate = (d) => {
        if (!d) return 'N/A';
        try {
          // Handle ISO date strings (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss) by parsing directly
          let year, month, day;
          if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
            // ISO format: extract date parts directly from string
            const parts = d.split('T')[0].split('-');
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            day = parseInt(parts[2], 10);
          } else {
            // Other formats: use Date object but extract UTC components to avoid timezone shift
            const dt = new Date(d);
            if (Number.isNaN(dt.getTime())) return 'N/A';
            // Use UTC methods to avoid timezone conversion issues
            year = dt.getUTCFullYear();
            month = dt.getUTCMonth() + 1;
            day = dt.getUTCDate();
          }
          return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
        } catch (error) {
          console.error('Error formatting date:', error, d);
          return 'N/A';
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
  .logo{width:280px;height:180px;object-fit:contain;flex:0 0 auto}
  .logo-container{margin-bottom:12px;width:100%}
  .company-table{border-collapse:collapse;width:100%;font-size:12px;margin-top:8px}
  .company-table th,.company-table td{border:1px solid #ddd;padding:6px;text-align:left;vertical-align:top}
  .company-table th{background:#f5f5f5;font-weight:bold}
  .company-table th:first-child{width:20%}
  .company-table th:last-child{width:80%}
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
      <div>
        <div class="logo-container">
          <img src="${pdfLogo}" alt="Company Logo" class="logo" style="width:100%; max-width:300px; height:auto; object-fit:contain;" >
        </div>
        <table class="company-table">
          <tr><th style="width: 25%;">Bill From</th><td>${companyDisplayName ? `${companyDisplayName}<br>${companyDisplayAddress}` : 'N/A'}</td></tr>
        </table>
      </div>
      <div class="header-right">
        <table class="billto" style="width: 90%;">
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

    <!-- Return Location (only for DRAYAGE if exists) -->
    ${(() => {
      const returnLoc = order.returnLocation || {};
      const loadType = order.loadType || '';
      
      // Only show if loadType is DRAYAGE and return location has data
      if (loadType !== 'DRAYAGE' || !returnLoc) {
        return '';
      }
      
      // Check if return location has any meaningful data
      const hasReturnData = returnLoc.address || returnLoc.returnFullAddress || 
                           returnLoc.city || returnLoc.state || returnLoc.zipCode;
      
      if (!hasReturnData) {
        return '';
      }
      
      const fullAddr = (loc) => {
        if (!loc) return 'N/A';
        const parts = [loc.address, loc.city, loc.state, loc.zipCode].filter(Boolean);
        return parts.length ? parts.join(', ') : 'N/A';
      };
      
      // Fixed date formatting - parses date correctly without timezone shifts
      const fmtDate = (d) => {
        if (!d) return 'N/A';
        try {
          // Handle ISO date strings (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss) by parsing directly
          let year, month, day;
          if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
            // ISO format: extract date parts directly from string
            const parts = d.split('T')[0].split('-');
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            day = parseInt(parts[2], 10);
          } else {
            // Other formats: use Date object but extract UTC components to avoid timezone shift
            const dt = new Date(d);
            if (Number.isNaN(dt.getTime())) return 'N/A';
            // Use UTC methods to avoid timezone conversion issues
            year = dt.getUTCFullYear();
            month = dt.getUTCMonth() + 1;
            day = dt.getUTCDate();
          }
          return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
        } catch {
          return 'N/A';
        }
      };
      
      // If returnFullAddress exists, use only that (it already contains full address)
      // Otherwise, construct from individual parts to avoid duplication
      let returnAddr = 'N/A';
      if (returnLoc.returnFullAddress && returnLoc.returnFullAddress.trim()) {
        returnAddr = returnLoc.returnFullAddress.trim();
      } else {
        returnAddr = fullAddr({
          address: returnLoc.address 
        });
      }
      const weight = (returnLoc.weight ?? '') !== '' && returnLoc.weight !== null ? returnLoc.weight : 'N/A';
      const contNo = order.shipper?.containerNo || 'N/A';
      const contTp = order.shipper?.containerType || 'N/A';
      const qty = 1;
      const dateSrc = returnLoc.returnDate;
      
      return `
    <div class="section">
      <table class="tbl">
        <thead>
          <tr>
            <th>Location Name</th>
            <th>Return Address</th>
            <th>Weight (lbs)</th>
            <th>Container No</th>
            <th>Container Type</th>
            <th>Qty</th>
            <th>Return Date</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${returnLoc.name || 'N/A'}</td>
            <td>${returnAddr} ${returnLoc.city || ''} ${returnLoc.state || ''} ${returnLoc.zipCode || ''}</td>
            <td>${weight}</td>
            <td>${contNo}</td>
            <td>${contTp}</td>
            <td>${qty}</td>
            <td>${fmtDate(dateSrc)}</td>
          </tr>
        </tbody>
      </table>
    </div>`;
    })()}

    <!-- Charges: ONLY customer information rates -->
    <div class="section">
      <table class="tbl">
        <thead><tr><th>Description</th><th>Quantity</th><th>Amount</th></tr></thead>
        <tbody>
          ${LH > 0 ? `<tr><td>Line Haul</td><td>1</td><td class="amount">$${LH.toLocaleString()}</td></tr>` : ''}
          ${FSC > 0 ? `<tr><td>FSC</td><td>1</td><td class="amount">$${FSC.toLocaleString()}</td></tr>` : ''}
          ${(() => {
            if (Array.isArray(cust.chargeRows) && cust.chargeRows.length > 0) {
              return cust.chargeRows.map(r => {
                const rowName = r.name || 'Other';
                const rowQuantity = r.quantity || 'N/A';
                const rowAmt = Number(r.total || r.amt || 0);
                if (rowAmt === 0 && !r.name) return '';
                return `<tr><td>${rowName}</td><td>${rowQuantity}</td><td class="amount">$${rowAmt.toLocaleString()}</td></tr>`;
              }).join('');
            }
            if (Array.isArray(cust.other) && cust.other.length > 0) {
              return cust.other.map(ch => `<tr><td>${ch.name}</td><td>${ch.quantity || 'N/A'}</td><td class="amount">$${Number(ch.total || 0).toLocaleString()}</td></tr>`).join('');
            }
            if (OTH > 0) {
              return `<tr><td>Other</td><td>N/A</td><td class="amount">$${OTH.toLocaleString()}</td></tr>`;
            }
            return '';
          })()}
          <tr class="total-row">
            <td><strong>TOTAL</strong></td>
            <td></td>
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


  // Generate BOL PDF function
  const generateBolPDF = (orderInput) => {
    // ---------- SAFE DEFAULTS ----------
    const order = orderInput || {};
    const shipper = order.shipper || {};
    const pickupLocs = Array.isArray(shipper.pickUpLocations) ? shipper.pickUpLocations : [];
    const dropLocs = Array.isArray(shipper.dropLocations) ? shipper.dropLocations : [];

    // Multi-key Load Number (first available)
    // Multi-key Load Number (first available)
    const getLoadNumber = () => {
      // 1) customers[].loadNo (pehle non-empty lo)
      const fromCustomers = Array.isArray(order?.customers)
        ? (order.customers.map(c => (c?.loadNo || '').trim()).find(v => v))
        : null;

      // 2) table/list me aksar doNum me loadNo aa jata hai
      const fromDoNum = (order?.doNum || '').trim();

      // 3) legacy/other fields
      const fromOrder =
        (order?.loadNo || order?.loadNumber || order?.loadId || order?.referenceNo || '').trim();
      const fromShipper =
        (shipper?.loadNo || shipper?.loadNumber || '').trim();

      // 4) (optional) last fallback: workOrderNo (agar chaho)
      const fromWON =
        Array.isArray(order?.customers)
          ? (order.customers.map(c => (c?.workOrderNo || '').trim()).find(v => v) || '')
          : '';

      // priority: customers.loadNo → doNum → order.* → shipper.* → workOrderNo → 'N/A'
      return fromCustomers || fromDoNum || fromOrder || fromShipper || fromWON || 'N/A';
    };


    // NEW: Collect BOL(s)
    const bolLine = (() => {
      const arr = [];
      if (Array.isArray(order?.bols)) {
        order.bols.forEach(b => {
          const v = typeof b === 'string' ? b : (b?.bolNo || b?.number || '');
          if (v && String(v).trim()) arr.push(String(v).trim());
        });
      }
      if (!arr.length && order?.bolInformation) arr.push(String(order.bolInformation));
      return arr.length ? Array.from(new Set(arr)).join(', ') : 'N/A';
    })();

    // Determine logo based on company name git change 
    const companyName = order?.company || order?.addDispature || '';
    let pdfLogo = Logo;
    if (companyName === 'IDENTIFICA LLC') {
      pdfLogo = IdentificaLogo;
    } else if (companyName === 'MT. POCONO TRANSPORTATION INC') {
      pdfLogo = MtPoconoLogo;
    }
    
    // Logo fallback (1x1 transparent if not provided)
    const safeLogo = order.logoSrc || pdfLogo || (typeof logoSrc !== 'undefined' ? logoSrc :
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGP4BwQACgAB/WHvJ2sAAAAASUVORK5CYII=');

    // ---------- HELPERS ----------
    // Fixed date formatting - parses date correctly without timezone shifts
    const fmtDate = (d) => {
      if (!d) return 'N/A';
      try {
        // Handle ISO date strings (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss) by parsing directly
        let year, month, day;
        if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
          // ISO format: extract date parts directly from string
          const parts = d.split('T')[0].split('-');
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          day = parseInt(parts[2], 10);
        } else {
          // Other formats: use Date object but extract UTC components to avoid timezone shift
          const dt = new Date(d);
          if (Number.isNaN(dt.getTime())) return 'N/A';
          // Use UTC methods to avoid timezone conversion issues
          year = dt.getUTCFullYear();
          month = dt.getUTCMonth() + 1;
          day = dt.getUTCDate();
        }
        return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
      } catch {
        return 'N/A';
      }
    };

    const fmtTime = (d) => {
      if (!d) return '';
      const dt = new Date(d);
      return isNaN(dt)
        ? ''
        : dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const fmtAddr = (loc) => {
      if (!loc || typeof loc !== 'object') return 'N/A';
      const parts = [loc.name, loc.address, loc.city, loc.state, loc.zipCode].filter(Boolean);
      return parts.length ? parts.join(', ') : 'N/A';
    };

    const rowsLen = Math.max(pickupLocs.length, dropLocs.length);

    // Truck In/Out (blank lines if not present)
    const truckIn = fmtTime(order.truckInTime);
    const truckOut = fmtTime(order.truckOutTime);

    // ---------- HTML ----------
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Bill of Lading</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; line-height:1.4; color:#333; background:#fff; font-size:12px; }
  .container { max-width:800px; margin:0 auto; padding:20px; }
  .header { display:flex; justify-content:space-between; align-items:start; margin-bottom:20px; }
  .logo { width:180px; height:120px; object-fit:contain; }
  .section { margin-bottom:20px; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
  .box { border:1px solid #ccc; padding:15px; border-radius:8px; }
  .box-title { font-weight:bold; margin-bottom:10px; color:#2c3e50; }
  .field { margin-bottom:8px; }
  .label { font-weight:bold; color:#666; }
  .value { margin-left:5px; }
  table { width:100%; border-collapse:collapse; margin:15px 0; }
  th, td { border:1px solid #ddd; padding:8px; text-align:left; }
  th { background:#f5f5f5; }
  .footer { margin-top:30px; padding-top:20px; border-top:1px solid #ddd; }
  .signatures { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:20px; }
  .signature-box { border-top:1px solid #999; padding-top:5px; margin-top:50px; }
  .time-row { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:10px; }
  .line { display:inline-block; min-width:140px; border-bottom:1px solid #999; padding:0 6px; }
  @media print { @page { margin: 0.5cm; } }
</style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <img src="${safeLogo}" alt="Company Logo" class="logo"/>
      <div style="text-align:right;">
        <h2 style="color:#2c3e50; margin-bottom:5px;">BILL OF LADING</h2>
        <p>Date: ${fmtDate(new Date())}</p>
        <p>BOL Number(s): ${bolLine}</p>           <!-- UPDATED: BOLs -->
        <p>Load Number: ${getLoadNumber()}</p>     <!-- NEW: Load No -->
      </div>
    </div>

    <!-- Shipper Info -->
  <div class="grid">
  <div class="box">
    <div class="box-title">Shipper Information</div>

    <div class="field">
      <span class="label">Name:</span>
      <span class="value">${shipper?.dropLocations?.[0]?.name || 'N/A'}</span>
    </div>

    <div class="field">
      <span class="label">Container No:</span>
      <span class="value">${shipper.containerNo || 'N/A'}</span>
    </div>

    <div class="field">
      <span class="label">Container Type:</span>
      <span class="value">${shipper.containerType || 'N/A'}</span>
    </div>

  </div>
</div>


    <!-- Pickup & Delivery -->
    <div class="section">
      <table>
        <thead>
          <tr><th colspan="2">Pickup Location(s)</th><th colspan="2">Delivery Location(s)</th></tr>
        </thead>
        <tbody>
          <tr>
            <td style="width:25%"><strong>Address</strong></td>
            <td style="width:25%"><strong>Date </strong></td>
            <td style="width:25%"><strong>Address</strong></td>
            <td style="width:25%"><strong>Date </strong></td>
          </tr>
          ${rowsLen > 0
        ? Array.from({ length: rowsLen }).map((_, i) => {
          const pu = pickupLocs[i];
          const dr = dropLocs[i];
          const puDate = pu?.pickUpDate ? fmtDate(pu.pickUpDate) : 'N/A';
          const drDate = dr?.dropDate ? fmtDate(dr.dropDate) : 'N/A';
          return `
                  <tr>
                    <td>${pu ? fmtAddr(pu) : 'N/A'}</td>
                    <td>${puDate}</td>
                    <td>${dr ? fmtAddr(dr) : 'N/A'}</td>
                    <td>${drDate}</td>
                  </tr>`;
        }).join('')
        : '<tr><td colspan="4" style="text-align:center;">No locations specified</td></tr>'
      }
        </tbody>
      </table>
    </div>

    <!-- Freight Information (Load # included) -->
    <div class="section">
      <table>
        <thead>
          <tr>
            <th>Handling Units</th>
            <th>Load #</th>
            <th>Weight</th>
            <th>Description</th>
            <th>Special Instructions</th>
          </tr>
        </thead>
        <tbody>
          ${(pickupLocs.length ? pickupLocs : [{}]).map((loc) => `
              <tr>
                <td>1</td>
                <td>${getLoadNumber()}</td>
                <td>${loc?.weight ? loc.weight + ' lbs' : 'N/A'}</td>
                <td>${shipper.containerType || 'N/A'}</td>
                <td>${loc?.remarks || 'N/A'}</td>
              </tr>
            `).join('')
      }
        </tbody>
      </table>
    </div>

  

    <!-- Footer & Signatures -->
    <div class="footer">
      <!-- Arrival / Departure just ABOVE Shipper Signature -->
      <div class="box" style="margin-top:10px;">
        <div class="box-title">Arrival / Departure</div>
        <div class="time-row">
          <div class="field">
            <span class="label">Truck In Time:</span>
            <span class="value">${truckIn || '<span class="line">&nbsp;</span>'}</span>
          </div>
          <div class="field">
            <span class="label">Truck Out Time:</span>
            <span class="value">${truckOut || '<span class="line">&nbsp;</span>'}</span>
          </div>
        </div>
      </div>

      <div class="signatures">
        <div>
          <p><strong>Shipper Signature / Date</strong></p>
          <div class="signature-box">
            _____________________________________________<br>
            <span style="font-size:10px;">
              This is to certify that the above named materials are properly classified, packaged, marked, and labeled,
              and are in proper condition for transportation according to the applicable regulations of the DOT.
            </span>
          </div>
        </div>

        <div>
          <p><strong>Carrier Signature / Date</strong></p>
          <div class="signature-box">
            _____________________________________________<br>
            <span style="font-size:10px;">
              Carrier acknowledges receipt of packages and required placards. Carrier certifies emergency response information
              was made available and/or carrier has the DOT emergency response guidebook or equivalent documentation in the vehicle.
            </span>
          </div>
        </div>
      </div>

      <div style="margin-top:20px; font-size:10px;">
        <p>Note: Liability Limitation for loss or damage in this shipment may be applicable. See 49 U.S.C. § 14706(c)(1)(A) and (B).</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

    // ---------- PRINT: popup first, then iframe fallback ----------
    const openAndPrint = (docTarget) => {
      docTarget.document.open();
      docTarget.document.write(html);
      docTarget.document.close();
      docTarget.onload = function () {
        docTarget.focus();
        docTarget.print();
        if (docTarget !== window && docTarget.close) docTarget.close();
      };
    };

    try {
      const printWindow = window.open('', '_blank', 'noopener,noreferrer');
      if (printWindow && !printWindow.closed) {
        openAndPrint(printWindow);
      } else {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        openAndPrint(iframe.contentWindow);
        setTimeout(() => iframe.remove(), 5000);
      }
    } catch (err) {
      console.error('Error generating BOL PDF:', err);
      if (typeof alertify !== 'undefined' && alertify?.error) {
        alertify.error('Failed to generate BOL PDF. Please try again.');
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
      <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center" onClick={() => setPreviewImg(null)}>
        <div className="relative bg-white rounded-2xl overflow-hidden p-4" onClick={(e) => e.stopPropagation()}>
          <img src={previewImg} alt="Document Preview" className="max-h-[80vh] rounded-xl" />
          <button
            onClick={() => setPreviewImg(null)}
            className="absolute left-4 top-4 bg-white p-2 rounded-full hover:bg-blue-100"
          >
            <FaArrowLeft />
          </button>
        </div>
      </div>
    );
  }

  if (modalType) {
    return (
      <div className="fixed inset-0 z-50 backdrop-blue-sm bg-black/30 flex items-center justify-center" onClick={() => setModalType(null)}>
        <div className="bg-white p-8 rounded-2xl w-[400px] relative flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
          <button className="absolute right-4 top-2 text-xl hover:text-red-500" onClick={() => setModalType(null)}>×</button>
          <textarea
            className="w-full border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 p-3 rounded-lg mb-4"
            rows={5}
            placeholder={`Type reason of ${modalType}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full font-semibold hover:from-blue-700 hover:to-purple-700 transition"
            onClick={() => handleStatusUpdate(modalType === 'approval' ? 'approved' : modalType === 'rejection' ? 'rejected' : 'resubmit')}
          >
            Submit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Top Section Container with Outer Border */}
      <div className="flex flex-col gap-6 mb-6 border border-gray-200 rounded-xl p-6 bg-white">
        
        {/* Row 1: Stats & Actions */}
        <div className="flex flex-col xl:flex-row gap-6">
          
          {/* Left: Stats Cards - Flexible Grid */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
  {/* Total Orders */}
  <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center relative">
    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-gray-700 font-bold text-2xl">
      {filteredAllOrdersForCount.length}
    </div>

    <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold">
      Total Orders
    </div>
  </div>

  {/* Today */}
  <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center relative">
    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-gray-700 font-bold text-2xl">
      {(() => {
        const count = filteredAllOrdersForCount.filter(
          order =>
            order.createdAt ===
            new Date().toISOString().split("T")[0]
        ).length
        return count
      })()}
    </div>

    <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold">
      Today
    </div>
  </div>
</div>


          {/* Right Column: Actions (Add Button & Date Range) */}
          <div className="flex flex-col gap-1 w-full xl:w-[350px]">
              {/* Add Button */}
              <button
                onClick={() => {
                  setFormMode('add');
                  setEditingOrder(null);
                  setShowAddOrderForm(true);
                }}
                className="flex items-center justify-between gap-4 px-6 h-[40px] bg-blue-600 rounded-lg text-white font-semibold hover:bg-blue-700 transition w-full"
              >
                <span>Add Delivery Order</span>
                <PlusCircle size={20} />
              </button>

              {/* Date Range Dropdown */}
              <div className="relative w-full">
                  <button
                      type="button"
                      onClick={() => setShowPresetMenu(v => !v)}
                      className="w-full text-left px-4 h-[45px] border border-gray-200 rounded-lg bg-white flex items-center justify-between text-gray-700 font-medium hover:border-gray-300 transition-colors"
                  >
                      <span className={!range.startDate || !range.endDate ? 'text-gray-800' : 'text-gray-800'}>
                      {range.startDate && range.endDate 
                          ? `${format(range.startDate, 'MMM dd, yyyy')} - ${format(range.endDate, 'MMM dd, yyyy')}`
                          : 'Select Date Range'}
                      </span>
                      <span className="ml-3 text-gray-400">▼</span>
                  </button>

                  {showPresetMenu && (
                      <div className="absolute z-50 mt-2 w-full rounded-lg border border-gray-100 bg-white shadow-lg py-1 right-0">
                      <button
                          onClick={() => {
                          setRange({ startDate: null, endDate: null, key: 'selection' });
                          setShowPresetMenu(false);
                          }}
                          className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-600"
                      >
                          Clear Filter
                      </button>
                      <div className="my-1 border-t border-gray-100" />
                      {Object.keys(presets).map((lbl) => (
                          <button
                          key={lbl}
                          onClick={() => applyPreset(lbl)}
                          className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700"
                          >
                          {lbl}
                          </button>
                      ))}
                      <div className="my-1 border-t border-gray-100" />
                      <button
                          onClick={() => { setShowPresetMenu(false); setShowCustomRange(true); }}
                          className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700"
                      >
                          Custom Range
                      </button>
                      </div>
                  )}
              </div>
          </div>
        </div>

        {/* Row 2: Search Bar */}
        <div className="relative w-full">
            <input
            type="text"
            placeholder="Search Orders"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-6 pr-12 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-colors text-gray-600 placeholder-gray-400"
            />
            <Search className="absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-400" size={24} />
        </div>
      </div>

      {/* Custom Range Modal */}
      {showCustomRange && (
        <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4" onClick={() => setShowCustomRange(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-4" onClick={(e) => e.stopPropagation()}>
            <DateRange
              ranges={[range.startDate && range.endDate ? range : { startDate: new Date(), endDate: new Date(), key: 'selection' }]}
              onChange={(item) => {
                if (item.selection.startDate && item.selection.endDate) {
                  setRange(item.selection);
                }
              }}
              moveRangeOnFirstSelection={false}
              months={2}
              direction="horizontal"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={() => {
                  setRange({ startDate: null, endDate: null, key: 'selection' });
                  setShowCustomRange(false);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setShowCustomRange(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (range.startDate && range.endDate) {
                    setShowCustomRange(false);
                  }
                }}
                className={`px-4 py-2 rounded-lg ${
                  range.startDate && range.endDate
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                disabled={!range.startDate || !range.endDate}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Error Display */}
      {/* The custom error box UI for API errors is removed as per the edit hint. */}

      {viewDoc && selectedOrder ? (
        <div className="bg-white rounded-2xl p-8 max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="flex gap-4">
              <button
                onClick={() => setModalType('approval')}
                className="flex items-center gap-1 bg-gradient-to-r from-green-500 to-green-700 text-white px-5 py-2 rounded-full hover:from-green-600 hover:to-green-800 transition"
              >
                <CheckCircle size={18} /> Approve
              </button>
              <button
                onClick={() => setModalType('rejection')}
                className="flex items-center gap-1 bg-gradient-to-r from-red-500 to-red-700 text-white px-5 py-2 rounded-full hover:from-red-600 hover:to-red-800 transition"
              >
                <XCircle size={18} /> Reject
              </button>
              <button
                onClick={() => setModalType('resubmit')}
                className="flex items-center gap-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-5 py-2 rounded-full hover:from-blue-600 hover:to-purple-700 transition"
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
            <div className="border rounded-2xl p-6 bg-white flex flex-col gap-2">
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
                className="rounded-xl max-h-[250px] w-full object-contain border border-green-100 cursor-pointer hover:scale-105 transition"
                onClick={() => setPreviewImg(`${API_CONFIG.BASE_URL}/${selectedOrder.docUpload}`)}
              />
              <div className="text-xs text-gray-400 mt-2">Click image to preview</div>
            </div>
          </div>

          {/* Uploaded Files Section */}
          {selectedOrder.uploadedFiles && selectedOrder.uploadedFiles.length > 0 && (
            <div className="mt-8 border rounded-2xl p-6 bg-white">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="text-blue-500" size={20} />
                <h3 className="text-lg font-bold text-blue-700">Uploaded Files</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedOrder.uploadedFiles.map((file, index) => (
                  <div key={index} className="border border-gray-200 rounded-xl p-4 bg-white transition-shadow">
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
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Load ID</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Bill to</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Carrier Name</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Work Order No</th>
                  {/* <th className="text-left py-4 px-4 text-gray-500 font-medium text-xs uppercase tracking-wider">SHIPMENT NO</th> */}
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Container No</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Created By</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Action</th>
                </tr>
              </thead>
              <tbody>
                {currentOrders.map((order, index) => {
                  const workOrderNo = order.customers?.[0]?.workOrderNo || 'N/A';
                  const shipmentNo = order.shipper?.shipmentNo || 'N/A';
                  // Check for containerNo at top level (new format) or in shipper (old format)
                  const containerNo = order.containerNo || order.shipper?.containerNo || 'N/A';
                  // Handle createdBy - check for new format (createdByData object) or old format
                  const createdByDisplay = order.createdByData?.employeeName 
                    ? `${order.createdByData.employeeName} (${order.createdByData.empId || ''})`
                    : (order.createdBySalesUser?.employeeName || order.createdBySalesUser || order.createdBy || 'N/A');
                  
                  return (
                    <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-600 font-medium">{order.doNum}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-medium text-gray-800">{order.clientName}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-medium text-gray-800">{order.carrierName}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-medium text-gray-800">{workOrderNo}</span>
                      </td>
                      {/* <td className="py-4 px-4">
                        <span className="text-sm text-gray-600">{shipmentNo}</span>
                      </td> */}
                      <td className="py-4 px-4">
                        <span className="text-sm font-medium text-gray-800">{containerNo}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-medium text-gray-800">{createdByDisplay}</span>
                      </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleViewOrder(order)}
                          className="px-4 py-1 rounded border border-green-500 text-green-500 text-sm font-medium hover:bg-green-50 transition-colors min-w-[70px]"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDuplicateOrder(order)}
                          className="px-4 py-1 rounded border border-purple-500 text-purple-500 text-sm font-medium hover:bg-purple-50 transition-colors min-w-[70px]"
                        >
                          Duplicate
                        </button>
                        <button
                          onClick={() => handleEditOrder(order)}
                          className="px-4 py-1 rounded border border-orange-500 text-orange-500 text-sm font-medium hover:bg-orange-50 transition-colors min-w-[70px]"
                        >
                          Edit
                        </button>
                        {/* Only show Delete/Reject button for specific employee IDs */}
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
                                className="px-4 py-1 rounded border border-red-500 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors min-w-[70px]"
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
                  );
                })}
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
      {totalPages > 1 && currentOrders.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl border border-gray-200 p-4">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} orders
            {activeSearchTerm && ` (searching: "${activeSearchTerm}")`}
          </div>
          <div className="flex gap-1 items-center">
            <button
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
                  return (
                    <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                      ...
                    </span>
                  );
                }
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                      currentPage === page
                        ? 'bg-white border border-black shadow-sm text-black'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <button
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

      {/* Add Delivery Order Modal */}
      {showAddOrderForm && (
        <div className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex justify-center items-center p-4">
          {/* Hide scrollbar for modal content */}
          <style>{`
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
          `}</style>
          <div
            className="bg-white rounded-3xl max-w-6xl w-full max-h-[95vh] overflow-y-auto hide-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onClick={(e) => e.stopPropagation()}
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
                <div className="flex items-center gap-4">
                  {/* Load Type Toggle - Header ke right side */}
                  <div className="inline-flex items-center bg-blue-500 rounded-full overflow-hidden border-2 border-white/30">
                    <button
                      type="button"
                      onClick={() => handleLoadTypeToggle('OTR')}
                      className={`px-6 py-2 transition-all duration-300 text-sm font-semibold text-center ${selectedLoadType === 'OTR'
                        ? "bg-white text-blue-600"
                        : "bg-transparent text-white hover:bg-white/20"
                        }`}
                    >
                      OTR
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadTypeToggle('DRAYAGE')}
                      className={`px-6 py-2 transition-all duration-300 text-sm font-semibold text-center ${selectedLoadType === 'DRAYAGE'
                        ? "bg-white text-blue-600"
                        : "bg-transparent text-white hover:bg-white/20"
                        }`}
                    >
                      DRAYAGE
                    </button>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="text-white hover:text-gray-200 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            {/* Form */}
            <form
              key={`form-${formMode}-${editingOrder?._id || 'new'}`}
              onSubmit={formMode === 'edit' ? handleUpdateOrder : handleSubmit}
              className="p-6 space-y-6"
            >
              {/* Load Reference Section */}
              <div className="bg-white p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-orange-800 mb-4">Load Reference</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="relative">
                    <SearchableDropdown
                      value={formData.selectedLoad || ''}
                      onChange={handleLoadChange}
                      options={loads.map(load => ({ 
                        value: load._id, 
                        label: `${load.shipmentNumber || 'Load'} - ${load.origins?.[0]?.city || 'Origin'} to ${load.destinations?.[0]?.city || 'Destination'} (${load.commodity || 'N/A'})` 
                      }))}
                      placeholder={loadingLoads ? "Loading loads..." : loadingSelectedLoad ? "Loading load data..." : "Select Assigned Load"}
                      disabled={loadingLoads || loadingSelectedLoad}
                      loading={loadingLoads || loadingSelectedLoad}
                      searchPlaceholder="Search loads..."
                      onOpen={fetchLoads}
                    />
                    {/* Unselect button - shows only when a load is selected */}
                    {formData.selectedLoad && (
                      <button
                        type="button"
                        onClick={() => handleLoadChange('')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold transition-colors duration-200 z-10"
                        title="Unselect Load"
                      >
                        ×
                      </button>
                    )}
                

                    {/* Selected Load Data Display - Hidden per user request */}
                    {false && selectedLoadData && (
                      <div className="mt-4 p-4 bg-white border border-green-200 rounded-lg">
                        <h4 className="text-sm font-semibold text-green-800 mb-3">Selected Load Information</h4>
                        
                        {/* Basic Load Information */}
                        <div className="mb-4">
                          <h5 className="text-xs font-semibold text-gray-700 mb-2">Basic Information</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                            <div>
                              <span className="font-medium text-gray-600">Load ID:</span>
                              <span className="ml-2 text-gray-800">{selectedLoadData._id}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Status:</span>
                              <span className="ml-2 text-gray-800">{selectedLoadData.status}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Load Type:</span>
                              <span className="ml-2 text-gray-800">{selectedLoadData.loadType}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Vehicle Type:</span>
                              <span className="ml-2 text-gray-800">{selectedLoadData.vehicleType}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Rate Type:</span>
                              <span className="ml-2 text-gray-800">{selectedLoadData.rateType}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Total Rate:</span>
                              <span className="ml-2 text-gray-800 font-semibold">${selectedLoadData.rate}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Weight:</span>
                              <span className="ml-2 text-gray-800">{selectedLoadData.weight} lbs</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Commodity:</span>
                              <span className="ml-2 text-gray-800">{selectedLoadData.commodity}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Container No:</span>
                              <span className="ml-2 text-gray-800">{selectedLoadData.containerNo || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">PO Number:</span>
                              <span className="ml-2 text-gray-800">{selectedLoadData.poNumber || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">BOL Number:</span>
                              <span className="ml-2 text-gray-800">{selectedLoadData.bolNumber || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Shipment Number:</span>
                              <span className="ml-2 text-gray-800">{selectedLoadData.shipmentNumber || 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Rate Details */}
                        {selectedLoadData.rateDetails && (
                          <div className="mb-4">
                            <h5 className="text-xs font-semibold text-gray-700 mb-2">Rate Breakdown</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="font-medium text-gray-600">Line Haul:</span>
                                <span className="ml-2 text-gray-800">${selectedLoadData.rateDetails.lineHaul}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">FSC:</span>
                                <span className="ml-2 text-gray-800">${selectedLoadData.rateDetails.fsc}</span>
                              </div>
                              <div className="md:col-span-2">
                                <span className="font-medium text-gray-600">Total Rates:</span>
                                <span className="ml-2 text-gray-800 font-semibold">${selectedLoadData.rateDetails.totalRates}</span>
                              </div>
                              {selectedLoadData.rateDetails.other && selectedLoadData.rateDetails.other.length > 0 && (
                                <div className="md:col-span-2">
                                  <span className="font-medium text-gray-600">Other Charges:</span>
                                  <div className="ml-2 mt-1">
                                    {selectedLoadData.rateDetails.other.map((charge, index) => (
                                      <div key={index} className="text-gray-800">
                                        {charge.name}: ${charge.total} ({charge.quantity} × ${charge.amount})
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Shipper Information */}
                        {selectedLoadData.shipper && (
                          <div className="mb-4">
                            <h5 className="text-xs font-semibold text-gray-700 mb-2">Shipper Details</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="font-medium text-gray-600">Company:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.shipper.compName}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">MC/DOT:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.shipper.mc_dot_no}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Location:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.shipper.city}, {selectedLoadData.shipper.state}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Phone:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.shipper.phoneNo}</span>
                              </div>
                              <div className="md:col-span-2">
                                <span className="font-medium text-gray-600">Email:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.shipper.email}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Assigned To Information */}
                        {selectedLoadData.assignedTo && (
                          <div className="mb-4">
                            <h5 className="text-xs font-semibold text-gray-700 mb-2">Assigned Carrier</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="font-medium text-gray-600">Company:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.assignedTo.compName}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">MC/DOT:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.assignedTo.mc_dot_no}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Location:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.assignedTo.city}, {selectedLoadData.assignedTo.state}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Phone:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.assignedTo.phoneNo}</span>
                              </div>
                              <div className="md:col-span-2">
                                <span className="font-medium text-gray-600">Email:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.assignedTo.email}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Accepted Bid Information */}
                        {selectedLoadData.acceptedBid && (
                          <div className="mb-4">
                            <h5 className="text-xs font-semibold text-gray-700 mb-2">Accepted Bid Details</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="font-medium text-gray-600">Driver:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.acceptedBid.driverName}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Driver Phone:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.acceptedBid.driverPhone}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Vehicle:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.acceptedBid.vehicleNumber}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Vehicle Type:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.acceptedBid.vehicleType}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Bid Rate:</span>
                                <span className="ml-2 text-gray-800 font-semibold">${selectedLoadData.acceptedBid.rate}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Bid Status:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.acceptedBid.status}</span>
                              </div>
                              <div className="md:col-span-2">
                                <span className="font-medium text-gray-600">Message:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.acceptedBid.message}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Est. Pickup:</span>
                                <span className="ml-2 text-gray-800">
                                  {selectedLoadData.acceptedBid.estimatedPickupDate ? 
                                    new Date(selectedLoadData.acceptedBid.estimatedPickupDate).toLocaleDateString() : 'N/A'}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Est. Delivery:</span>
                                <span className="ml-2 text-gray-800">
                                  {selectedLoadData.acceptedBid.estimatedDeliveryDate ? 
                                    new Date(selectedLoadData.acceptedBid.estimatedDeliveryDate).toLocaleDateString() : 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Origins */}
                        {selectedLoadData.origins && selectedLoadData.origins.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-xs font-semibold text-gray-700 mb-2">Pickup Locations</h5>
                            {selectedLoadData.origins.map((origin, index) => (
                              <div key={index} className="mb-2 p-2 bg-white rounded border text-xs">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  <div>
                                    <span className="font-medium text-gray-600">Address:</span>
                                    <span className="ml-2 text-gray-800">
                                      {origin.addressLine1} {origin.addressLine2 && `, ${origin.addressLine2}`}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">City, State, ZIP:</span>
                                    <span className="ml-2 text-gray-800">
                                      {origin.city}, {origin.state} {origin.zip}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Weight:</span>
                                    <span className="ml-2 text-gray-800">{origin.weight} lbs</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Commodity:</span>
                                    <span className="ml-2 text-gray-800">{origin.commodity}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Pickup Date:</span>
                                    <span className="ml-2 text-gray-800">
                                      {origin.pickupDate ? new Date(origin.pickupDate).toLocaleDateString() : 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Delivery Date:</span>
                                    <span className="ml-2 text-gray-800">
                                      {origin.deliveryDate ? new Date(origin.deliveryDate).toLocaleDateString() : 'N/A'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Destinations */}
                        {selectedLoadData.destinations && selectedLoadData.destinations.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-xs font-semibold text-gray-700 mb-2">Delivery Locations</h5>
                            {selectedLoadData.destinations.map((destination, index) => (
                              <div key={index} className="mb-2 p-2 bg-white rounded border text-xs">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  <div>
                                    <span className="font-medium text-gray-600">Address:</span>
                                    <span className="ml-2 text-gray-800">
                                      {destination.addressLine1} {destination.addressLine2 && `, ${destination.addressLine2}`}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">City, State, ZIP:</span>
                                    <span className="ml-2 text-gray-800">
                                      {destination.city}, {destination.state} {destination.zip}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Weight:</span>
                                    <span className="ml-2 text-gray-800">{destination.weight} lbs</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Commodity:</span>
                                    <span className="ml-2 text-gray-800">{destination.commodity}</span>
                                  </div>
                                  <div className="md:col-span-2">
                                    <span className="font-medium text-gray-600">Delivery Date:</span>
                                    <span className="ml-2 text-gray-800">
                                      {destination.deliveryDate ? new Date(destination.deliveryDate).toLocaleDateString() : 'N/A'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* CMT Assignment Details */}
                        {selectedLoadData.cmtAssignmentDetails && (
                          <div className="mb-4">
                            <h5 className="text-xs font-semibold text-gray-700 mb-2">CMT Assignment</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="font-medium text-gray-600">Assigned CMT:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.cmtAssignmentDetails.assignedCMTUser?.employeeName}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Approval Status:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.cmtAssignmentDetails.approvalStatus}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Employee ID:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.cmtAssignmentDetails.assignedCMTUser?.empId}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Email:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.cmtAssignmentDetails.assignedCMTUser?.email}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Mobile:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.cmtAssignmentDetails.assignedCMTUser?.mobileNo}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Department:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.cmtAssignmentDetails.assignedCMTUser?.department}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Timer Status */}
                        {selectedLoadData.timerStatus && (
                          <div className="mb-4">
                            <h5 className="text-xs font-semibold text-gray-700 mb-2">Timer Status</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="font-medium text-gray-600">Has Timer:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.timerStatus.hasTimer ? 'Yes' : 'No'}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Is Expired:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.timerStatus.isExpired ? 'Yes' : 'No'}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Remaining Minutes:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.timerStatus.remainingMinutes}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Deadline:</span>
                                <span className="ml-2 text-gray-800">
                                  {selectedLoadData.timerStatus.deadline ? 
                                    new Date(selectedLoadData.timerStatus.deadline).toLocaleString() : 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Created By Information */}
                        {selectedLoadData.createdBySalesUser && (
                          <div className="mb-4">
                            <h5 className="text-xs font-semibold text-gray-700 mb-2">Created By</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="font-medium text-gray-600">Employee ID:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.createdBySalesUser.empId}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Name:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.createdBySalesUser.empName}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Department:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.createdBySalesUser.department}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Customer Added By */}
                        {selectedLoadData.customerAddedBy && (
                          <div className="mb-4">
                            <h5 className="text-xs font-semibold text-gray-700 mb-2">Customer Added By</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="font-medium text-gray-600">Employee ID:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.customerAddedBy.empId}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Name:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.customerAddedBy.empName}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-600">Department:</span>
                                <span className="ml-2 text-gray-800">{selectedLoadData.customerAddedBy.department}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Dates */}
                        <div className="mb-4">
                          <h5 className="text-xs font-semibold text-gray-700 mb-2">Important Dates</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="font-medium text-gray-600">Pickup Date:</span>
                              <span className="ml-2 text-gray-800">
                                {selectedLoadData.pickupDate ? new Date(selectedLoadData.pickupDate).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Delivery Date:</span>
                              <span className="ml-2 text-gray-800">
                                {selectedLoadData.deliveryDate ? new Date(selectedLoadData.deliveryDate).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Bid Deadline:</span>
                              <span className="ml-2 text-gray-800">
                                {selectedLoadData.bidDeadline ? new Date(selectedLoadData.bidDeadline).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Created At:</span>
                              <span className="ml-2 text-gray-800">
                                {selectedLoadData.createdAt ? new Date(selectedLoadData.createdAt).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Updated At:</span>
                              <span className="ml-2 text-gray-800">
                                {selectedLoadData.updatedAt ? new Date(selectedLoadData.updatedAt).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Company Sectiondfsdfsdfsdf */}
              <div className="bg-teal-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-teal-800 mb-4">Company</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <SearchableDropdown
                      value={formData.company || ''}
                      onChange={handleCompanyChange}
                      options={[
                        { value: 'V Power Logistics', label: 'V Power Logistics' },
                        { value: 'IDENTIFICA LLC', label: 'IDENTIFICA LLC' },
                        { value: 'MT. POCONO TRANSPORTATION INC', label: 'MT. POCONO TRANSPORTATION INC' }
                      ]}
                      placeholder="Select Company"
                      searchPlaceholder="Search companies..."
                      className={errors.company ? 'border-red-500' : ''}
                    />
                    {errors.company && <p className="text-red-600 text-xs mt-1">{errors.company}</p>}
                  </div>
                </div>
              </div>

              {/* Customer Information Section */}
              {/* Customer Information Section */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-blue-800">Customer Information</h3>
                  {selectedLoadType === 'OTR' && (
                    <button type="button" onClick={addCustomer} className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition">
                      + Add Customer
                    </button>
                  )}
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
                          <SearchableDropdown
                            value={customer.billTo || ''}
                            onChange={(value) => handleCustomerChange(customerIndex, 'billTo', value)}
                            options={[
                              ...(customer.billTo && !shippers.some(s => (s.compName || '') === customer.billTo)
                                ? [{ value: customer.billTo, label: `${customer.billTo} (custom)` }]
                                : []),
                              ...shippers.map(s => ({ value: s.compName || '', label: s.compName || '(No name)' }))
                            ]}
                            placeholder={loadingShippers ? "Loading companies..." : "Select Company *"}
                            disabled={loadingShippers}
                            loading={loadingShippers}
                            searchPlaceholder="Search companies..."
                            onOpen={fetchShippersList}
                            className={cErr.billTo ? errBox(true) : ''}
                          />
                          {cErr.billTo && <p className="text-red-600 text-xs mt-1">{cErr.billTo}</p>}
                        </div>

                        {/* Dispatcher * */}
                        <div>
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
                            placeholder={loadingDispatchers ? "Loading dispatchers..." : "Select Dispatcher *"}
                            disabled={loadingDispatchers}
                            loading={loadingDispatchers}
                            searchPlaceholder="Search dispatchers..."
                            onOpen={fetchDispatchers}
                            className={cErr.dispatcherName ? errBox(true) : ''}
                          />
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
                            placeholder="FSC (%) *"
                          />
                          {cErr.fsc && <p className="text-red-600 text-xs mt-1">{cErr.fsc}</p>}
                        </div>

                        {/* Other * - Opens Charges Calculator */}
                        <div>
                          <input
                            type="text"
                            value={customer.other}
                            onClick={() => handleCustomerChargesClick(customerIndex)}
                            readOnly
                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${cErr.other ? 'border-red-400' : 'border-gray-300'}`}
                            placeholder="Other * (Click to add charges)"
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
                    <SearchableDropdown
                      value={formData.carrierName || ''}
                      onChange={(value) => {
                        const selectedCarrier = truckers.find(t => t.compName === value);
                        setFormData(prev => ({ 
                          ...prev, 
                          carrierName: value,
                          carrierId: selectedCarrier?.carrierId || selectedCarrier?._id || ''
                        }));
                      }}
                      options={truckers.map(t => ({ 
                        value: t.compName || '', 
                        label: `${t.compName || ''}${t.mc_dot_no ? ` (${t.mc_dot_no})` : ''}` 
                      }))}
                      placeholder={loadingTruckers ? "Loading carriers..." : "Select Carrier Name *"}
                      disabled={loadingTruckers}
                      loading={loadingTruckers}
                      searchPlaceholder="Search carriers..."
                      className={errors.carrier?.carrierName ? errBox(true) : ''}
                      onOpen={fetchTruckersList}
                    />
                    {errors.carrier?.carrierName && <p className="text-red-600 text-xs mt-1">{errors.carrier.carrierName}</p>}
                  </div>

                  <div>
                    <SearchableDropdown
                      value={formData.equipmentType || ''}
                      onChange={(value) => setFormData(prev => ({ ...prev, equipmentType: value }))}
                      options={
                        selectedLoadType === 'OTR' 
                          ? [
                              { value: 'Dry Van', label: 'Dry Van' },
                              { value: 'Reefer', label: 'Reefer' },
                              { value: 'Step Deck', label: 'Step Deck' },
                              { value: 'Double Drop / Lowboy', label: 'Double Drop / Lowboy' },
                              { value: 'Conestoga', label: 'Conestoga' },
                              { value: 'Livestock Trailer', label: 'Livestock Trailer' },
                              { value: 'Car Hauler', label: 'Car Hauler' },
                              { value: 'Container Chassis', label: 'Container Chassis' },
                              { value: 'End Dump', label: 'End Dump' },
                              { value: 'Side Dump', label: 'Side Dump' },
                              { value: 'Hopper Bottom', label: 'Hopper Bottom' }
                            ]
                          : [
                              { value: "20' Standard", label: "20' Standard" },
                              { value: "40' Standard", label: "40' Standard" },
                              { value: "45' Standard", label: "45' Standard" },
                              { value: "20' Reefer", label: "20' Reefer" },
                              { value: "40' Reefer", label: "40' Reefer" },
                              { value: 'Open Top Container', label: 'Open Top Container' },
                              { value: 'Flat Rack Container', label: 'Flat Rack Container' },
                              { value: 'Tank Container', label: 'Tank Container' },
                              { value: "40' High Cube", label: "40' High Cube" },
                              { value: "45' High Cube", label: "45' High Cube" }
                            ]
                      }
                      placeholder="Select Equipment Type *"
                      searchPlaceholder="Search equipment type..."
                      className={errors.carrier?.equipmentType ? errBox(true) : ''}
                    />
                    {errors.carrier?.equipmentType && <p className="text-red-600 text-xs mt-1">{errors.carrier.equipmentType}</p>}
                  </div>

                  {/* Carrier Fees - shows total rates and opens charges calculator on click */}
                  <div>
                    <input
                      type="text"
                      name="carrierFees"
                      value={formData.totalRates ? `$${formData.totalRates}` : formData.carrierFees}
                      onClick={handleChargesClick}
                      readOnly
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer ${errors.carrier?.fees ? 'border-red-400' : 'border-gray-300'}`}
                      placeholder="Carrier Fees * (Click to add charges)"
                    />
                    {errors.carrier?.fees && <p className="text-red-600 text-xs mt-1">{errors.carrier.fees}</p>}
                  </div>
                </div>


              </div>

              {/* Bol Information Section */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">BOL Information</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <input
                      type="text"
                      value={formData.bols?.[0]?.bolNo || ''}
                      onChange={(e) =>
                        setFormData(prev => {
                          const arr = prev.bols && prev.bols.length ? [...prev.bols] : [{ bolNo: '' }];
                          arr[0] = { bolNo: e.target.value };
                          return { ...prev, bols: arr };
                        })
                      }
                      className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                      placeholder="Enter BOL number"
                    />
                  </div>
                </div>
              </div>

              {/* Location Information Section (formerly Shipper Information) */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-800 mb-4">Location Information</h3>

                {/* Location Basic Info */}
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <input
                      type="text"
                      name="shipmentNo"
                      value={formData.shipmentNo || ''}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.shipper?.shipmentNo ? 'border-red-400' : 'border-gray-300'}`}
                      placeholder="Shipment No *"
                    />
                    {errors.shipper?.shipmentNo && <p className="text-red-600 text-xs mt-1">{errors.shipper.shipmentNo}</p>}
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
                    {selectedLoadType === 'DRAYAGE' ? (
                      <SearchableDropdown
                        value={formData.containerType || formData.equipmentType || ''}
                        onChange={(value) => {
                          setFormData(prev => ({ 
                            ...prev, 
                            containerType: value,
                            // Also update equipmentType for consistency
                            equipmentType: value
                          }));
                        }}
                        options={[
                          { value: "20' Standard", label: "20' Standard" },
                          { value: "40' Standard", label: "40' Standard" },
                          { value: "45' Standard", label: "45' Standard" },
                          { value: "20' Reefer", label: "20' Reefer" },
                          { value: "40' Reefer", label: "40' Reefer" },
                          { value: 'Open Top Container', label: 'Open Top Container' },
                          { value: 'Flat Rack Container', label: 'Flat Rack Container' },
                          { value: 'Tank Container', label: 'Tank Container' },
                          { value: "40' High Cube", label: "40' High Cube" },
                          { value: "45' High Cube", label: "45' High Cube" }
                        ]}
                        placeholder="Container Type *"
                        searchPlaceholder="Search container type..."
                        className={errors.shipper?.containerType ? errBox(true) : ''}
                      />
                    ) : (
                      <input
                        type="text"
                        name="containerType"
                        value={formData.containerType}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.shipper?.containerType ? 'border-red-400' : 'border-gray-300'}`}
                        placeholder="Container Type *"
                      />
                    )}
                    {errors.shipper?.containerType && <p className="text-red-600 text-xs mt-1">{errors.shipper.containerType}</p>}
                  </div>

                  <div>
                    <input
                      type="text"
                      name="commodity"
                      value={formData.commodity || ''}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 border-gray-300`}
                      placeholder="Commodity"
                    />
                  </div>
                </div>

                {/* Pickup Locations */}
                {/* Pickup Locations */}
                <div className="bg-white p-4 rounded-lg mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-md font-semibold text-gray-800">Pickup Locations</h4>
                    {selectedLoadType === 'OTR' && (
                      <button type="button" onClick={addPickupLocation} className="px-3 py-1 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition">
                        + Add Location
                      </button>
                    )}
                  </div>

                  {formData.pickupLocations.map((location, locationIndex) => {
                    const lErr = errors.pickups?.[locationIndex] || {};
                    return (
                      <div key={locationIndex} className="bg-gray-50 p-4 rounded-lg mb-3">
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="text-sm font-semibold text-gray-700">Pickup Location {locationIndex + 1}</h5>
                          {selectedLoadType === 'OTR' && formData.pickupLocations.length > 1 && (
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
                              onKeyDown={(e) => {
                                // Allow decimal point, but block negative signs and scientific notation
                                if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
                              }}
                              min="0"
                              step="0.01"
                              inputMode="decimal"
                              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${lErr.weight ? 'border-red-400' : 'border-gray-300'}`}
                              placeholder="Weight (lbs) *"
                            />
                            {lErr.weight && <p className="text-red-600 text-xs mt-1">{lErr.weight}</p>}
                          </div>

                          {/* Make entire field area clickable by also focusing the input on container click */}
                          <div onClick={(e) => e.currentTarget.querySelector('input')?.focus()}>
                            <ClickableDateInput
                              value={formData.pickupLocations[locationIndex]?.pickUpDate || ''}
                              onChange={(val) => handlePickupLocationChange(locationIndex, 'pickUpDate', val)}
                              error={lErr.pickUpDate}
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
                    {selectedLoadType === 'OTR' && (
                      <button
                        type="button"
                        onClick={addDropLocation}
                        className="px-3 py-1 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition"
                      >
                        + Add Location
                      </button>
                    )}
                  </div>

                  {formData.dropLocations.map((location, locationIndex) => {
                    const dErr = errors.drops?.[locationIndex] || {};
                    return (
                      <div key={locationIndex} className="bg-gray-50 p-4 rounded-lg mb-3">
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="text-sm font-semibold text-gray-700">
                            Drop Location {locationIndex + 1}
                          </h5>
                          {selectedLoadType === 'OTR' && formData.dropLocations.length > 1 && (
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
                              onKeyDown={(e) => {
                                // Allow decimal point, but block negative signs and scientific notation
                                if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
                              }}
                              min="0"
                              step="0.01"
                              inputMode="decimal"
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

                {/* Return Location Section - Only for DRAYAGE, inside Location Information */}
  {selectedLoadType === 'DRAYAGE' && (
  <div className="bg-white p-4 rounded-lg mt-4">
    <h4 className="text-md font-semibold text-gray-800 mb-4">Return Location</h4>
    <div className="grid grid-cols-3 gap-4">
      {/* Name */}
      <div className="col-span-1">
        <input
          type="text"
          value={formData.returnLocation?.name || ''}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            returnLocation: { ...prev.returnLocation, name: e.target.value }
          }))}
          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.returnLocation?.name ? 'border-red-400' : 'border-gray-300'}`}
          placeholder="Name (e.g., Warehouse, Port, Facility) *"
        />
        {errors.returnLocation?.name && <p className="text-red-600 text-xs mt-1">{errors.returnLocation.name}</p>}
      </div>
      
      {/* Address */}
      <div className="col-span-1">
        <input
          type="text"
          value={formData.returnLocation?.address || ''}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            returnLocation: { ...prev.returnLocation, address: e.target.value }
          }))}
          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.returnLocation?.address ? 'border-red-400' : 'border-gray-300'}`}
          placeholder="Street Address *"
        />
        {errors.returnLocation?.address && <p className="text-red-600 text-xs mt-1">{errors.returnLocation.address}</p>}
      </div>

      {/* City, State, Zip Code, Weight */}
      <div>
        <input
          type="text"
          value={formData.returnLocation?.city || ''}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            returnLocation: { ...prev.returnLocation, city: e.target.value }
          }))}
          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.returnLocation?.city ? 'border-red-400' : 'border-gray-300'}`}
          placeholder="City *"
        />
        {errors.returnLocation?.city && <p className="text-red-600 text-xs mt-1">{errors.returnLocation.city}</p>}
      </div>
      <div>
        <input
          type="text"
          value={formData.returnLocation?.state || ''}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            returnLocation: { ...prev.returnLocation, state: e.target.value }
          }))}
          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.returnLocation?.state ? 'border-red-400' : 'border-gray-300'}`}
          placeholder="State *"
        />
        {errors.returnLocation?.state && <p className="text-red-600 text-xs mt-1">{errors.returnLocation.state}</p>}
      </div>
      <div>
        <input
          type="text"
          value={formData.returnLocation?.zipCode || ''}
          onChange={(e) => {
            const val = sanitizeAlphaNum(e.target.value);
            setFormData(prev => ({
              ...prev,
              returnLocation: { ...prev.returnLocation, zipCode: val }
            }));
          }}
          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.returnLocation?.zipCode ? 'border-red-400' : 'border-gray-300'}`}
          placeholder="Zip Code *"
        />
        {errors.returnLocation?.zipCode && <p className="text-red-600 text-xs mt-1">{errors.returnLocation.zipCode}</p>}
      </div>
      <div>
        <input
          type="number"
          value={formData.returnLocation?.weight || ''}
          onChange={(e) => {
            const val = e.target.value;
            setFormData(prev => ({
              ...prev,
              returnLocation: { ...prev.returnLocation, weight: val }
            }));
          }}
          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.returnLocation?.weight ? 'border-red-400' : 'border-gray-300'}`}
          placeholder="Weight (lbs)"
          min="0"
          step="0.01"
        />
        {errors.returnLocation?.weight && <p className="text-red-600 text-xs mt-1">{errors.returnLocation.weight}</p>}
      </div>
      
      {/* Return Date & Time */}
      <div className="col-span-1">
        <div
          onClick={(e) => {
            const input = e.currentTarget.querySelector('input');
            if (input?.showPicker) input.showPicker();
            else input?.focus();
          }}
        >
          <input
            type="datetime-local"
            value={formData.returnLocation?.returnDate || ''}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              returnLocation: { ...prev.returnLocation, returnDate: e.target.value }
            }))}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.returnLocation?.returnDate ? 'border-red-400' : 'border-gray-300'}`}
            placeholder="Return Date & Time *"
          />
        </div>
        {errors.returnLocation?.returnDate && <p className="text-red-600 text-xs mt-1">{errors.returnLocation.returnDate}</p>}
      </div>
    </div>
  </div>
)}

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
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="text-blue-600" size={20} />
                        </div>
                        <div>
                          {formData.docs.url ? (
                            <a href={formData.docs.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-2">
                              {formData.docs.name || 'Attached Document'}
                              {formData.docs.isExisting && <CheckCircle className="text-green-500" size={14} />}
                            </a>
                          ) : (
                            <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                              {formData.docs.name || 'Attached Document'}
                            </p>
                          )}
                          <p className="text-xs text-gray-500">
                            {formData.docs.size ? `${(formData.docs.size / 1024 / 1024).toFixed(2)} MB` : (formData.docs.isExisting ? 'Linked from Load' : 'Unknown Size')}
                          </p>
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

              {/* Selected Load Documents Display */}
              {selectedLoadData?.uploadedFiles && selectedLoadData.uploadedFiles.length > 0 && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 mt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="text-blue-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Selected Load Documents</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedLoadData.uploadedFiles.map((file, index) => (
                      <div key={index} className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="text-blue-600" size={16} />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-800 truncate">{file.fileName || file.name || 'Document'}</div>
                            <div className="text-xs text-gray-500">{file.fileType || 'Unknown Type'}</div>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar size={12} />
                            <span>Uploaded: {file.uploadDate ? new Date(file.uploadDate).toLocaleDateString() : 'N/A'}</span>
                          </div>
                          <div className="flex gap-2">
                            <a
                              href={file.fileUrl || file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 bg-blue-500 text-white text-center py-2 px-3 rounded-lg hover:bg-blue-600 transition text-xs font-medium"
                            >
                              View File
                            </a>
                            <a
                              href={file.fileUrl || file.url}
                              download={file.fileName || 'document'}
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

          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4" onClick={() => setShowOrderModal(false)}>
            <div
              className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              onClick={(e) => e.stopPropagation()}
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
                              <p className="font-medium text-gray-800">{customer?.fsc || 0}%</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Other</p>
                              <p className="font-medium text-gray-800">${
                                Array.isArray(customer?.other) 
                                  ? (customer?.otherTotal || customer?.other.reduce((sum, item) => sum + (item?.total || 0), 0) || 0)
                                  : (customer?.other || 0)
                              }</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-sm text-gray-600">Total Amount</p>
                              <p className="font-bold text-lg text-green-600">${customer?.totalAmount || 0}</p>
                            </div>
                          </div>

                          {/* Other Charges Breakdown */}
                          {Array.isArray(customer?.other) && customer.other.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-green-200">
                              <h5 className="font-semibold text-gray-700 mb-2 text-sm">Other Charges Breakdown</h5>
                              <div className="space-y-2">
                                {customer.other.map((charge, i) => (
                                  <div key={i} className="bg-gray-50 rounded-lg p-2 border border-green-100">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm font-medium text-gray-700">{charge?.name || 'N/A'}</span>
                                      <span className="text-sm font-bold text-green-600">${charge?.total || 0}</span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Quantity: {charge?.quantity || 0} × Amount: ${charge?.amount || 0}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
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
                          <p className="font-semibold text-gray-800">
                            {selectedOrder.carrier?.compName || 
                             selectedOrder.carrier?.carrierName || 
                             selectedOrder.carrier?.name || 
                             'N/A'}
                          </p>
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
                {/* BOL Information (below Carrier Information) */}
                {(() => {
                  const bols = extractBols(selectedOrder || {});
                  return (
                    <div className="bg-blue-50 p-4 rounded-lg mt-4">
                      <h3 className="text-lg font-semibold text-blue-800 mb-2">BOL Information</h3>

                      {bols.length ? (
                        <ul className="list-disc pl-5 text-gray-800">
                          {bols.map((b, i) => (
                            <li key={i} className="break-all">{b}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500">No BOL on file</p>
                      )}
                    </div>
                  );
                })()}

                {/* Company Information */}
                {(selectedOrder?.company || selectedOrder?.addDispature) && (
                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Building className="text-teal-600" size={20} />
                      <h3 className="text-lg font-bold text-gray-800">Company Information</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                          <Building className="text-teal-600" size={16} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Company Name</p>
                          <p className="font-semibold text-gray-800">{selectedOrder.company || selectedOrder.addDispature || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
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
                          <p className="text-sm text-gray-600">Shipment No</p>
                          <p className="font-semibold text-gray-800">
                            {selectedOrder.shipmentNo || 
                             selectedOrder.shipper?.shipmentNo || 
                             'N/A'}
                          </p>
                        </div>
                      </div>



                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <FileText className="text-blue-600" size={16} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Container No</p>
                          <p className="font-semibold text-gray-800">
                            {selectedOrder.containerNo || 
                             selectedOrder.shipper?.containerNo || 
                             'N/A'}
                          </p>
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

                {/* Return Location - Only for DRAYAGE */}
                {selectedOrder?.loadType === 'DRAYAGE' && selectedOrder?.returnLocation && (
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="text-indigo-600" size={20} />
                      <h3 className="text-lg font-bold text-gray-800">Return Location</h3>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-indigo-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Name</p>
                          <p className="font-medium text-gray-800">{selectedOrder.returnLocation?.name || 'N/A'}</p>
                        </div>
                        <div className="col-span-1">
                          <p className="text-sm text-gray-600">Return Full Address</p>
                          <p className="font-medium text-gray-800">{selectedOrder.returnLocation?.returnFullAddress || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">City</p>
                          <p className="font-medium text-gray-800">{selectedOrder.returnLocation?.city || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">State</p>
                          <p className="font-medium text-gray-800">{selectedOrder.returnLocation?.state || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Zip Code</p>
                          <p className="font-medium text-gray-800">{selectedOrder.returnLocation?.zipCode || 'N/A'}</p>
                        </div>
                         <div>
                          <p className="text-sm text-gray-600">Weight</p>
                          <p className="font-medium text-gray-800">{selectedOrder.returnLocation?.weight || 'N/A'}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600">Return Date</p>
                          <p className="font-medium text-gray-800">
                            {selectedOrder.returnLocation?.returnDate
                              ? (() => {
                                  try {
                                    const date = new Date(selectedOrder.returnLocation.returnDate);
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
                                    console.error('Error formatting return date:', error, selectedOrder.returnLocation.returnDate);
                                    return 'Invalid Date';
                                  }
                                })()
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
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

                {/* Assignment Information */}
                {selectedOrder?.assignedToCMT && (
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                        <User className="text-indigo-600" size={16} />
                      </div>
                      <h3 className="text-lg font-bold text-gray-800">Assignment Information</h3>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-indigo-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Assigned To */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-indigo-800 text-sm uppercase tracking-wide">Assigned To</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600 text-sm">Employee ID:</span>
                              <span className="font-medium text-gray-800">{selectedOrder.assignedToCMT?.empId || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 text-sm">Name:</span>
                              <span className="font-medium text-gray-800">{selectedOrder.assignedToCMT?.employeeName || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 text-sm">Department:</span>
                              <span className="font-medium text-gray-800">{selectedOrder.assignedToCMT?.department || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 text-sm">Assigned At:</span>
                              <span className="font-medium text-gray-800">
                                {selectedOrder.assignedToCMT?.assignedAt
                                  ? new Date(selectedOrder.assignedToCMT.assignedAt).toLocaleString()
                                  : 'N/A'
                                }
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Assignment Status */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-indigo-800 text-sm uppercase tracking-wide">Assignment Status</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600 text-sm">Status:</span>
                              <span className="font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full text-xs">
                                {selectedOrder.assignmentStatus || 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 text-sm">DO Status:</span>
                              <span className="font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full text-xs">
                                {selectedOrder.doStatus || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
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
                    <button
                      onClick={() => generateBolPDF(selectedOrder)}
                      className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-3 py-1.5 rounded-md font-medium shadow hover:shadow-md transition-all duration-200 flex items-center justify-center gap-1.5 text-xs"
                    >
                      <FaDownload className="text-white" size={12} />
                      <span>BOL PDF</span>
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
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60]" onClick={closeChargesPopup}>
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-8 w-full max-w-5xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className={`bg-gradient-to-r ${chargesPopupType === 'customer' ? 'from-blue-500 to-blue-600' : 'from-green-500 to-green-600'} -m-8 mb-6 p-6 rounded-t-xl`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {chargesPopupType === 'customer' ? 'Customer Charges Calculator' : 'Carrier Charges Calculator'}
                    </h2>
                    {chargesPopupType === 'customer' && currentCustomerIndex !== null && (
                      <p className="text-white/80 text-sm mt-1">Customer {currentCustomerIndex + 1}</p>
                    )}
                  </div>
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
                      onKeyDown={(e) => {
                        const ctrl = e.ctrlKey || e.metaKey;
                        const allow = ['Backspace', 'Delete', 'Tab', 'Enter', 'Escape', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
                        if (allow.includes(e.key) || (ctrl && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase()))) return;
                        if (e.key.length === 1 && !/[A-Za-z ]/.test(e.key)) e.preventDefault();
                      }}
                      onBlur={() => {
                        setChargeErrors((prev) => {
                          const next = [...prev];
                          const v = (charge.name || '').trim();
                          next[index] = { ...(next[index] || {}) };
                          if (!v) next[index].name = 'Please enter the charge name';
                          else if (!/^[A-Za-z ]+$/.test(v)) next[index].name = 'Name should contain only alphabets';
                          else next[index].name = '';
                          return next;
                        });
                      }}
                      aria-invalid={Boolean(chargeErrors[index]?.name)}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${chargeErrors[index]?.name
                        ? 'border-red-500 bg-red-50 focus:ring-red-200 error-field'
                        : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                        }`}
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
                      onBlur={() => {
                        setChargeErrors((prev) => {
                          const next = [...prev];
                          const raw = String(charge.quantity ?? '');
                          next[index] = { ...(next[index] || {}) };
                          if (raw === '') next[index].quantity = 'Please enter the Quantity';
                          else if (!/^[1-9]\d*$/.test(raw)) next[index].quantity = 'Quantity must be a positive integer';
                          else next[index].quantity = '';
                          return next;
                        });
                      }}
                      aria-invalid={Boolean(chargeErrors[index]?.quantity)}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${chargeErrors[index]?.quantity
                        ? 'border-red-500 bg-red-50 focus:ring-red-200 error-field'
                        : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                        }`}
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
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      onKeyDown={(e) => {
                        // Allow decimal point, but block negative signs and scientific notation
                        if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
                      }}
                      value={charge.amt}
                      onChange={(e) => handleChargeChange(index, 'amt', e.target.value)}
                      onBlur={() => {
                        setChargeErrors((prev) => {
                          const next = [...prev];
                          const raw = String(charge.amt ?? '');
                          next[index] = { ...(next[index] || {}) };
                          if (raw === '') next[index].amt = 'Please enter the amount';
                          else if (!/^\d+(\.\d{1,2})?$/.test(raw)) next[index].amt = 'Amount must be a positive number (max 2 decimal places)';
                          else next[index].amt = '';
                          return next;
                        });
                      }}
                      aria-invalid={Boolean(chargeErrors[index]?.amt)}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${chargeErrors[index]?.amt
                        ? 'border-red-500 bg-red-50 focus:ring-red-200 error-field'
                        : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                        }`}
                      placeholder="0.00"
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
                      className={`px-6 py-3 bg-gradient-to-r ${chargesPopupType === 'customer' ? 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' : 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'} text-white rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105`}
                    >
                      {chargesPopupType === 'customer' ? 'Apply to Customer Charges' : 'Apply to Carrier Fees'}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}


      {/* Delete Order Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex justify-center items-center p-4" onClick={closeDeleteModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] relative" onClick={(e) => e.stopPropagation()}>
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
                  <p className="text-red-600 text-sm mt-2">This action cannot be undone. The delivery order will be permanently deleted.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Deletion *</label>
                    <textarea
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                      rows="4"
                      placeholder="Please provide a reason for deleting this delivery order..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteOrder}
                  disabled={!deleteReason.trim() || submitting}
                  className={`px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold transition-colors ${
                    !deleteReason.trim() || submitting
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:from-red-600 hover:to-red-700'
                  }`}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                      Deleting...
                    </span>
                  ) : (
                    'Delete Delivery Order'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Order Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex justify-center items-center p-4" onClick={closeDeleteModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] relative" onClick={(e) => e.stopPropagation()}>
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
                  <p className="text-red-600 text-sm mt-2">This action cannot be undone. The delivery order will be permanently deleted.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Deletion *</label>
                    <textarea
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                      rows="4"
                      placeholder="Please provide a reason for deleting this delivery order..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteOrder}
                  disabled={!deleteReason.trim() || submitting}
                  className={`px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold transition-colors ${
                    !deleteReason.trim() || submitting
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:from-red-600 hover:to-red-700'
                  }`}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                      Deleting...
                    </span>
                  ) : (
                    'Delete Delivery Order'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Order Modal */}
      {showAssignModal && orderToAssign && (
        <div className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex justify-center items-center p-4" onClick={() => { setShowAssignModal(false); setOrderToAssign(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] relative" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Assign Delivery Order</h2>
                    <p className="text-blue-100">Assign to dispatcher</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setOrderToAssign(null);
                  }}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Dispatcher *</label>
                {dispatchers.length > 0 ? (
                  <SearchableDropdown
                    value={orderToAssign?.assignedDispatcherId || ''}
                    onChange={(value) => {
                      setOrderToAssign(prev => ({ ...prev, assignedDispatcherId: value }));
                    }}
                    options={dispatchers
                      .filter(d => (d.status || '').toLowerCase() === 'active')
                      .sort((a, b) => (a.aliasName || a.employeeName || '').localeCompare(b.aliasName || b.employeeName || ''))
                      .map(d => ({ 
                        value: d._id, 
                        label: `${d.aliasName || d.employeeName}${d.empId ? ` (${d.empId})` : ''}` 
                      }))}
                    placeholder="Select Dispatcher"
                    searchPlaceholder="Search dispatchers..."
                  />
                ) : (
                  <p className="text-sm text-gray-500">Loading dispatchers...</p>
                )}
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setOrderToAssign(null);
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignOrder}
                  disabled={!orderToAssign?.assignedDispatcherId || assigningOrder}
                  className={`px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold transition-colors ${
                    !orderToAssign?.assignedDispatcherId || assigningOrder
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:from-blue-600 hover:to-blue-700'
                  }`}
                >
                  {assigningOrder ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                      Assigning...
                    </span>
                  ) : (
                    'Assign Order'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
