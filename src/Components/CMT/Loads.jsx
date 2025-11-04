import React, { useEffect, useState } from 'react';

import axios from 'axios';

import { FaArrowLeft, FaDownload } from 'react-icons/fa';

import { User, Mail, Phone, Building, FileText, CheckCircle, XCircle, Clock, PlusCircle, MapPin, Truck, Calendar, DollarSign, Search, Plus, Copy, Trash2 } from 'lucide-react';

import API_CONFIG from '../../config/api.js';

import alertify from 'alertifyjs';

import 'alertifyjs/build/css/alertify.css';



export default function Loads() {

  const [loads, setLoads] = useState([]);

  const [viewDoc, setViewDoc] = useState(false);

  const [previewImg, setPreviewImg] = useState(null);

  const [modalType, setModalType] = useState(null);

  const [selectedLoad, setSelectedLoad] = useState(null);

  const [creatingDrayage, setCreatingDrayage] = useState(false);

  const [reason, setReason] = useState('');

  const [showAddLoadForm, setShowAddLoadForm] = useState(false);

  const [loading, setLoading] = useState(true);

  const [showLoadModal, setShowLoadModal] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // ✅ NEW STATES

  const [showLoadCreationModal, setShowLoadCreationModal] = useState(false);

  const [loadType, setLoadType] = useState("OTR");

  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL', 'OTR', 'DRAYAGE'

  const [shippers, setShippers] = useState([]);

  // New states for View, Edit, Delete modals

  const [showViewModal, setShowViewModal] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedLoadForAction, setSelectedLoadForAction] = useState(null);

  const [isDuplicating, setIsDuplicating] = useState(false);

  // CMT Assignment state

  const [cmtAssignment, setCmtAssignment] = useState(null);

  const [loadingCmtAssignment, setLoadingCmtAssignment] = useState(false);

  const [autoAcceptTimer, setAutoAcceptTimer] = useState(null);

  const [timeRemaining, setTimeRemaining] = useState(30);

  // ZIP → options + UI state (NEW)

  const [fromZipOptions, setFromZipOptions] = useState([]);

  const [toZipOptions, setToZipOptions] = useState([]);

  const [returnZipOptions, setReturnZipOptions] = useState([]);

  const [fromZipQuery, setFromZipQuery] = useState("");

  const [toZipQuery, setToZipQuery] = useState("");

  const [returnZipQuery, setReturnZipQuery] = useState("");

  const [showFromZipDD, setShowFromZipDD] = useState(false);

  const [showToZipDD, setShowToZipDD] = useState(false);

  const [showReturnZipDD, setShowReturnZipDD] = useState(false);

  

  // Material UI style shipper dropdown state

  const [shipperInputValue, setShipperInputValue] = useState("");

  const [shipperDropdownOpen, setShipperDropdownOpen] = useState(false);

  const [shipperSearchQuery, setShipperSearchQuery] = useState("");



  // Vehicle Type dropdown state

  const [vehicleTypeDropdownOpen, setVehicleTypeDropdownOpen] = useState(false);

  const [vehicleTypeSearchQuery, setVehicleTypeSearchQuery] = useState("");



  // Multiple locations state for OTR

  const [pickupLocations, setPickupLocations] = useState([]);

  const [deliveryLocations, setDeliveryLocations] = useState([]);

  

  // ZIP code options for multiple locations

  const [pickupZipOptions, setPickupZipOptions] = useState({});

  const [deliveryZipOptions, setDeliveryZipOptions] = useState({});

  const [pickupZipQueries, setPickupZipQueries] = useState({});

  const [deliveryZipQueries, setDeliveryZipQueries] = useState({});

  const [showPickupZipDD, setShowPickupZipDD] = useState({});

  const [showDeliveryZipDD, setShowDeliveryZipDD] = useState({});



  // Charges Calculator state

  const [showChargesCalculator, setShowChargesCalculator] = useState(false);

  const [charges, setCharges] = useState([{ id: Date.now(), name: '', quantity: 0, amount: 0.00 }]);



  // Vehicle Type options - Dynamic based on load type

  const getVehicleTypeOptions = (type) => {

    if (type === "DRAYAGE") {

      return [

        "20' Standard",

        "40' Standard",

        "45' Standard",

        "20' Reefer",

        "40' Reefer",

        "Open Top Container",

        "Flat Rack Container",

        "Tank Container",

        "40' High Cube",

        "45' High Cube"

      ];

    } else { // OTR

      return [

        "Dry Van",

        "Reefer",

        "Step Deck",

        "Double Drop / Lowboy",

        "Conestoga",

        "Livestock Trailer",

        "Car Hauler",

        "Container Chassis",

        "End Dump",

        "Side Dump",

        "Hopper Bottom"

      ];

    }

  };



  const vehicleTypeOptions = getVehicleTypeOptions(loadType);



  // === Validation helpers & state (ADD) ===

  const ALNUM = /^[A-Za-z0-9]+$/;

  const MONEY2 = /^(?:\d+)(?:\.\d{1,2})?$/; // up to 2 decimals, no negatives



  const todayStr = () => new Date().toISOString().slice(0, 10);

  

  // Format date for input fields (YYYY-MM-DD format)

  const formatDateForInput = (dateString) => {

    if (!dateString) return '';

    try {

      // Handle ISO format with timezone offset like "2025-10-15T00:00:00.000+00:00"

      let date;

      if (typeof dateString === 'string' && dateString.includes('T')) {

        // For ISO strings, create date directly

        date = new Date(dateString);

      } else {

        // For other formats, try parsing

        date = new Date(dateString);

      }

      

      if (isNaN(date.getTime())) {

        console.warn('Invalid date format:', dateString);

        return '';

      }

      

      // Return in YYYY-MM-DD format

      return date.toISOString().split('T')[0];

    } catch (error) {

      console.error('Error formatting date:', error, 'Input:', dateString);

      return '';

    }

  };

  

  // Format date-time for input fields (YYYY-MM-DDTHH:MM for datetime-local)

  const formatDateTimeForInput = (dateString) => {

    if (!dateString) return '';

    try {

      const date = new Date(dateString);

      if (isNaN(date.getTime())) return '';

      const yyyy = String(date.getFullYear());

      const mm = String(date.getMonth() + 1).padStart(2, '0');

      const dd = String(date.getDate()).padStart(2, '0');

      const hh = String(date.getHours()).padStart(2, '0');

      const mi = String(date.getMinutes()).padStart(2, '0');

      return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;

    } catch (_) {

      return '';

    }

  };

  

  const addDays = (dateStr, n) => {

    if (!dateStr) return '';

    const d = new Date(dateStr);

    d.setDate(d.getDate() + n);

    return d.toISOString().slice(0, 10);

  };



  const [creatingLoad, setCreatingLoad] = useState(false);

  const [formErrors, setFormErrors] = useState({});



  const fieldRefs = React.useRef({});

  const scrollToField = (name) => {

    const el = fieldRefs.current[name];

    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    try { el.focus({ preventScroll: true }); } catch { }

    el.classList.add('ring-2', 'ring-red-300');

    setTimeout(() => el.classList.remove('ring-2', 'ring-red-300'), 900);

  };



  // format to keep only digits and a single dot, and max 2 decimals 

  // format to keep only digits and a single dot, allow trailing dot, and max 2 decimals

  const sanitizeMoney2 = (v) => {

    if (v == null) return '';

    v = String(v);



    // Keep only digits and dots

    v = v.replace(/[^\d.]/g, '');



    // Keep only the first dot, remove the rest

    const firstDot = v.indexOf('.');

    if (firstDot !== -1) {

      v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');

    }



    const endsWithDot = v.endsWith('.');

    let [intP = '', decP = ''] = v.split('.');



    // Remove leading zeros but keep single 0 if needed

    intP = intP.replace(/^0+(?=\d)/, '');



    // If user typed only ".", show "0."

    if (v === '.') return '0.';



    // If there is a dot and user hasn't typed decimals yet, keep the dot visible

    if (endsWithDot) return (intP || '0') + '.';



    // If there is a dot with decimals, cap to 2 decimals

    if (firstDot !== -1) {

      decP = decP.slice(0, 2);

      return (intP || '0') + (decP ? '.' + decP : '');

    }



    // No dot case

    return intP;

  };



  // Show date-time as DD-MM-YYYY HH:mm

  const formatDateTimeDisplay = (val) => {

    if (!val) return 'N/A';

    const d = new Date(val);

    if (isNaN(d.getTime())) return 'N/A';

    const dd = String(d.getDate()).padStart(2, '0');

    const mm = String(d.getMonth() + 1).padStart(2, '0');

    const yyyy = String(d.getFullYear());

    const hh = String(d.getHours()).padStart(2, '0');

    const mi = String(d.getMinutes()).padStart(2, '0');

    return `${dd}-${mm}-${yyyy} ${hh}:${mi}`;

  };

  // Make full date field clickable

  const openDatePicker = (refName) => {

    const el = fieldRefs.current[refName];

    if (el && typeof el.showPicker === 'function') {

      el.showPicker();

    } else if (el) {

      el.focus();

      el.click();

    }

  };



  // 👇 Default/blank values for the Create Load form

  const INITIAL_LOAD_FORM = {

    shipperId: "",

    fromZip: "",       // NEW

    fromAddress: "",

    fromCity: "",

    fromState: "",

    toZip: "",         // NEW

    toAddress: "",

    toCity: "",

    toState: "",

    vehicleType: "",

    lineHaul: "",

    fsc: "",

    other: "",

    rateType: "Flat Rate",

    pickupDate: "",

    deliveryDate: "",

    bidDeadline: "",

    weight: "",

    commodity: "",

    containerNo: "",

    poNumber: "",

    bolNumber: "",

    // DRAYAGE-only:

    returnDate: "",

    returnZip: "",

    returnAddress: "",

    returnCity: "",

    returnState: "",

  };

  // === ZIP helpers (NEW) ===

  const ZIP5 = /^\d{5}$/;



  // simple debounce util (NEW)

  let zipTimers = {};

  const debounceZip = (key, fn, delay = 400) => {

    clearTimeout(zipTimers[key]);

    zipTimers[key] = setTimeout(fn, delay);

  };



  // SELECT handler (NEW)

  const applyZipSelection = (which, item) => {

    setLoadForm(prev => ({

      ...prev,

      [`${which}City`]: item.city || prev[`${which}City`] || "",

      [`${which}State`]: item.stateCode || item.state || prev[`${which}State`] || "",

    }));

    setFormErrors(p => {

      const n = { ...p };

      delete n[`${which}City`];

      delete n[`${which}State`];

      return n;

    });

    if (which === 'from') {

      setShowFromZipDD(false);

    } else if (which === 'to') {

      setShowToZipDD(false);

    } else if (which === 'return') {

      setShowReturnZipDD(false);

    }

  };



  // Material UI shipper selection handler

  const handleShipperSelect = (shipper) => {

    setLoadForm(prev => ({

      ...prev,

      shipperId: shipper._id,

    }));

    setFormErrors(p => {

      const n = { ...p };

      delete n.shipperId;

      return n;

    });

    setShipperInputValue(shipper.compName);

    setShipperSearchQuery("");

    setShipperDropdownOpen(false);

  };



  // Vehicle Type selection handler

  const handleVehicleTypeSelect = (vehicleType) => {

    setLoadForm(prev => ({

      ...prev,

      vehicleType: vehicleType,

    }));

    setFormErrors(p => {

      const n = { ...p };

      delete n.vehicleType;

      return n;

    });

  };



  // Multiple locations handlers for OTR

  const addPickupLocation = () => {

    setPickupLocations(prev => [...prev, {

      id: Date.now(),

      zip: '',

      address: '',

      city: '',

      state: '',

      weight: '',

      commodity: '',

      pickupDate: '',

      deliveryDate: ''

    }]);

  };



  const removePickupLocation = (id) => {

    setPickupLocations(prev => prev.filter(loc => loc.id !== id));

  };



  const updatePickupLocation = (id, field, value) => {

    setPickupLocations(prev => prev.map(loc => 

      loc.id === id ? { ...loc, [field]: value } : loc

    ));

  };



  const addDeliveryLocation = () => {

    setDeliveryLocations(prev => [...prev, {

      id: Date.now(),

      zip: '',

      address: '',

      city: '',

      state: '',

      weight: '',

      commodity: '',

      deliveryDate: ''

    }]);

  };



  const removeDeliveryLocation = (id) => {

    setDeliveryLocations(prev => prev.filter(loc => loc.id !== id));

  };



  const updateDeliveryLocation = (id, field, value) => {

    setDeliveryLocations(prev => prev.map(loc => 

      loc.id === id ? { ...loc, [field]: value } : loc

    ));

  };



  // ZIP code functionality for multiple locations

  const fetchZipForLocation = async (zip, locationId, type) => {

    try {

      if (!ZIP5.test(zip)) return;

      const token = sessionStorage.getItem("token") || localStorage.getItem("token");



      const res = await axios.get(

        `${API_CONFIG.BASE_URL}/api/v1/load/zipcode/${zip}/samples`,

        { headers: token ? { Authorization: `Bearer ${token}` } : {} }

      );



      const samples = Array.isArray(res?.data?.data?.sampleAddresses)

        ? res.data.data.sampleAddresses : [];



      if (type === 'pickup') {

        setPickupZipOptions(prev => ({ ...prev, [locationId]: samples }));

        setShowPickupZipDD(prev => ({ ...prev, [locationId]: true }));

      } else {

        setDeliveryZipOptions(prev => ({ ...prev, [locationId]: samples }));

        setShowDeliveryZipDD(prev => ({ ...prev, [locationId]: true }));

      }



      // Auto-fill with first match if available

      if (samples[0]) {

        applyZipToLocation(locationId, samples[0], type);

      }



    } catch (e) {

      console.warn("ZIP lookup failed:", e?.response?.data || e.message);

      if (type === 'pickup') {

        setShowPickupZipDD(prev => ({ ...prev, [locationId]: false }));

      } else {

        setShowDeliveryZipDD(prev => ({ ...prev, [locationId]: false }));

      }

    }

  };



  const applyZipToLocation = (locationId, item, type) => {

    const city = item.city || "";

    const state = item.stateCode || item.state || "";



    if (type === 'pickup') {

      setPickupLocations(prev => prev.map(loc => 

        loc.id === locationId ? {

          ...loc,

          city: city || loc.city,

          state: state || loc.state

        } : loc

      ));

      setShowPickupZipDD(prev => ({ ...prev, [locationId]: false }));

    } else {

      setDeliveryLocations(prev => prev.map(loc => 

        loc.id === locationId ? {

          ...loc,

          city: city || loc.city,

          state: state || loc.state

        } : loc

      ));

      setShowDeliveryZipDD(prev => ({ ...prev, [locationId]: false }));

    }

  };



  const handleLocationAddressChange = (locationId, value, type) => {

    // Update only the full address field

    if (type === 'pickup') {

      updatePickupLocation(locationId, 'address', value);

    } else {

      updateDeliveryLocation(locationId, 'address', value);

    }

  };



  const handleLocationZipChange = (locationId, value, type) => {

    // Update zip field and trigger lookup when 5-digit numeric

    if (type === 'pickup') {

      updatePickupLocation(locationId, 'zip', value);

    } else {

      updateDeliveryLocation(locationId, 'zip', value);

    }



    if (/^\d{1,5}$/.test(value)) {

      debounceZip(`location-${locationId}`, () => fetchZipForLocation(value, locationId, type), 450);

    }

  };



  // API call (UPDATED to set options)

  const fetchCityStateByZip = async (zip, which /* 'from' | 'to' */) => {

    try {

      if (!ZIP5.test(zip)) return;

      const token = sessionStorage.getItem("token") || localStorage.getItem("token");



      const res = await axios.get(

        `${API_CONFIG.BASE_URL}/api/v1/load/zipcode/${zip}/samples`,

        { headers: token ? { Authorization: `Bearer ${token}` } : {} }

      );



      const samples = Array.isArray(res?.data?.data?.sampleAddresses)

        ? res.data.data.sampleAddresses : [];



      // show dropdown & store options

      if (which === 'from') {

        setFromZipOptions(samples);

        setShowFromZipDD(true);

      } else if (which === 'to') {

        setToZipOptions(samples);

        setShowToZipDD(true);

      } else if (which === 'return') {

        setReturnZipOptions(samples);

        setShowReturnZipDD(true);

      }



      // also pre-fill with first match (optional)

      if (samples[0]) applyZipSelection(which, samples[0]);



    } catch (e) {

      console.warn("ZIP lookup failed:", e?.response?.data || e.message);

      if (which === 'from') setShowFromZipDD(false);

      else if (which === 'to') setShowToZipDD(false);

      else if (which === 'return') setShowReturnZipDD(false);

    }

  };

// SearchableZipDropdown (NEW)

const SearchableZipDropdown = ({

  which,           // 'from' | 'to'

  open,

  setOpen,

  options,

  query, setQuery,

  onSelect

}) => {

  const filtered = (options || []).filter(o => {

    const text = [

      o.formattedAddress,

      o.addressLine1, o.addressLine2,

      o.city, o.state, o.stateCode, o.placeType

    ].filter(Boolean).join(" ").toLowerCase();

    return text.includes(query.toLowerCase());

  });



  return open ? (

    <div

      className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl"

      onMouseDown={(e) => e.preventDefault()} // keep focus inside

    >

      <div className="p-2 border-b">

        <input

          value={query}

          onChange={(e) => setQuery(e.target.value)}

          placeholder="Search address, place, city..."

          className="w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500"

        />

      </div>



      <ul className="max-h-56 overflow-auto divide-y">

        {filtered.length === 0 && (

          <li className="p-3 text-sm text-gray-500">No results</li>

        )}

        {filtered.map((item, idx) => (

          <li

            key={idx}

            className="p-3 text-sm hover:bg-blue-50 cursor-pointer"

            onClick={() => onSelect(which, item)}

          >

            <div className="font-medium text-gray-800">

              {item.formattedAddress || `${item.addressLine1 || ''}${item.city ? ', ' + item.city : ''}${item.stateCode ? ', ' + item.stateCode : ''}`}

            </div>

            <div className="text-xs text-gray-500">

              {(item.placeType || 'place')}{item.city ? ` • ${item.city}` : ''}{item.stateCode ? `, ${item.stateCode}` : ''}

            </div>

          </li>

        ))}

      </ul>

    </div>

  ) : null;

};



// Vehicle Type Searchable Dropdown

const VehicleTypeDropdown = ({

  open,

  setOpen,

  options,

  searchQuery,

  setSearchQuery,

  onSelect,

  inputValue,

  setInputValue

}) => {

  const filteredOptions = (options || []).filter(option => {

    const searchText = option.toLowerCase();

    return searchText.includes(searchQuery.toLowerCase());

  });



  const handleSelect = (option) => {

    setInputValue(option);

    onSelect(option);

    setSearchQuery("");

    setOpen(false);

  };



  const handleInputChange = (e) => {

    const value = e.target.value;

    setInputValue(value);

    setSearchQuery(value);

    setOpen(true);

  };



  const handleInputFocus = () => {

    setOpen(true);

  };



  const handleInputBlur = () => {

    // Delay closing to allow click on dropdown items

    setTimeout(() => setOpen(false), 200);

  };



  return (

    <div className="relative">

      <input

        type="text"

        value={inputValue}

        onChange={handleInputChange}

        onFocus={handleInputFocus}

        onBlur={handleInputBlur}

        placeholder="Search container types..."

        className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 border-gray-200 hover:border-gray-300"

      />

      

      {open && (

        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-hidden">

          <div className="p-2 border-b bg-gray-50">

            <div className="relative">

              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />

              <input

                type="text"

                value={searchQuery}

                onChange={(e) => setSearchQuery(e.target.value)}

                placeholder="Search container types..."

                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"

                autoFocus

              />

            </div>

          </div>

          

          <div className="max-h-48 overflow-y-auto">

            {filteredOptions.length === 0 ? (

              <div className="p-4 text-center text-gray-500 text-sm">

                {searchQuery ? "No container types found" : "Start typing to search container types"}

              </div>

            ) : (

              filteredOptions.map((option, index) => (

                <div

                  key={index}

                  className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150"

                  onClick={() => handleSelect(option)}

                  onMouseDown={(e) => e.preventDefault()} // Prevent input blur

                >

                  <div className="font-medium text-gray-800 text-sm">

                    {option}

                  </div>

                </div>

              ))

            )}

          </div>

        </div>

      )}

    </div>

  );

};



// Material UI Style SearchableShipperDropdown

const MaterialShipperDropdown = ({

  open,

  setOpen,

  options,

  searchQuery,

  setSearchQuery,

  onSelect,

  inputValue,

  setInputValue

}) => {

  const filteredShippers = (options || []).filter(shipper => {

    const searchText = [

      shipper.compName,

      shipper.email,

      shipper.contactPerson,

      shipper.phone

    ].filter(Boolean).join(" ").toLowerCase();

    return searchText.includes(searchQuery.toLowerCase());

  });



  const handleShipperSelect = (shipper) => {

    setInputValue(shipper.compName);

    onSelect(shipper);

    setSearchQuery("");

    setOpen(false);

  };



  const handleInputChange = (e) => {

    const value = e.target.value;

    setInputValue(value);

    setSearchQuery(value);

    setOpen(true);

  };



  const handleInputFocus = () => {

    setOpen(true);

  };



  const handleInputBlur = () => {

    // Delay closing to allow click on dropdown items

    setTimeout(() => setOpen(false), 200);

  };



  return (

    <div className="relative">

      <input

        type="text"

        value={inputValue}

        onChange={handleInputChange}

        onFocus={handleInputFocus}

        onBlur={handleInputBlur}

        placeholder="Search shipper by name or email..."

        className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 border-gray-200 hover:border-gray-300"

      />

      

      {open && (

        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-hidden">

          <div className="p-2 border-b bg-gray-50">

            <input

              type="text"

              value={searchQuery}

              onChange={(e) => setSearchQuery(e.target.value)}

              placeholder="Type to search..."

              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"

              autoFocus

            />

          </div>

          

          <div className="max-h-48 overflow-y-auto">

            {filteredShippers.length === 0 ? (

              <div className="p-4 text-center text-gray-500 text-sm">

                {searchQuery ? "No shippers found" : "Start typing to search shippers"}

              </div>

            ) : (

              filteredShippers.map((shipper) => (

                <div

                  key={shipper._id}

                  className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150"

                  onClick={() => handleShipperSelect(shipper)}

                  onMouseDown={(e) => e.preventDefault()} // Prevent input blur

                >

                  <div className="flex items-start justify-between">

                    <div className="flex-1">

                      <div className="font-medium text-gray-800 text-sm">

                        {shipper.compName}

                      </div>

                      <div className="text-xs text-gray-500 mt-1">

                        {shipper.email}

                      </div>

                      {(shipper.contactPerson || shipper.phone) && (

                        <div className="text-xs text-gray-400 mt-1">

                          {shipper.contactPerson && `Contact: ${shipper.contactPerson}`}

                          {shipper.contactPerson && shipper.phone && " • "}

                          {shipper.phone && `Phone: ${shipper.phone}`}

                        </div>

                      )}

                    </div>

                    <div className="ml-2">

                      <div className="w-2 h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>

                    </div>

                  </div>

                </div>

              ))

            )}

          </div>

        </div>

      )}

    </div>

  );

};







  // 👇 Replace your current `useState({ ... })` for loadForm with this:

  const [loadForm, setLoadForm] = useState(INITIAL_LOAD_FORM);



  // 👇 One-click helper to clear the form & errors and set defaults

  const resetLoadForm = () => {

    setLoadForm(INITIAL_LOAD_FORM);

    setFormErrors({});

    setLoadType("OTR");

    setCreatingLoad(false);

    setCreatingDrayage(false);

    // Reset shipper Material UI state

    setShipperInputValue("");

    setShipperDropdownOpen(false);

    setShipperSearchQuery("");

    // Reset vehicle type state

    setVehicleTypeDropdownOpen(false);

    setVehicleTypeSearchQuery("");

    // Reset multiple locations state with defaults

    setPickupLocations([{

      id: Date.now(),

      zip: '',

      address: '',

      city: '',

      state: '',

      weight: '',

      commodity: '',

      pickupDate: '',

      deliveryDate: ''

    }]);

    setDeliveryLocations([{

      id: Date.now() + 1,

      zip: '',

      address: '',

      city: '',

      state: '',

      weight: '',

      commodity: '',

      deliveryDate: ''

    }]);

    // Reset ZIP code states

    setPickupZipOptions({});

    setDeliveryZipOptions({});

    setPickupZipQueries({});

    setDeliveryZipQueries({});

    setShowPickupZipDD({});

    setShowDeliveryZipDD({});

    // Reset charges calculator

    setCharges([{ id: Date.now(), name: '', quantity: 0, amount: 0.00 }]);

  };





  // ✅ Handle Change with sanitization

  const handleChange = (e) => {

    const { name } = e.target;

    let { value } = e.target;



    // ZIP fields: handle both ZIP code input and complete address display

    if (name === 'fromZip' || name === 'toZip' || name === 'returnZip') {

      const which = name === 'fromZip' ? 'from' : (name === 'toZip' ? 'to' : 'return');

      

      // If user is typing digits only (ZIP code), trigger search

      if (/^\d+$/.test(value) && value.length <= 5) {

        if (which === 'from') setFromZipQuery("");

        else if (which === 'to') setToZipQuery("");

        else setReturnZipQuery("");

        debounceZip(name, () => fetchCityStateByZip(value, which), 450);

      }

      // If user is typing a complete address or clearing the field, just update the value

      // This allows the complete address to be displayed after selection

    }





    // Numeric fields with up to 2 decimals (no negatives)

    if (name === 'lineHaul' || name === 'fsc' || name === 'other') {

      value = sanitizeMoney2(value);

    }



    // Numeric fields for weight

    if (name === 'weight') {

      value = value.replace(/[^\d]/g, '');

    }



    // Alphanumeric only for these

    if (['containerNo', 'poNumber', 'bolNumber'].includes(name)) {

      value = value.replace(/[^A-Za-z0-9]/g, '');

    }



    // Simple trim for strings

    if (['fromCity', 'fromState', 'toCity', 'toState', 'vehicleType', 'rateType', 'returnAddress', 'returnCity', 'returnState', 'commodity'].includes(name)) {

      value = value.replace(/\s{2,}/g, ' ');

    }



    if (name === 'returnZip') {

      value = value.replace(/[^\d]/g, '').slice(0, 5);

    }



    setLoadForm((prev) => ({ ...prev, [name]: value }));

    if (formErrors[name]) setFormErrors((p) => { const n = { ...p }; delete n[name]; return n; });

  };



  // Charges Calculator handlers

  const calculateChargesTotal = () => {

    const total = charges.reduce((sum, charge) => {

      const quantity = parseFloat(charge.quantity) || 0;

      const amount = parseFloat(charge.amount) || 0;

      return sum + (quantity * amount);

    }, 0);

    return total.toFixed(2);

  };



  const handleChargeChange = (id, field, value) => {

    setCharges(prev => prev.map(charge => {

      if (charge.id === id) {

        if (field === 'quantity' || field === 'amount') {

          // Allow numeric values with decimals

          value = value.replace(/[^\d.]/g, '');

          // Ensure only one decimal point

          const parts = value.split('.');

          if (parts.length > 2) {

            value = parts[0] + '.' + parts.slice(1).join('');

          }

          // Limit to 2 decimal places

          if (parts.length === 2 && parts[1].length > 2) {

            value = parts[0] + '.' + parts[1].substring(0, 2);

          }

        }

        return { ...charge, [field]: value };

      }

      return charge;

    }));

  };



  const addNewCharge = () => {

    setCharges(prev => [...prev, { id: Date.now(), name: '', quantity: 0, amount: 0.00 }]);

  };



  const deleteCharge = (id) => {

    if (charges.length > 1) {

      setCharges(prev => prev.filter(charge => charge.id !== id));

    }

  };



  const handleApplyCharges = () => {

    const total = calculateChargesTotal();

    setLoadForm(prev => ({ ...prev, other: total }));

    setShowChargesCalculator(false);

  };



  // Get charges array for API payload (filter out empty charges)

  const getChargesForPayload = () => {

    return charges

      .filter(charge => charge.name.trim() || charge.quantity || charge.amount)

      .map(charge => {

        const quantity = parseFloat(charge.quantity) || 0;

        const amount = parseFloat(charge.amount) || 0;

        const total = quantity * amount;

        return {

          name: charge.name.trim(),

          quantity: quantity,

          amount: amount,

          total: total

        };

      });

  };



  const handleCancelCharges = () => {

    setShowChargesCalculator(false);

  };



  // ✅ Per-field validators with EXACT messages

  const validators = {

    shipperId: (v) => v ? '' : 'Please select the shipper',

    fromZip: (v) => v ? '' : 'Please enter the ZIP code.',

    fromAddress: (v) => v ? '' : 'Please enter/select the full address.',

    fromCity: (v) => v ? '' : 'Please enter  the From City name.',

    fromState: (v) => v ? '' : 'Please enter  the From State name.',

    toZip: (v) => v ? '' : 'Please enter the ZIP code.',

    toAddress: (v) => v ? '' : 'Please enter/select the full address.',

    toCity: (v) => v ? '' : 'Please enter  the To City name.',

    toState: (v) => v ? '' : 'Please enter  the To State name.',



    vehicleType: (v) => v ? '' : 'Please enter the Vehicle Type.',

    lineHaul: (v) => {

      if (v && !MONEY2.test(v)) return 'It should accept only numeric values. After decimal only two digits are accepted.';

      return '';

    },

    fsc: (v) => {

      if (v && !MONEY2.test(v)) return 'It should accept only numeric values. After decimal only two digits are accepted.';

      return '';

    },

    other: (v) => {

      if (v && !MONEY2.test(v)) return 'It should accept only numeric values. After decimal only two digits are accepted.';

      return '';

    },



    rateType: (v, all) => (loadType !== 'DRAYAGE' ? (v ? '' : '') : ''), // Only validate for OTR loads

    pickupDate: (v) => v ? '' : 'Please select the Pickup Date .',

    deliveryDate: (v, all) => {

      if (!v) return 'Please select the Delivery Date .';

      // must be >= pickupDate and >= now

      const nowMs = Date.now();

      const vMs = Date.parse(v);

      if (Number.isFinite(vMs)) {

        if (all.pickupDate) {

          const pMs = Date.parse(all.pickupDate);

          if (Number.isFinite(pMs) && vMs < pMs) return 'Delivery date should be greater than or equal to Pickup Date.';

        }

        if (vMs < nowMs) return 'The calendar shows only present and future dates only.';

      }

      return '';

    },

    bidDeadline: (v) => v ? '' : 'Please select the Bid Deadline .',

    weight: (v) => v ? '' : 'Please enter the weight.',

    commodity: (v) => v ? '' : 'Please enter the commodity.',

    containerNo: (v) => (v && !ALNUM.test(v)) ? 'It should accept only alpha numeric.' : '',

    poNumber: (v) => (v && !ALNUM.test(v)) ? 'It should accept only alpha numeric.' : '',

    bolNumber: (v) => (v && !ALNUM.test(v)) ? 'It should accept only alpha numeric.' : '',

    // DRAYAGE-only mandatory

    returnDate: (v, all) => (loadType === 'DRAYAGE' ? (v ? '' : 'Please select the Return Date.') : ''),

    returnZip: (v, all) => (loadType === 'DRAYAGE' ? (v ? '' : 'Please enter the Return ZIP code.') : ''),

    returnAddress: (v, all) => (loadType === 'DRAYAGE' ? (v ? '' : 'Please enter/select the Return Address.') : ''),

    returnCity: (v, all) => (loadType === 'DRAYAGE' ? (v ? '' : 'Please enter the Return City.') : ''),

    returnState: (v, all) => (loadType === 'DRAYAGE' ? (v ? '' : 'Please enter the Return State.') : ''),

  };



  // field order for scroll-to-first-invalid - Load type specific

  const getFieldOrder = () => {

    if (loadType === 'OTR') {

      return [

        'shipperId',

        'vehicleType', 'lineHaul', 'fsc', 'other', ...(loadType !== 'DRAYAGE' ? ['rateType'] : []),

        'bidDeadline',

        'poNumber', 'bolNumber'

      ];

    } else if (loadType === 'DRAYAGE') {

      return [

        'shipperId',

        'fromZip', 'fromAddress', 'fromCity', 'fromState',

        'toZip', 'toAddress', 'toCity', 'toState',

        'vehicleType', 'lineHaul', 'fsc', 'other', ...(loadType !== 'DRAYAGE' ? ['rateType'] : []),

        'pickupDate', 'deliveryDate', 'bidDeadline',

        'weight', 'commodity',

        'containerNo', 'poNumber', 'bolNumber',

        'returnDate', 'returnZip', 'returnAddress', 'returnCity', 'returnState'

      ];

    }

    return [];

  };









  // ✅ Validate all

  const validateAll = () => {

    const errs = {};

    const fieldOrder = getFieldOrder();

    console.log(`🔍 Validating fields for ${loadType} load:`, fieldOrder);

    

    fieldOrder.forEach((name) => {

      const v = loadForm[name] ?? '';

      const m = validators[name] ? validators[name](v, loadForm) : '';

      if (m) {

        errs[name] = m;

        console.log(`❌ Validation failed for ${name}:`, m);

      }

    });



    // Additional validation for OTR loads - check pickup and delivery locations

    if (loadType === 'OTR') {

      if (pickupLocations.length === 0) {

        errs.pickupLocations = 'Please add at least one pickup location.';

        console.log(`❌ Validation failed for pickupLocations: Please add at least one pickup location.`);

      } else {

        // Validate each pickup location

        pickupLocations.forEach((location, index) => {

          if (!location.address) {

            errs[`pickupLocation${index}_address`] = `Pickup location ${index + 1} address is required.`;

          }

          if (!location.city) {

            errs[`pickupLocation${index}_city`] = `Pickup location ${index + 1} city is required.`;

          }

          if (!location.state) {

            errs[`pickupLocation${index}_state`] = `Pickup location ${index + 1} state is required.`;

          }

          if (!location.weight) {

            errs[`pickupLocation${index}_weight`] = `Pickup location ${index + 1} weight is required.`;

          }

          if (!location.commodity) {

            errs[`pickupLocation${index}_commodity`] = `Pickup location ${index + 1} commodity is required.`;

          }

          if (!location.pickupDate) {

            errs[`pickupLocation${index}_pickupDate`] = `Pickup location ${index + 1} pickup date is required.`;

          }

          if (!location.deliveryDate) {

            errs[`pickupLocation${index}_deliveryDate`] = `Pickup location ${index + 1} delivery date is required.`;

          }

        });

      }



      if (deliveryLocations.length === 0) {

        errs.deliveryLocations = 'Please add at least one delivery location.';

        console.log(`❌ Validation failed for deliveryLocations: Please add at least one delivery location.`);

      } else {

        // Validate each delivery location

        deliveryLocations.forEach((location, index) => {

          if (!location.address) {

            errs[`deliveryLocation${index}_address`] = `Delivery location ${index + 1} address is required.`;

          }

          if (!location.city) {

            errs[`deliveryLocation${index}_city`] = `Delivery location ${index + 1} city is required.`;

          }

          if (!location.state) {

            errs[`deliveryLocation${index}_state`] = `Delivery location ${index + 1} state is required.`;

          }

          if (!location.weight) {

            errs[`deliveryLocation${index}_weight`] = `Delivery location ${index + 1} weight is required.`;

          }

          if (!location.commodity) {

            errs[`deliveryLocation${index}_commodity`] = `Delivery location ${index + 1} commodity is required.`;

          }

          if (!location.deliveryDate) {

            errs[`deliveryLocation${index}_deliveryDate`] = `Delivery location ${index + 1} delivery date is required.`;

          }

        });

      }

    }



    console.log("🔍 Validation errors:", errs);

    setFormErrors(errs);

    if (Object.keys(errs).length) scrollToField(Object.keys(errs)[0]);

    return Object.keys(errs).length === 0;

  };



  // ✅ Submit

  const handleLoadSubmit = async (e) => {

    e.preventDefault();

    console.log("🚀 Form submit button clicked!");



    // Check if we're in edit mode

    if (showEditModal && selectedLoadForAction) {

      return handleEditSubmit(e);

    }



    // pehle se chal raha global guard

    if (creatingLoad) {

      console.log("❌ Already creating load, returning...");

      return;

    }



    // NEW: DRAYAGE single-shot guard

    if (loadType === 'DRAYAGE' && creatingDrayage) {

      console.log("❌ Already creating drayage, returning...");

      return;

    }



    // client-side validation

    console.log("🔍 Running form validation...");

    if (!validateAll()) {

      console.log("❌ Form validation failed!");

      return;

    }

    console.log("✅ Form validation passed!");



    // token fallback (sessionStorage || localStorage)

    const token = sessionStorage.getItem("token") || localStorage.getItem("token");

    console.log("🔑 Token found:", token ? "Yes" : "No");

    if (!token) {

      console.log("❌ No token found, user not logged in");

      alertify.error("You're not logged in.");

      return;

    }



    // Build payload based on load type

    console.log("🔧 Building payload for load type:", loadType);

    console.log("📋 Current form state:", loadForm);

    console.log("📍 Pickup locations:", pickupLocations);

    console.log("📍 Delivery locations:", deliveryLocations);

    let payload;

    

      if (loadType === 'OTR') {

        console.log("📦 Building OTR payload...");

        // OTR Load Structure - Use pickup and delivery locations from state

        const origins = pickupLocations.map(location => ({

          addressLine1: (location.address || "").trim(),

          addressLine2: "",

          city: (location.city || "").trim(),

          state: (location.state || "").trim(),

          zip: location.zip || "",

          weight: parseFloat((location.weight || '0').replace(/\.$/, '')),

          commodity: (location.commodity || "").trim(),

          pickupDate: location.pickupDate,

          deliveryDate: location.deliveryDate

        }));



        const destinations = deliveryLocations.map(location => ({

          addressLine1: (location.address || "").trim(),

          addressLine2: "",

          city: (location.city || "").trim(),

          state: (location.state || "").trim(),

          zip: location.zip || "",

          weight: parseFloat((location.weight || '0').replace(/\.$/, '')),

          commodity: (location.commodity || "").trim(),

          deliveryDate: location.deliveryDate

        }));



        // Calculate totals

        const lineHaul = parseFloat(String(loadForm.lineHaul || '0').replace(/\.$/, '')) || 0;

        const fsc = parseFloat(String(loadForm.fsc || '0').replace(/\.$/, '')) || 0;

        const fscAmount = lineHaul * (fsc / 100); // FSC is a percentage of lineHaul
        const otherCharges = getChargesForPayload();

        const otherTotal = otherCharges.reduce((sum, charge) => sum + (charge.quantity * charge.amount), 0);

        const totalRate = lineHaul + fscAmount + otherTotal;


        payload = {

          shipperId: (loadForm.shipperId || "").trim(),

          loadType: "OTR",

          vehicleType: (loadForm.vehicleType || "").trim(),

          rateDetails: {

            lineHaul: lineHaul,

            fsc: fsc,

            other: otherCharges.length > 0 ? otherCharges : []

          },

          rate: totalRate, // Optional but calculating total

          ...(loadType !== 'DRAYAGE' ? { rateType: (loadForm.rateType || 'Flat Rate').trim() } : {}),

          bidDeadline: loadForm.bidDeadline,

          poNumber: (loadForm.poNumber || "").trim(),

          bolNumber: (loadForm.bolNumber || "").trim(),

          origins: origins,

          destinations: destinations

        };

    } else if (loadType === 'DRAYAGE') {

      console.log("📦 Building DRAYAGE payload...");

      // Calculate totals

      const lineHaulDrayage = parseFloat(String(loadForm.lineHaul || '0').replace(/\.$/, '')) || 0;

      const fscDrayage = parseFloat(String(loadForm.fsc || '0').replace(/\.$/, '')) || 0;

      const fscAmountDrayage = lineHaulDrayage * (fscDrayage / 100); // FSC is a percentage of lineHaul
      const otherChargesDrayage = getChargesForPayload();

      const otherTotalDrayage = otherChargesDrayage.reduce((sum, charge) => sum + (charge.quantity * charge.amount), 0);

      const totalRateDrayage = lineHaulDrayage + fscAmountDrayage + otherTotalDrayage;

      // DRAYAGE Load Structure - Add origins and destinations arrays like OTR
      const origins = [{
        addressLine1: (loadForm.fromAddress || "").trim(),
        addressLine2: "",
        city: (loadForm.fromCity || "").trim(),
        state: (loadForm.fromState || "").trim(),
        zip: (loadForm.fromZip || "").trim(),
        weight: parseFloat(String(loadForm.weight || '0').replace(/\.$/, '')),
        commodity: (loadForm.commodity || "").trim(),
        pickupDate: loadForm.pickupDate,
        deliveryDate: loadForm.deliveryDate
      }];

      const destinations = [{
        addressLine1: (loadForm.toAddress || "").trim(),
        addressLine2: "",
        city: (loadForm.toCity || "").trim(),
        state: (loadForm.toState || "").trim(),
        zip: (loadForm.toZip || "").trim(),
        weight: parseFloat(String(loadForm.weight || '0').replace(/\.$/, '')),
        commodity: (loadForm.commodity || "").trim(),
        deliveryDate: loadForm.deliveryDate
      }];

      payload = {

        shipperId: (loadForm.shipperId || "").trim(),

        loadType: "DRAYAGE",

        vehicleType: (loadForm.vehicleType || "").trim(),

        fromAddressLine1: (loadForm.fromAddress || "").trim(),
        fromAddressLine2: "",
        fromCity: (loadForm.fromCity || "").trim(),
        fromState: (loadForm.fromState || "").trim(),
        fromZip: (loadForm.fromZip || "").trim(),

        toAddressLine1: (loadForm.toAddress || "").trim(),
        toAddressLine2: "",
        toCity: (loadForm.toCity || "").trim(),
        toState: (loadForm.toState || "").trim(),
        toZip: (loadForm.toZip || "").trim(),

        weight: parseFloat(String(loadForm.weight || '0').replace(/\.$/, '')),

        commodity: (loadForm.commodity || "").trim(),

        pickupDate: loadForm.pickupDate,

        deliveryDate: loadForm.deliveryDate,

        rateDetails: {

          lineHaul: lineHaulDrayage,

          fsc: fscDrayage,

          other: otherChargesDrayage.length > 0 ? otherChargesDrayage : []

        },

        rate: totalRateDrayage, // Optional but calculating total

        rateType: (loadForm.rateType || 'Flat Rate').trim(),

        bidDeadline: loadForm.bidDeadline,

        containerNo: (loadForm.containerNo || "").trim(),

        poNumber: (loadForm.poNumber || "").trim(),

        bolNumber: (loadForm.bolNumber || "").trim(),

        returnDate: loadForm.returnDate,

        returnAddress: (loadForm.returnAddress || "").trim(),

        returnCity: (loadForm.returnCity || "").trim(),

        returnState: (loadForm.returnState || "").trim(),

        returnZip: (loadForm.returnZip || "").trim(),
        origins: origins,
        destinations: destinations
      };

    } else {

      // Fallback to old structure for other load types

      payload = {

        loadType,

        shipperId: (loadForm.shipperId || "").trim(),

        fromZip: loadForm.fromZip,

        toZip: loadForm.toZip,

        fromCity: (loadForm.fromCity || "").trim(),

        fromState: (loadForm.fromState || "").trim(),

        toCity: (loadForm.toCity || "").trim(),

        toState: (loadForm.toState || "").trim(),

        vehicleType: (loadForm.vehicleType || "").trim(),

        rate: (() => {

          const lineHaul = parseFloat(String(loadForm.lineHaul || '0').replace(/\.$/, '')) || 0;

          const fsc = parseFloat(String(loadForm.fsc || '0').replace(/\.$/, '')) || 0;

          const other = parseFloat(String(loadForm.other || '0').replace(/\.$/, '')) || 0;

          return lineHaul + fsc + other;

        })(),

        rateType: (loadForm.rateType || 'Flat Rate').trim(),

        pickupDate: loadForm.pickupDate,

        deliveryDate: loadForm.deliveryDate,

        bidDeadline: loadForm.bidDeadline,

        ...(loadType === 'DRAYAGE' ? {

          returnDate: loadForm.returnDate,

          returnAddress: (loadForm.returnAddress || '').trim(),

          returnCity: (loadForm.returnCity || '').trim(),

          returnState: (loadForm.returnState || '').trim(),

          returnZip: (loadForm.returnZip || '').trim(),

        } : {}),

      };

    }



    try {

      setCreatingLoad(true);

      if (loadType === 'DRAYAGE') setCreatingDrayage(true);



      console.log("🚀 Sending payload to API:", payload);

      console.log("🔗 API URL:", `${API_CONFIG.BASE_URL}/api/v1/load/create-by-sales`);



      const res = await axios.post(

        `${API_CONFIG.BASE_URL}/api/v1/load/create-by-sales`,

        payload,

        {

          headers: {

            "Content-Type": "application/json",

            Authorization: `Bearer ${token}`,

          },

        }

      );



      if (res.data?.success) {

        alertify.success("✅ Load created successfully!");

        setShowLoadCreationModal(false);



        resetLoadForm();

        setFormErrors({});

        fetchLoads(); // refresh table

      } else {

        alertify.error(res.data?.message || "❌ Load creation failed.");

      }

    } catch (err) {

      console.error("❌ Error creating load:", err?.response?.data || err.message);

      alertify.error(err?.response?.data?.message || "❌ Backend validation failed.");

    } finally {

      setCreatingLoad(false);

      if (loadType === 'DRAYAGE') setCreatingDrayage(false);

    }

  };



  // ✅ Edit Submit Handler

  const handleEditSubmit = async (e) => {

    e.preventDefault();

    console.log("🔄 Edit form submit button clicked!");



    // Check if we have a selected load to edit

    if (!selectedLoadForAction) {

      alertify.error("No load selected for editing");

      return;

    }



    // Check if already submitting

    if (creatingLoad) {

      console.log("❌ Already submitting, returning...");

      return;

    }



    // Client-side validation

    console.log("🔍 Running form validation for edit...");

    if (!validateAll()) {

      console.log("❌ Form validation failed!");

      return;

    }

    console.log("✅ Form validation passed!");



    // Get authentication token

    const token = sessionStorage.getItem("token") || localStorage.getItem("token");

    console.log("🔑 Token found:", token ? "Yes" : "No");

    if (!token) {

      console.log("❌ No token found, user not logged in");

      alertify.error("You're not logged in.");

      return;

    }



    // Build payload based on load type (same as create)

    console.log("🔧 Building edit payload for load type:", loadType);

    console.log("📋 Current form state:", loadForm);

    console.log("📍 Pickup locations:", pickupLocations);

    console.log("📍 Delivery locations:", deliveryLocations);

    let payload;

    

    if (loadType === 'OTR') {

      console.log("📦 Building OTR edit payload...");

      // OTR Load Structure - Use pickup and delivery locations from state

      const origins = pickupLocations.map(location => ({

        addressLine1: (location.address || "").trim(),

        addressLine2: "",

        city: (location.city || "").trim(),

        state: (location.state || "").trim(),

        zip: location.zip || "",

        weight: parseFloat(String(location.weight || '0').replace(/\.$/, '')),

        commodity: (location.commodity || "").trim(),

        pickupDate: location.pickupDate,

        deliveryDate: location.deliveryDate

      }));



      const destinations = deliveryLocations.map(location => ({

        addressLine1: (location.address || "").trim(),

        addressLine2: "",

        city: (location.city || "").trim(),

        state: (location.state || "").trim(),

        zip: location.zip || "",

        weight: parseFloat(String(location.weight || '0').replace(/\.$/, '')),

        commodity: (location.commodity || "").trim(),

        deliveryDate: location.deliveryDate

      }));



      // Calculate totals for edit

      const lineHaulEdit = parseFloat(String(loadForm.lineHaul || '0').replace(/\.$/, '')) || 0;

      const fscEdit = parseFloat(String(loadForm.fsc || '0').replace(/\.$/, '')) || 0;

      const fscAmountEdit = lineHaulEdit * (fscEdit / 100); // FSC is a percentage of lineHaul
      const otherChargesEdit = getChargesForPayload();

      const otherTotalEdit = otherChargesEdit.reduce((sum, charge) => sum + (charge.quantity * charge.amount), 0);

      const totalRateEdit = lineHaulEdit + fscAmountEdit + otherTotalEdit;


      payload = {

        shipperId: (loadForm.shipperId || "").trim(),

        loadType: "OTR",

        vehicleType: (loadForm.vehicleType || "").trim(),

        rateDetails: {

          lineHaul: lineHaulEdit,

          fsc: fscEdit,

          other: otherChargesEdit.length > 0 ? otherChargesEdit : []

        },

        rate: totalRateEdit, // Optional but calculating total

        rateType: (loadForm.rateType || 'Flat Rate').trim(),

        bidDeadline: loadForm.bidDeadline,

        containerNo: (loadForm.containerNo || "").trim(),

        poNumber: (loadForm.poNumber || "").trim(),

        bolNumber: (loadForm.bolNumber || "").trim(),

        origins: origins,

        destinations: destinations

      };

    } else if (loadType === 'DRAYAGE') {

      console.log("📦 Building DRAYAGE edit payload...");

      // Calculate totals for DRAYAGE edit

      const lineHaulDrayageEdit = parseFloat(String(loadForm.lineHaul || '0').replace(/\.$/, '')) || 0;

      const fscDrayageEdit = parseFloat(String(loadForm.fsc || '0').replace(/\.$/, '')) || 0;

      const fscAmountDrayageEdit = lineHaulDrayageEdit * (fscDrayageEdit / 100); // FSC is a percentage of lineHaul
      const otherChargesDrayageEdit = getChargesForPayload();

      const otherTotalDrayageEdit = otherChargesDrayageEdit.reduce((sum, charge) => sum + (charge.quantity * charge.amount), 0);

      const totalRateDrayageEdit = lineHaulDrayageEdit + fscAmountDrayageEdit + otherTotalDrayageEdit;

      // DRAYAGE Load Structure - Add origins and destinations arrays like OTR
      const originsEdit = [{
        addressLine1: (loadForm.fromAddress || "").trim(),
        addressLine2: "",
        city: (loadForm.fromCity || "").trim(),
        state: (loadForm.fromState || "").trim(),
        zip: (loadForm.fromZip || "").trim(),
        weight: parseFloat(String(loadForm.weight || '0').replace(/\.$/, '')),
        commodity: (loadForm.commodity || "").trim(),
        pickupDate: loadForm.pickupDate,
        deliveryDate: loadForm.deliveryDate
      }];

      const destinationsEdit = [{
        addressLine1: (loadForm.toAddress || "").trim(),
        addressLine2: "",
        city: (loadForm.toCity || "").trim(),
        state: (loadForm.toState || "").trim(),
        zip: (loadForm.toZip || "").trim(),
        weight: parseFloat(String(loadForm.weight || '0').replace(/\.$/, '')),
        commodity: (loadForm.commodity || "").trim(),
        deliveryDate: loadForm.deliveryDate
      }];

      payload = {

        shipperId: (loadForm.shipperId || "").trim(),

        loadType: "DRAYAGE",

        vehicleType: (loadForm.vehicleType || "").trim(),

        fromAddressLine1: (loadForm.fromAddress || "").trim(),
        fromAddressLine2: "",
        fromCity: (loadForm.fromCity || "").trim(),
        fromState: (loadForm.fromState || "").trim(),
        fromZip: (loadForm.fromZip || "").trim(),

        toAddressLine1: (loadForm.toAddress || "").trim(),
        toAddressLine2: "",
        toCity: (loadForm.toCity || "").trim(),
        toState: (loadForm.toState || "").trim(),
        toZip: (loadForm.toZip || "").trim(),

        weight: parseFloat(String(loadForm.weight || '0').replace(/\.$/, '')),

        commodity: (loadForm.commodity || "").trim(),

        pickupDate: loadForm.pickupDate,

        deliveryDate: loadForm.deliveryDate,

        rateDetails: {

          lineHaul: lineHaulDrayageEdit,

          fsc: fscDrayageEdit,

          other: otherChargesDrayageEdit.length > 0 ? otherChargesDrayageEdit : []

        },

        rate: totalRateDrayageEdit, // Optional but calculating total

        rateType: (loadForm.rateType || 'Flat Rate').trim(),

        bidDeadline: loadForm.bidDeadline,

        containerNo: (loadForm.containerNo || "").trim(),

        poNumber: (loadForm.poNumber || "").trim(),

        bolNumber: (loadForm.bolNumber || "").trim(),

        returnDate: loadForm.returnDate,

        returnAddress: (loadForm.returnAddress || "").trim(),

        returnCity: (loadForm.returnCity || "").trim(),

        returnState: (loadForm.returnState || "").trim(),

        returnZip: (loadForm.returnZip || "").trim(),
        origins: originsEdit,
        destinations: destinationsEdit
      };

    } else {

      // Fallback to old structure for other load types

      payload = {

        loadType,

        shipperId: (loadForm.shipperId || "").trim(),

        fromZip: loadForm.fromZip,

        toZip: loadForm.toZip,

        fromCity: (loadForm.fromCity || "").trim(),

        fromState: (loadForm.fromState || "").trim(),

        toCity: (loadForm.toCity || "").trim(),

        toState: (loadForm.toState || "").trim(),

        vehicleType: (loadForm.vehicleType || "").trim(),

        rate: (() => {

          const lineHaul = parseFloat(String(loadForm.lineHaul || '0').replace(/\.$/, '')) || 0;

          const fsc = parseFloat(String(loadForm.fsc || '0').replace(/\.$/, '')) || 0;

          const other = parseFloat(String(loadForm.other || '0').replace(/\.$/, '')) || 0;

          return lineHaul + fsc + other;

        })(),

        rateType: (loadForm.rateType || 'Flat Rate').trim(),

        pickupDate: loadForm.pickupDate,

        deliveryDate: loadForm.deliveryDate,

        bidDeadline: loadForm.bidDeadline,

        ...(loadType === 'DRAYAGE' ? {

          returnDate: loadForm.returnDate,

          returnAddress: (loadForm.returnAddress || '').trim(),

          returnCity: (loadForm.returnCity || '').trim(),

          returnState: (loadForm.returnState || '').trim(),

          returnZip: (loadForm.returnZip || '').trim(),

        } : {}),

      };

    }



    try {

      setCreatingLoad(true);



      console.log("🔄 Sending edit payload to API:", payload);

      console.log("🔍 Selected load for action:", selectedLoadForAction);

      console.log("🔍 Is duplicating:", isDuplicating);

      

      let res;

      if (isDuplicating) {

        // If duplicating, create a new load using the same API as add load

        console.log("🔄 Creating new load (duplicate)...");

        console.log("🔗 API URL:", `${API_CONFIG.BASE_URL}/api/v1/load/create-by-sales`);

        

        res = await axios.post(

          `${API_CONFIG.BASE_URL}/api/v1/load/create-by-sales`,

          payload,

          {

            headers: {

              "Content-Type": "application/json",

              Authorization: `Bearer ${token}`,

            },

          }

        );

      } else {

        // If editing, update existing load

        console.log("🔍 Load ID being used:", selectedLoadForAction.loadNum);

        console.log("🔍 Available load properties:", Object.keys(selectedLoadForAction));

        console.log("🔗 API URL:", `${API_CONFIG.BASE_URL}/api/v1/load/sales-user/load/${selectedLoadForAction.loadNum}`);



        res = await axios.put(

          `${API_CONFIG.BASE_URL}/api/v1/load/sales-user/load/${selectedLoadForAction.loadNum}`,

          payload,

          {

            headers: {

              "Content-Type": "application/json",

              Authorization: `Bearer ${token}`,

            },

          }

        );

      }



      if (res.data?.success) {

        if (isDuplicating) {

          alertify.success("✅ Load duplicated successfully!");

        } else {

          alertify.success("✅ Load updated successfully!");

        }

        setShowEditModal(false);

        setSelectedLoadForAction(null);

        setIsDuplicating(false);



        resetLoadForm();

        setFormErrors({});

        fetchLoads(); // refresh table

      } else {

        alertify.error(res.data?.message || "❌ Load update failed.");

      }

    } catch (err) {

      console.error("❌ Error updating load:", err?.response?.data || err.message);

      

      if (err.response) {

        console.error('Response status:', err.response.status);

        console.error('Response data:', err.response.data);

        alertify.error(`Error: ${err.response.data?.message || `HTTP ${err.response.status}`}`);

      } else if (err.request) {

        console.error('Request error:', err.request);

        alertify.error('Network error. Please check your connection.');

      } else {

        console.error('Other error:', err.message);

        alertify.error(`Error: ${err.message}`);

      }

    } finally {

      setCreatingLoad(false);

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

  // Top pe, itemsPerPage aapka UI ke liye rahe — yeh sirf API se sab laayega.

  const PAGE_SIZE = 200;   // ek request me kitne laane hain; aap 500/1000 bhi kar sakte ho (server allow kare to)



  // Helper: API response se array nikaalo (aapke API me kabhi 'loads', kabhi 'data')

  const pickArray = (data) => Array.isArray(data?.loads) ? data.loads : (Array.isArray(data?.data) ? data.data : []);



  // REPLACE your fetchLoads with this:

  const fetchLoads = async () => {

    try {

      setLoading(true);



      const token = sessionStorage.getItem("token") || localStorage.getItem("token");

      const headers = {

        "Content-Type": "application/json",

        ...(token ? { Authorization: `Bearer ${token}` } : {}),

      };



      let page = 1;

      let allRaw = [];

      const seen = new Set(); // _id dedupe (agar server same page de)



      // 1) Try page/limit style pagination

      while (true) {

        const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/load/inhouse-created`, {

          timeout: 15000,

          withCredentials: true,

          headers,

          params: { page, limit: PAGE_SIZE, sort: "-createdAt" },

        });



        let chunk = pickArray(res.data);



        // Dedupe by _id to avoid infinite loop if server ignores 'page'

        chunk = chunk.filter((l) => {

          const id = l?._id || "";

          if (!id || seen.has(id)) return false;

          seen.add(id);

          return true;

        });



        allRaw = allRaw.concat(chunk);



        // Stop conditions

        const hasMoreFlag = (res.data?.hasMore === true) || (res.data?.nextPageToken ? true : false);

        if (!hasMoreFlag && chunk.length < PAGE_SIZE) break;  // last page

        if (chunk.length === 0) break;                        // nothing new



        page += 1;

        if (page > 50) break;                                 // safety cap

      }



      // 2) If server ignored 'page' (still few items), try skip/offset style

      if (allRaw.length > 0 && allRaw.length % PAGE_SIZE === 0) {

        // keep pulling with skip until chunk < PAGE_SIZE

        let skip = allRaw.length;

        while (true) {

          const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/load/inhouse-created`, {

            timeout: 15000,

            withCredentials: true,

            headers,

            params: { skip, limit: PAGE_SIZE, sort: "-createdAt" },

          });

          let chunk = pickArray(res.data).filter((l) => {

            const id = l?._id || "";

            if (!id || seen.has(id)) return false;

            seen.add(id);

            return true;

          });

          if (chunk.length === 0) break;

          allRaw = allRaw.concat(chunk);

          if (chunk.length < PAGE_SIZE) break;

          skip += chunk.length;

          if (skip > 100000) break; // safety

        }

      }



      // 3) Fallback: if still empty, do one simple call

      if (allRaw.length === 0) {

        const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/load/inhouse-created`, {

          timeout: 15000, withCredentials: true, headers,

        });

        allRaw = pickArray(res.data);

      }



      // === Updated transform logic for new API structure ===

      const transformedLoads = allRaw.map((load, index) => {

        try {

          // origin - Handle both old and new structure

          let originText = 'N/A';

          if (load.origins && load.origins.length > 0) {

            // New structure with origins array

            const firstOrigin = load.origins[0];

            if (firstOrigin.addressLine1) {

              originText = firstOrigin.addressLine1;

            } else if (firstOrigin.city && firstOrigin.state) {

              originText = `${firstOrigin.city}, ${firstOrigin.state}`;

            } else if (firstOrigin.city) {

              originText = firstOrigin.city;

            }

            // If multiple origins, show count

            if (load.origins.length > 1) {

              originText += ` (+${load.origins.length - 1} more)`;

            }

          } else if (load.origin) {

            // Old structure with single origin

            if (typeof load.origin === 'string') originText = load.origin;

            else if (load.origin.city && load.origin.state) originText = `${load.origin.city}, ${load.origin.state}`;

            else if (load.origin.city) originText = load.origin.city;

            else if (load.origin.addressLine1) originText = load.origin.addressLine1;

          }



          // destination - Handle both old and new structure

          let destinationText = 'N/A';

          if (load.destinations && load.destinations.length > 0) {

            // New structure with destinations array

            const firstDestination = load.destinations[0];

            if (firstDestination.addressLine1) {

              destinationText = firstDestination.addressLine1;

            } else if (firstDestination.city && firstDestination.state) {

              destinationText = `${firstDestination.city}, ${firstDestination.state}`;

            } else if (firstDestination.city) {

              destinationText = firstDestination.city;

            }

            // If multiple destinations, show count

            if (load.destinations.length > 1) {

              destinationText += ` (+${load.destinations.length - 1} more)`;

            }

          } else if (load.destination) {

            // Old structure with single destination

            if (typeof load.destination === 'string') destinationText = load.destination;

            else if (load.destination.city && load.destination.state) destinationText = `${load.destination.city}, ${load.destination.state}`;

            else if (load.destination.city) destinationText = load.destination.city;

            else if (load.destination.addressLine1) destinationText = load.destination.addressLine1;

          }

          // trucker

          let truckerName = 'N/A';

          if (load.acceptedBid?.driverName) {

            truckerName = load.acceptedBid.driverName;

          } else if (load.assignedTo) {

            if (typeof load.assignedTo === 'string') truckerName = load.assignedTo;

            else if (load.assignedTo.compName) truckerName = load.assignedTo.compName;

          } else if (load.carrier?.compName) {

            truckerName = load.carrier.compName;

          }

          // status - preserve original status from API

          let status = load.status || 'available';

          if (status) {

            switch (status.toLowerCase()) {

              case 'in transit': status = 'in-transit'; break;

              case 'pending approval': status = 'pending-approval'; break;

              // Keep original status for: posted, bidding, assigned, completed, delivered

              default: status = status.toLowerCase();

            }

          }



          return {

            id: `LD-${load._id?.slice(-6) || '000000'}`,

            loadNum: load._id || 'N/A',

            shipmentNumber: load.shipmentNumber || 'N/A',

            origin: originText,

            destination: destinationText,

            rate: load.rate || 0,

            truckerName,

            status,

            createdAt: load.pickupDate

              ? new Date(load.pickupDate).toISOString()

              : load.createdAt

                ? new Date(load.createdAt).toISOString()

                : 'N/A',

            createdBy: load.createdBySalesUser 

              ? `Sales: ${load.createdBySalesUser.empName} (${load.createdBySalesUser.empId})`

              : `Shipper: ${load.shipper?.compName || 'N/A'}`,

            docUpload: 'sample-doc.jpg',

            remarks: load.commodity || load.notes || '',

            loadType: load.loadType || 'OTR',

            vehicleType: load.vehicleType || 'N/A',

            weight: load.weight || 0,

            commodity: load.commodity || 'N/A',

            pickupDate: load.pickupDate,

            deliveryDate: load.deliveryDate,

            bidDeadline: load.bidDeadline,

            containerNo: load.containerNo || '',

            poNumber: load.poNumber || '',

            bolNumber: load.bolNumber || '',

            origins: load.origins || [],

            destinations: load.destinations || [],

            // Preserve raw fields for edit/duplicate (esp. DRAYAGE)

            originRaw: load.origin || null,

            destinationRaw: load.destination || null,

            fromAddress: (load.origin?.addressLine1 || load.origin?.address || load.fromAddress || ''),

            toAddress: (load.destination?.addressLine1 || load.destination?.address || load.toAddress || ''),

            fromZip: (

              load.origin?.zip || load.origin?.zipcode || load.origin?.zipCode || load.origin?.postalCode ||

              load.fromZip || ''

            ),

            toZip: (

              load.destination?.zip || load.destination?.zipcode || load.destination?.zipCode || load.destination?.postalCode ||

              load.toZip || ''

            ),

            fromCity: (load.origin?.city || load.fromCity || ''),

            fromState: (load.origin?.state || load.fromState || ''),

            toCity: (load.destination?.city || load.toCity || ''),

            toState: (load.destination?.state || load.toState || ''),

            shipper: load.shipper || null,

            acceptedBid: load.acceptedBid || null,

            rateDetails: load.rateDetails || null,

            // Drayage Return fields (support both new and legacy keys)

            returnDate: load.returnDate || null,

            returnAddress: load.returnAddress || load.returnLocation || '',

            returnCity: load.returnCity || (load.returnLocationCity || ''),

            returnState: load.returnState || (load.returnLocationState || ''),

            returnZip: load.returnZip || (load.returnLocationZip || ''),

          };

        } catch {

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



      // Latest first

      transformedLoads.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));



      setLoads(transformedLoads);

    } catch (error) {

      console.error('Error fetching loads:', error);

      alertify.error(`Failed to load loads: ${error.response?.status || 'Network Error'}`);

    } finally {

      setLoading(false);

    }

  };





  useEffect(() => {

    fetchLoads();

  }, []);



  // Initialize default locations for OTR

  useEffect(() => {

    if (loadType === "OTR" && pickupLocations.length === 0 && deliveryLocations.length === 0) {

      setPickupLocations([{

        id: Date.now(),

        zip: '',

        address: '',

        city: '',

        state: '',

        weight: '',

        commodity: '',

        pickupDate: '',

        deliveryDate: ''

      }]);

      setDeliveryLocations([{

        id: Date.now() + 1,

        zip: '',

        address: '',

        city: '',

        state: '',

        weight: '',

        commodity: '',

        deliveryDate: ''

      }]);

    }

  }, [loadType, pickupLocations.length, deliveryLocations.length]);



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



        // Clear auto-accept timer

        if (autoAcceptTimer) {

          clearInterval(autoAcceptTimer);

          setAutoAcceptTimer(null);

        }

        setTimeRemaining(30);

      }, 1000);

    } catch (err) {

      console.error('Status update failed:', err);

    }

  };



  const handleAutoAccept = async () => {

    try {

      const { id } = selectedLoad;

      // Simulate API call for auto-accept

      setTimeout(() => {

        setLoads(loads.map(load =>

          load.id === id ? { ...load, status: 'approved' } : load

        ));

        setModalType(null);

        setReason('');

        setSelectedLoad(null);

        setViewDoc(false);



        // Clear timer

        if (autoAcceptTimer) {

          clearInterval(autoAcceptTimer);

          setAutoAcceptTimer(null);

        }

        setTimeRemaining(30);

        alertify.success('Load auto-accepted successfully!');

      }, 1000);

    } catch (err) {

      console.error('Auto-accept failed:', err);

      alertify.error('Auto-accept failed. Please try again.');

    }

  };



  // Status color helper

  const statusColor = (status) => {

    if (!status) return 'bg-yellow-100 text-yellow-700';

    if (status === 'available' || status === 'posted') return 'bg-green-100 text-green-700';

    if (status === 'bidding') return 'bg-orange-100 text-orange-700';

    if (status === 'assigned') return 'bg-blue-100 text-blue-700';

    if (status === 'in-transit' || status === 'in transit') return 'bg-purple-100 text-purple-700';

    if (status === 'completed' || status === 'delivered') return 'bg-gray-100 text-gray-700';

    if (status === 'pending-approval' || status === 'pending approval') return 'bg-yellow-100 text-yellow-700';

    return 'bg-blue-100 text-blue-700';

  };



  // Function to handle tab changes

  const handleTabChange = (tab) => {

    setActiveTab(tab);

    setLoadType(tab === 'ALL' ? 'OTR' : tab); // Set loadType for form

  };



  // Calculate counts for each load type

  const getLoadCounts = () => {

    const totalCount = loads.length;

    const otrCount = loads.filter(load => load.loadType === 'OTR').length;

    const drayageCount = loads.filter(load => load.loadType === 'DRAYAGE').length;

    

    return { totalCount, otrCount, drayageCount };

  };



  const { totalCount, otrCount, drayageCount } = getLoadCounts();



  // Filter loads based on active tab and search term

  const filteredLoads = loads.filter(load => {

    // First filter by active tab

    let matchesTab = true;

    if (activeTab === 'OTR') {

      matchesTab = load.loadType === 'OTR';

    } else if (activeTab === 'DRAYAGE') {

      matchesTab = load.loadType === 'DRAYAGE';

    }

    // If activeTab is 'ALL', show all loads



    // Then filter by search term

    const matchesSearch = load.id.toLowerCase().includes(searchTerm.toLowerCase()) ||

      load.shipmentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||

      load.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||

      load.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||

      load.truckerName.toLowerCase().includes(searchTerm.toLowerCase());



    return matchesTab && matchesSearch;

  });



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

        date: new Date().toISOString(), // Current date-time

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

          createdAt: new Date(response.data.data.date).toISOString(),

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



  // Fetch CMT assignment data

  const fetchCmtAssignment = async (loadId) => {

    try {

      setLoadingCmtAssignment(true);

      const token = sessionStorage.getItem("token") || localStorage.getItem("token");

      

      const response = await axios.get(

        `${API_CONFIG.BASE_URL}/api/v1/load/sales-user/load/${loadId}/cmt-assignment`,

        {

          headers: { Authorization: `Bearer ${token}` }

        }

      );



      if (response.data?.success) {

        setCmtAssignment(response.data.data);

      } else {

        setCmtAssignment(null);

      }

    } catch (error) {

      console.error('Error fetching CMT assignment:', error);

      setCmtAssignment(null);

    } finally {

      setLoadingCmtAssignment(false);

    }

  };



  // Handle view load details

  const handleViewLoad = (load) => {

    setSelectedLoadForAction(load);

    setShowViewModal(true);

    // Fetch CMT assignment data when opening view modal

    if (load.loadNum) {

      fetchCmtAssignment(load.loadNum);

    }

  };



  // Handle edit load

  const handleEditLoad = (load) => {

    setSelectedLoadForAction(load);

    setShowEditModal(true);

    

    // Set flag to indicate we're editing (not duplicating)

    setIsDuplicating(false);

    

    // Populate form with existing load data

    populateEditForm(load);

  };



  const populateEditForm = (load) => {

    console.log('🔄 Populating edit form with load data:', load);

    

    // Set load type based on the load data

    setLoadType(load.loadType || 'OTR');

    

    // Extract shipper ID from shipper object or direct property

    const shipperId = load.shipperId || load.shipper?._id || '';

    console.log('🔍 Extracted shipper ID:', shipperId);

    

    // Populate basic form fields

    // Handle rateDetails structure (new API) or direct fields (old API)

    const lineHaulValue = load.rateDetails?.lineHaul || load.lineHaul || '';

    const fscValue = load.rateDetails?.fsc || load.fsc || '';

    const otherChargesFromAPI = load.rateDetails?.other || [];

    

    // Calculate other total if charges array exists

    let otherTotal = '';

    if (otherChargesFromAPI && Array.isArray(otherChargesFromAPI) && otherChargesFromAPI.length > 0) {

      otherTotal = otherChargesFromAPI.reduce((sum, charge) => sum + ((charge.total || (charge.quantity * charge.amount)) || 0), 0).toFixed(2);

      // Populate charges array

      setCharges(otherChargesFromAPI.map((charge, index) => ({

        id: Date.now() + index,

        name: charge.name || '',

        quantity: charge.quantity || 0,

        amount: charge.amount || 0.00

      })));

    } else {

      // Fallback to direct other value

      otherTotal = load.other || '';

      setCharges([{ id: Date.now(), name: '', quantity: 0, amount: 0.00 }]);

    }



    // For drayage loads, handle location data differently

    let fromZip = '', fromCity = '', fromState = '', fromAddress = '';

    let toZip = '', toCity = '', toState = '', toAddress = '';

    

    if (load.loadType === 'DRAYAGE') {

      // For DRAYAGE loads, check origins/destinations arrays first (as per API response structure)
      // Then check top-level fields, then origin/destination objects
      
      // Check origins array first (for DRAYAGE, origins[0] has the pickup location)
      if (load.origins && Array.isArray(load.origins) && load.origins.length > 0) {
        const firstOrigin = load.origins[0];
        fromZip = firstOrigin.zip || firstOrigin.zipcode || firstOrigin.zipCode || firstOrigin.postalCode || '';
        fromCity = firstOrigin.city || '';
        fromState = firstOrigin.state || '';
        fromAddress = firstOrigin.addressLine1 || firstOrigin.address || '';
      }
      
      // Check destinations array first (for DRAYAGE, destinations[0] has the loading/unloading location)
      if (load.destinations && Array.isArray(load.destinations) && load.destinations.length > 0) {
        const firstDestination = load.destinations[0];
        toZip = firstDestination.zip || firstDestination.zipcode || firstDestination.zipCode || firstDestination.postalCode || '';
        toCity = firstDestination.city || '';
        toState = firstDestination.state || '';
        toAddress = firstDestination.addressLine1 || firstDestination.address || '';
      }
      
      // Fallback to top-level fields if arrays don't have data
      if (!fromZip || !fromCity || !fromState) {
        fromZip = fromZip || load.fromZip || '';
        fromCity = fromCity || load.fromCity || '';
        fromState = fromState || load.fromState || '';
        fromAddress = fromAddress || load.fromAddress || '';
      }
      
      if (!toZip || !toCity || !toState) {
        toZip = toZip || load.toZip || '';
        toCity = toCity || load.toCity || '';
        toState = toState || load.toState || '';
        toAddress = toAddress || load.toAddress || '';
      }
      
      // Additional fallback to originRaw/destinationRaw if still empty
      if (!fromZip || !fromCity || !fromState) {
        const originRaw = load.originRaw || load.origin;
      if (typeof originRaw === 'string') {

        const text = originRaw || '';

          if (!fromAddress) fromAddress = text;
          if (!fromZip) {
        const zipMatch = text.match(/\b\d{5}(?:-\d{4})?\b/);

        if (zipMatch) fromZip = zipMatch[0];

          }
        if (text.includes(',')) {

          const parts = text.split(',');

          const cityPart = (parts[0] || '').trim();

          const statePart = (parts[1] || '').trim();

            if (!fromCity && cityPart) fromCity = cityPart;
            if (!fromState) {
          const stateCode = statePart.match(/([A-Z]{2})/i);

          if (stateCode) fromState = stateCode[1].toUpperCase();

            }
        }

      } else if (originRaw && typeof originRaw === 'object') {

          if (!fromAddress) fromAddress = originRaw.addressLine1 || originRaw.address || '';
          if (!fromZip) fromZip = originRaw.zip || originRaw.zipcode || originRaw.zipCode || originRaw.postalCode || '';
          if (!fromCity) fromCity = originRaw.city || '';
          if (!fromState) fromState = originRaw.state || '';
        }
        
        // Final fallback to origin object
        if (!fromZip) {
          fromZip = load.origin?.zip || load.origin?.zipcode || load.origin?.zipCode || load.origin?.postalCode || '';
        }
        if (!fromCity) fromCity = load.origin?.city || '';
        if (!fromState) fromState = load.origin?.state || '';
        if (!fromAddress) fromAddress = load.origin?.addressLine1 || load.origin?.address || '';
      }
      
      if (!toZip || !toCity || !toState) {
        const destinationRaw = load.destinationRaw || load.destination;
      if (typeof destinationRaw === 'string') {

        const text = destinationRaw || '';

          if (!toAddress) toAddress = text;
          if (!toZip) {
        const zipMatch = text.match(/\b\d{5}(?:-\d{4})?\b/);

        if (zipMatch) toZip = zipMatch[0];

          }
        if (text.includes(',')) {

          const parts = text.split(',');

          const cityPart = (parts[0] || '').trim();

          const statePart = (parts[1] || '').trim();

            if (!toCity && cityPart) toCity = cityPart;
            if (!toState) {
          const stateCode = statePart.match(/([A-Z]{2})/i);

          if (stateCode) toState = stateCode[1].toUpperCase();

            }
        }

      } else if (destinationRaw && typeof destinationRaw === 'object') {

          if (!toAddress) toAddress = destinationRaw.addressLine1 || destinationRaw.address || '';
          if (!toZip) toZip = destinationRaw.zip || destinationRaw.zipcode || destinationRaw.zipCode || destinationRaw.postalCode || '';
          if (!toCity) toCity = destinationRaw.city || '';
          if (!toState) toState = destinationRaw.state || '';
        }
        
        // Final fallback to destination object
        if (!toZip) {
          toZip = load.destination?.zip || load.destination?.zipcode || load.destination?.zipCode || load.destination?.postalCode || '';
        }
        if (!toCity) toCity = load.destination?.city || '';
        if (!toState) toState = load.destination?.state || '';
        if (!toAddress) toAddress = load.destination?.addressLine1 || load.destination?.address || '';
      }
      
      console.log('📍 DRAYAGE Load ZIP extraction:', {
        fromZip,
        toZip,
        origins: load.origins,
        destinations: load.destinations,
        loadFromZip: load.fromZip,
        loadToZip: load.toZip
      });
    } else {

      // For OTR loads, use direct properties

      fromZip = load.fromZip || '';

      fromCity = load.fromCity || '';

      fromState = load.fromState || '';

      toZip = load.toZip || '';

      toCity = load.toCity || '';

      toState = load.toState || '';

    }



    setLoadForm({

      shipperId: shipperId,

      vehicleType: load.vehicleType || '',

      lineHaul: String(lineHaulValue),

      fsc: String(fscValue),

      other: String(otherTotal),

      ...(loadType !== 'DRAYAGE' ? { rateType: load.rateType || 'Flat Rate' } : {}),

      bidDeadline: load.bidDeadline ? formatDateTimeForInput(load.bidDeadline) : '',

      containerNo: load.containerNo || '',

      poNumber: load.poNumber || '',

      bolNumber: load.bolNumber || '',

      weight: load.weight || '',

      commodity: load.commodity || '',

      pickupDate: load.pickupDate ? formatDateTimeForInput(load.pickupDate) : '',

      deliveryDate: load.deliveryDate ? formatDateTimeForInput(load.deliveryDate) : '',

      returnDate: load.returnDate ? formatDateTimeForInput(load.returnDate) : '',

      returnZip: load.returnZip || '',

      returnAddress: load.returnAddress || '',

      returnCity: load.returnCity || '',

      returnState: load.returnState || '',

      fromZip: fromZip,

      fromAddress: fromAddress,

      fromCity: fromCity,

      fromState: fromState,

      toZip: toZip,

      toAddress: toAddress,

      toCity: toCity,

      toState: toState

    });



    // Set shipper input value

    if (load.shipper) {

      setShipperInputValue(`${load.shipper.compName} (${load.shipper.mc_dot_no})`);

    }

    

    // Clear any existing form errors

    setFormErrors({});



    // Populate location arrays for OTR loads

    if (load.loadType === 'OTR' && load.origins && load.destinations) {

      // Convert origins to pickup locations

      const pickupLocs = load.origins.map((origin, index) => ({

        id: `pickup-${Date.now()}-${index}`,

        address: origin.addressLine1 || '',

        city: origin.city || '',

        state: origin.state || '',

        zip: origin.zip || '',
        weight: origin.weight || '',

        commodity: origin.commodity || '',

        pickupDate: origin.pickupDate ? (() => {

          const formatted = formatDateTimeForInput(origin.pickupDate);

          console.log('📅 Formatting pickup date:', origin.pickupDate, '→', formatted);

          return formatted;

        })() : '',

        deliveryDate: origin.deliveryDate ? (() => {

          const formatted = formatDateTimeForInput(origin.deliveryDate);

          console.log('📅 Formatting delivery date:', origin.deliveryDate, '→', formatted);

          return formatted;

        })() : ''

      }));

      setPickupLocations(pickupLocs);



      // Convert destinations to delivery locations

      const deliveryLocs = load.destinations.map((destination, index) => ({

        id: `delivery-${Date.now()}-${index}`,

        address: destination.addressLine1 || '',

        city: destination.city || '',

        state: destination.state || '',

        zip: destination.zip || '',
        weight: destination.weight || '',

        commodity: destination.commodity || '',

        deliveryDate: destination.deliveryDate ? (() => {

          const formatted = formatDateTimeForInput(destination.deliveryDate);

          console.log('📅 Formatting destination delivery date:', destination.deliveryDate, '→', formatted);

          return formatted;

        })() : ''

      }));

      setDeliveryLocations(deliveryLocs);

    }



    // Clear any existing form errors

    setFormErrors({});

  };



  // Handle delete load

  const handleDeleteLoad = (load) => {

    setSelectedLoadForAction(load);

    setShowDeleteModal(true);

  };



  // Handle duplicate load

  const handleDuplicateLoad = (load) => {

    console.log('🔄 Duplicating load:', load);

    

    // Mark selected and duplicating

    setSelectedLoadForAction(load);

    setIsDuplicating(true);

    

    // Populate the form exactly like edit to include lineHaul, fsc, other, etc.

    populateEditForm(load);

    

    // Open the edit modal

    setShowEditModal(true);

    

    // Notify user

    alertify.success('Load data duplicated successfully! Please modify the details and save.');

  };



  // Confirm delete

  const confirmDelete = async () => {

    if (!selectedLoadForAction) return;

    

    try {

      setSubmitting(true);

      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");

      

      if (!token) {

        alertify.error('Authentication required. Please login again.');

        return;

      }



      // Call the DELETE API

      await axios.delete(`${API_CONFIG.BASE_URL}/api/v1/load/sales-user/load/${selectedLoadForAction.loadNum}`, {

        headers: { 

          'Authorization': `Bearer ${token}`,

          'Content-Type': 'application/json'

        }

      });

      

      // Remove from local state after successful API call

      setLoads(prevLoads => prevLoads.filter(load => load.loadNum !== selectedLoadForAction.loadNum));

      setShowDeleteModal(false);

      setSelectedLoadForAction(null);

      alertify.success('Load deleted successfully!');

    } catch (error) {

      console.error('Error deleting load:', error);

      console.error('Error response:', error.response);

      

      if (error.response) {

        console.error('Response status:', error.response.status);

        console.error('Response data:', error.response.data);

        alertify.error(`Error: ${error.response.data?.message || `HTTP ${error.response.status}`}`);

      } else if (error.request) {

        console.error('Request error:', error.request);

        alertify.error('Network error. Please check your connection.');

      } else {

        console.error('Other error:', error.message);

        alertify.error(`Error: ${error.message}`);

      }

    } finally {

      setSubmitting(false);

    }

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

    // Start auto-accept timer when modal opens

    React.useEffect(() => {

      if (modalType === 'approval') {

        setTimeRemaining(30);

        const timer = setInterval(() => {

          setTimeRemaining(prev => {

            if (prev <= 1) {

              // Auto-accept after 30 seconds

              handleAutoAccept();

              return 0;

            }

            return prev - 1;

          });

        }, 1000);



        setAutoAcceptTimer(timer);



        return () => {

          if (timer) {

            clearInterval(timer);

            setAutoAcceptTimer(null);

          }

        };

      }

    }, [modalType]);



    return (

      <div className="fixed inset-0 z-50 backdrop-blue-sm bg-black/30 flex items-center justify-center">

        <div className="bg-white p-8 rounded-2xl shadow-2xl w-[400px] relative flex flex-col items-center">

          <div className="flex justify-between items-center w-full mb-4">

            <h3 className="text-lg font-bold text-gray-800">

              {modalType === 'approval' ? 'Accept Load' : 'Load Action'}

            </h3>

            <button className="text-xl hover:text-red-500" onClick={() => {

              setModalType(null);

              if (autoAcceptTimer) {

                clearInterval(autoAcceptTimer);

                setAutoAcceptTimer(null);

              }

              setTimeRemaining(30);

            }}>×</button>

          </div>



          {modalType === 'approval' && (

            <div className="w-full mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">

              <div className="text-center">

                <div className="text-2xl font-bold text-blue-600">{timeRemaining}s</div>

                <div className="text-sm text-blue-500">Auto-accept timer</div>

              </div>

            </div>

          )}



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

          {/* Total Loads - Clickable */}

          <div 

            onClick={() => handleTabChange('ALL')}

            className={`bg-white rounded-2xl shadow-xl p-4 border border-gray-100 cursor-pointer transition-all duration-200 hover:shadow-lg ${

              activeTab === 'ALL' ? 'ring-2 ring-blue-500 bg-blue-50' : ''

            }`}

          >

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">

                <Truck className="text-green-600" size={20} />

              </div>

              <div>

                <p className="text-sm text-gray-600">Total Loads</p>

                <p className="text-xl font-bold text-gray-800">{totalCount}</p>

              </div>

            </div>

          </div>



          {/* OTR Loads - Clickable */}

          <div 

            onClick={() => handleTabChange('OTR')}

            className={`bg-white rounded-2xl shadow-xl p-4 border border-gray-100 cursor-pointer transition-all duration-200 hover:shadow-lg ${

              activeTab === 'OTR' ? 'ring-2 ring-blue-500 bg-blue-50' : ''

            }`}

          >

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">

                <CheckCircle className="text-blue-600" size={20} />

              </div>

              <div>

                <p className="text-sm text-gray-600">OTR</p>

                <p className="text-xl font-bold text-gray-800">{otrCount}</p>

              </div>

            </div>

          </div>



          {/* DRAYAGE Loads - Clickable */}

          <div 

            onClick={() => handleTabChange('DRAYAGE')}

            className={`bg-white rounded-2xl shadow-xl p-4 border border-gray-100 cursor-pointer transition-all duration-200 hover:shadow-lg ${

              activeTab === 'DRAYAGE' ? 'ring-2 ring-blue-500 bg-blue-50' : ''

            }`}

          >

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">

                <Calendar className="text-purple-600" size={20} />

              </div>

              <div>

                <p className="text-sm text-gray-600">DRAYAGE</p>

                <p className="text-xl font-bold text-gray-800">{drayageCount}</p>

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

              console.log("Create Load button clicked!"); // Debug log

              resetLoadForm();                 // ✅ clear everything first

              setShowLoadCreationModal(true);  // then open the modal

              console.log("Modal should be opening..."); // Debug log

            }}

            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"

          >

            <PlusCircle className="w-4 h-4" />

            {activeTab === 'ALL' ? 'Add Loads' : `Create ${activeTab} Load`}

          </button>



        </div>



      </div>



      {/* Active Tab Indicator */}

      <div className="mb-4">

        <div className="flex items-center gap-2 text-sm text-gray-600">

          <span>Showing:</span>

          <span className={`px-3 py-1 rounded-full text-xs font-medium ${

            activeTab === 'ALL' ? 'bg-green-100 text-green-700' :

            activeTab === 'OTR' ? 'bg-blue-100 text-blue-700' :

            'bg-purple-100 text-purple-700'

          }`}>

            {activeTab === 'ALL' ? 'All Loads' : `${activeTab} Loads`}

          </span>

          <span className="text-gray-400">({filteredLoads.length} of {loads.length} loads)</span>

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

                <CheckCircle size={18} /> Accept

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

              <div className="flex items-center gap-2 text-gray-700">

                <Calendar size={16} /> <span className="font-medium">Created:</span> {formatDateTimeDisplay(selectedLoad.createdAt)}

              </div>



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

                      selectedLoad.status === 'pending-approval' || selectedLoad.status === 'pending approval' ? 'Pending Approval' :

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

            <table className="w-full table-fixed">

              <thead className="bg-gradient-to-r from-gray-100 to-gray-200">

                <tr>

                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide w-32">Load ID</th>

                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide w-80">Origin</th>

                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide w-80">Destination</th>

                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide w-24">Rate</th>

                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide w-32">Status</th>

                  <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide w-48">Action</th>

                </tr>

              </thead>

              <tbody>

                {currentLoads.map((load, index) => (

                  <tr key={load.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>

                    <td className="py-2 px-3 w-32">

                      <span className="font-medium text-gray-700 text-sm">{load.id}</span>

                    </td>

                    <td className="py-2 px-3 w-80">

                      <span className="font-medium text-gray-700 text-sm leading-relaxed" title={load.origin}>

                        {load.origin}

                      </span>

                    </td>

                    <td className="py-2 px-3 w-80">

                      <span className="font-medium text-gray-700 text-sm leading-relaxed" title={load.destination}>

                        {load.destination}

                      </span>

                    </td>

                    <td className="py-2 px-3 w-24">

                      <span className="font-bold text-green-600 text-sm">${load.rate.toLocaleString()}</span>

                    </td>

                    <td className="py-2 px-3 w-32">

                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${statusColor(load.status)}`}>

                        {(load.status === 'available' || load.status === 'posted' || load.status === 'bidding') && <CheckCircle size={12} />}

                        {load.status === 'assigned' && <Clock size={12} />}

                        {(load.status === 'in-transit' || load.status === 'in transit') && <Truck size={12} />}

                        {load.status === 'completed' || load.status === 'delivered' ? 'Completed' :

                          load.status === 'in-transit' || load.status === 'in transit' ? 'In Transit' :

                            load.status === 'assigned' ? 'Assigned' :

                              load.status === 'pending-approval' || load.status === 'pending approval' ? 'Pending Approval' :

                                load.status === 'posted' ? 'Posted' :

                                  load.status === 'bidding' ? 'Bidding' :

                                    load.status || 'Available'}

                      </div>

                    </td>

                    <td className="py-2 px-3 w-48">

                      <div className="flex items-center gap-1">

                        <button

                          onClick={() => handleViewLoad(load)}

                          className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs font-medium"

                        >

                          <User size={10} />

                          View

                        </button>

                        <button

                          onClick={() => handleEditLoad(load)}

                          className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-xs font-medium"

                        >

                          <FileText size={10} />

                          Edit

                        </button>

                        <button

                          onClick={() => handleDuplicateLoad(load)}

                          className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-xs font-medium"

                        >

                          <Copy size={10} />

                          Duplicate

                        </button>

                        <button

                          onClick={() => handleDeleteLoad(load)}

                          className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs font-medium"

                        >

                          <XCircle size={10} />

                          Delete

                        </button>

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

            <form onSubmit={handleSubmit} noValidate className="p-6 space-y-6">

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

                    'Create Load'

                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* ✅ ENHANCED MODAL UI */}

      {console.log("showLoadCreationModal state:", showLoadCreationModal)}

      {showLoadCreationModal && (

        <>

          <style>{`

            .modal-scroll::-webkit-scrollbar {

              width: 8px;

            }

            .modal-scroll::-webkit-scrollbar-track {

              background: #f1f5f9;

              border-radius: 4px;

            }

            .modal-scroll::-webkit-scrollbar-thumb {

              background: #cbd5e1;

              border-radius: 4px;

            }

            .modal-scroll::-webkit-scrollbar-thumb:hover {

              background: #94a3b8;

            }

            .modal-scroll {

              scrollbar-width: thin;

              scrollbar-color: #cbd5e1 #f1f5f9;

            }

          `}</style>

          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-center items-center p-4">

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col border border-gray-200">

            

            {/* Clean Header Design */}

            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">

              <div className="flex justify-between items-center">

                <div className="flex items-center gap-4">

                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">

                    <Truck className="text-white" size={24} />

                  </div>

                  <div>

                    <h2 className="text-2xl font-bold">Create New Load</h2>

                    <p className="text-blue-100">Fill in the details to create a new shipment</p>

                  </div>

                </div>

                

                <div className="flex items-center gap-4">

                  {/* Load Type Selector - Fixed */}

                  <div className="flex bg-white/20 rounded-xl p-1">

                    {["OTR", "DRAYAGE"].map((type) => (

                      <button

                        key={type}

                        onClick={() => { if (!creatingDrayage) { setLoadType(type); setFormErrors({}); } }}

                        disabled={creatingDrayage}

                        className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${

                          loadType === type 

                            ? "bg-white text-blue-700 shadow-sm" 

                            : "text-white hover:bg-white/10"

                        } ${creatingDrayage ? "opacity-60 cursor-not-allowed" : ""}`}

                        title={creatingDrayage ? "Submission in progress…" : ""}

                      >

                        {type}

                      </button>

                    ))}

                  </div>

                  

                  {/* Close Button */}

                  <button

                    onClick={() => {

                      setShowLoadCreationModal(false);

                      resetLoadForm();

                    }}

                    className="text-white hover:text-gray-200 text-2xl font-bold p-2 hover:bg-white/10 rounded-lg transition-all duration-200"

                    title="Close Modal"

                  >

                    ×

                  </button>

                </div>

              </div>

            </div>



            {/* Enhanced Form Container - Scrollable */}

            <div className="flex-1 overflow-y-auto bg-gray-50/50 modal-scroll">

              <div className="p-8">

                <form onSubmit={handleLoadSubmit} noValidate className="space-y-8">

                

                {/* Shipper Selection Section */}

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

                  <div className="flex items-center gap-3 mb-4">

                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">

                      <Building className="text-blue-600" size={20} />

                    </div>

                    <h3 className="text-xl font-semibold text-gray-800">Shipper Information</h3>

                  </div>

                  

                  <div>

                    <label className="block text-sm font-semibold text-gray-700 mb-2">

                      Select Shipper <span className="text-red-500">*</span>

                    </label>

                    <div className={`${formErrors.shipperId ? 'border-red-400 bg-red-50' : ''}`}>

                      <MaterialShipperDropdown

                        open={shipperDropdownOpen}

                        setOpen={setShipperDropdownOpen}

                        options={shippers}

                        searchQuery={shipperSearchQuery}

                        setSearchQuery={setShipperSearchQuery}

                        onSelect={handleShipperSelect}

                        inputValue={shipperInputValue}

                        setInputValue={setShipperInputValue}

                      />

                    </div>

                    {formErrors.shipperId && (

                      <div className="flex items-center gap-2 mt-2">

                        <XCircle className="text-red-500" size={16} />

                        <p className="text-sm text-red-600">{formErrors.shipperId}</p>

                      </div>

                    )}

                  </div>

                </div>



                {/* Location Information Section */}

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

                  <div className="flex items-center gap-3 mb-6">

                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">

                      <MapPin className="text-green-600" size={20} />

                    </div>

                    <h3 className="text-xl font-semibold text-gray-800">Location Details</h3>

                  </div>

                  

                  {loadType === "OTR" ? (

                    /* OTR - Multiple Pickup and Delivery Locations */

                    <div className="space-y-8">

                      {/* Multiple Pickup Locations */}

                      <div>

                        <div className="flex items-center justify-between mb-4">

                          <div className="flex items-center gap-2">

                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>

                            <h4 className="font-semibold text-gray-700">Pickup Locations</h4>

                          </div>

                          <button

                            type="button"

                            onClick={addPickupLocation}

                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"

                          >

                            <Plus size={16} />

                            Add Pickup Location

                          </button>

                        </div>

                        

                        {pickupLocations.length === 0 ? (

                          <div className="text-center py-8 text-gray-500">

                            <MapPin size={48} className="mx-auto mb-4 text-gray-300" />

                            <p>No pickup locations added yet</p>

                            <p className="text-sm">Click "Add Pickup Location" to get started</p>

                          </div>

                        ) : (

                          <div className="space-y-4">

                            {pickupLocations.map((location, index) => (

                              <div key={location.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50">

                                <div className="flex items-center justify-between mb-4">

                                  <h5 className="font-medium text-gray-700">Pickup Location {index + 1}</h5>

                                  <button

                                    type="button"

                                    onClick={() => removePickupLocation(location.id)}

                                    className="text-red-500 hover:text-red-700"

                                  >

                                    <XCircle size={20} />

                                  </button>

                                </div>

                                

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                                  



                                  <div>

                                    <label className="block text-sm font-medium text-gray-700 mb-1">

                                      Pickup Address <span className="text-red-500">*</span>

                                    </label>

                                    <input

                                      type="text"

                                      value={location.address}

                                      onChange={(e) => handleLocationAddressChange(location.id, e.target.value, 'pickup')}

                                      placeholder="Enter full address"

                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                                    />

                                  </div>

                                  

                                  <div>

                                    <label className="block text-sm font-medium text-gray-700 mb-1">

                                      City <span className="text-red-500">*</span>

                                    </label>

                                    <input

                                      type="text"

                                      value={location.city}

                                      onChange={(e) => updatePickupLocation(location.id, 'city', e.target.value)}

                                      placeholder="Enter city"

                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                                    />

                                  </div>

                                  

                                  <div>

                                    <label className="block text-sm font-medium text-gray-700 mb-1">

                                      State <span className="text-red-500">*</span>

                                    </label>

                                    <input

                                      type="text"

                                      value={location.state}

                                      onChange={(e) => updatePickupLocation(location.id, 'state', e.target.value)}

                                      placeholder="Enter state"

                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                                    />

                                  </div>

                                  <div className="relative">

                                    <label className="block text-sm font-medium text-gray-700 mb-1">

                                      ZIP Code <span className="text-red-500">*</span>

                                    </label>

                                    <input

                                      type="text"

                                      value={location.zip || ''}

                                      onChange={(e) => handleLocationZipChange(location.id, e.target.value, 'pickup')}

                                      onFocus={() => pickupZipOptions[location.id]?.length && setShowPickupZipDD(prev => ({ ...prev, [location.id]: true }))}

                                      onBlur={() => setTimeout(() => setShowPickupZipDD(prev => ({ ...prev, [location.id]: false })), 150)}

                                      placeholder="Enter ZIP code"

                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                                    />

                                    <SearchableZipDropdown

                                      which="pickup"

                                      open={showPickupZipDD[location.id] || false}

                                      setOpen={(open) => setShowPickupZipDD(prev => ({ ...prev, [location.id]: open }))}

                                      options={pickupZipOptions[location.id] || []}

                                      query={pickupZipQueries[location.id] || ""}

                                      setQuery={(query) => setPickupZipQueries(prev => ({ ...prev, [location.id]: query }))}

                                      onSelect={(which, item) => applyZipToLocation(location.id, item, 'pickup')}

                                    />

                                  </div>

                                  

                                  <div>

                                    <label className="block text-sm font-medium text-gray-700 mb-1">

                                      Weight (lbs) <span className="text-red-500">*</span>

                                    </label>

                                    <input

                                      type="text"

                                      value={location.weight}

                                      onChange={(e) => updatePickupLocation(location.id, 'weight', e.target.value)}

                                      placeholder="Enter weight"

                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                                    />

                                  </div>

                                  

                                  <div>

                                    <label className="block text-sm font-medium text-gray-700 mb-1">

                                      Commodity

                                    </label>

                                    <input

                                      type="text"

                                      value={location.commodity}

                                      onChange={(e) => updatePickupLocation(location.id, 'commodity', e.target.value)}

                                      placeholder="Enter commodity"

                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                                    />

                                  </div>

                                  

                                  <div>

                                    <label className="block text-sm font-medium text-gray-700 mb-1">

                                      Pickup Date <span className="text-red-500">*</span>

                                    </label>

                                    <input

                                      type="datetime-local"

                                      value={location.pickupDate}

                                      onChange={(e) => updatePickupLocation(location.id, 'pickupDate', e.target.value)}

                                      min={todayStr()}

                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                                    />

                                  </div>

                                  

                                  <div>

                                    <label className="block text-sm font-medium text-gray-700 mb-1">

                                      Delivery Date <span className="text-red-500">*</span>

                                    </label>

                                    <input

                                      type="datetime-local"

                                      value={location.deliveryDate}

                                      onChange={(e) => updatePickupLocation(location.id, 'deliveryDate', e.target.value)}

                                      min={location.pickupDate || todayStr()}

                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                                    />

                                  </div>

                                </div>

                              </div>

                            ))}

                          </div>

                        )}

                      </div>



                      {/* Multiple Delivery Locations */}

                      <div>

                        <div className="flex items-center justify-between mb-4">

                          <div className="flex items-center gap-2">

                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>

                            <h4 className="font-semibold text-gray-700">Delivery Locations</h4>

                          </div>

                          <button

                            type="button"

                            onClick={addDeliveryLocation}

                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"

                          >

                            <Plus size={16} />

                            Add Delivery Location

                          </button>

                        </div>

                        

                        {deliveryLocations.length === 0 ? (

                          <div className="text-center py-8 text-gray-500">

                            <MapPin size={48} className="mx-auto mb-4 text-gray-300" />

                            <p>No delivery locations added yet</p>

                            <p className="text-sm">Click "Add Delivery Location" to get started</p>

                          </div>

                        ) : (

                          <div className="space-y-4">

                            {deliveryLocations.map((location, index) => (

                              <div key={location.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50">

                                <div className="flex items-center justify-between mb-4">

                                  <h5 className="font-medium text-gray-700">Delivery Location {index + 1}</h5>

                                  <button

                                    type="button"

                                    onClick={() => removeDeliveryLocation(location.id)}

                                    className="text-red-500 hover:text-red-700"

                                  >

                                    <XCircle size={20} />

                                  </button>

                                </div>

                                

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                                  



                                  <div>

                                    <label className="block text-sm font-medium text-gray-700 mb-1">

                                      Delivery Address <span className="text-red-500">*</span>

                                    </label>

                                    <input

                                      type="text"

                                      value={location.address}

                                      onChange={(e) => handleLocationAddressChange(location.id, e.target.value, 'delivery')}

                                      placeholder="Enter full address"

                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                                    />

                                  </div>

                                  

                                  <div>

                                    <label className="block text-sm font-medium text-gray-700 mb-1">

                                      City <span className="text-red-500">*</span>

                                    </label>

                                    <input

                                      type="text"

                                      value={location.city}

                                      onChange={(e) => updateDeliveryLocation(location.id, 'city', e.target.value)}

                                      placeholder="Enter city"

                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                                    />

                                  </div>

                                  

                                  <div>

                                    <label className="block text-sm font-medium text-gray-700 mb-1">

                                      State <span className="text-red-500">*</span>

                                    </label>

                                    <input

                                      type="text"

                                      value={location.state}

                                      onChange={(e) => updateDeliveryLocation(location.id, 'state', e.target.value)}

                                      placeholder="Enter state"

                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                                    />

                                  </div>

                                  <div className="relative">

                                    <label className="block text-sm font-medium text-gray-700 mb-1">

                                      ZIP Code <span className="text-red-500">*</span>

                                    </label>

                                    <input

                                      type="text"

                                      value={location.zip || ''}

                                      onChange={(e) => handleLocationZipChange(location.id, e.target.value, 'delivery')}

                                      onFocus={() => deliveryZipOptions[location.id]?.length && setShowDeliveryZipDD(prev => ({ ...prev, [location.id]: true }))}

                                      onBlur={() => setTimeout(() => setShowDeliveryZipDD(prev => ({ ...prev, [location.id]: false })), 150)}

                                      placeholder="Enter ZIP code"

                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                                    />

                                    <SearchableZipDropdown

                                      which="delivery"

                                      open={showDeliveryZipDD[location.id] || false}

                                      setOpen={(open) => setShowDeliveryZipDD(prev => ({ ...prev, [location.id]: open }))}

                                      options={deliveryZipOptions[location.id] || []}

                                      query={deliveryZipQueries[location.id] || ""}

                                      setQuery={(query) => setDeliveryZipQueries(prev => ({ ...prev, [location.id]: query }))}

                                      onSelect={(which, item) => applyZipToLocation(location.id, item, 'delivery')}

                                    />

                                  </div>

                                  <div>

                                    <label className="block text-sm font-medium text-gray-700 mb-1">

                                      Weight (lbs) <span className="text-red-500">*</span>

                                    </label>

                                    <input

                                      type="text"

                                      value={location.weight}

                                      onChange={(e) => updateDeliveryLocation(location.id, 'weight', e.target.value)}

                                      placeholder="Enter weight"

                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                                    />

                                  </div>

                                  

                                  <div>

                                    <label className="block text-sm font-medium text-gray-700 mb-1">

                                      Commodity

                                    </label>

                                    <input

                                      type="text"

                                      value={location.commodity}

                                      onChange={(e) => updateDeliveryLocation(location.id, 'commodity', e.target.value)}

                                      placeholder="Enter commodity"

                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                                    />

                                  </div>

                                  

                                  <div>

                                    <label className="block text-sm font-medium text-gray-700 mb-1">

                                      Delivery Date <span className="text-red-500">*</span>

                                    </label>

                                    <input

                                      type="datetime-local"

                                      value={location.deliveryDate}

                                      onChange={(e) => updateDeliveryLocation(location.id, 'deliveryDate', e.target.value)}

                                      min={todayStr()}

                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                                    />

                                  </div>

                                </div>

                              </div>

                            ))}

                          </div>

                        )}

                      </div>

                    </div>

                  ) : (

                    /* DRAYAGE - Single Pickup and Loading/Unloading Location */

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                      {/* Pickup Location */}

                      <div className="space-y-4">

                        <div className="flex items-center gap-2 mb-3">

                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>

                          <h4 className="font-semibold text-gray-700">Pickup Location</h4>

                        </div>

                        

                        



                        <div>

                          <label className="block text-sm font-semibold text-gray-700 mb-2">

                            Pickup Full Address <span className="text-red-500">*</span>

                          </label>

                          <input

                            ref={(el) => (fieldRefs.current['fromAddress'] = el)}

                            name="fromAddress"

                            value={loadForm.fromAddress}

                            onChange={handleChange}

                            placeholder="Select from dropdown or type full address"

                            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                              formErrors.fromAddress ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                            }`}

                          />

                          {formErrors.fromAddress && (

                            <div className="flex items-center gap-2 mt-2">

                              <XCircle className="text-red-500" size={16} />

                              <p className="text-sm text-red-600">{formErrors.fromAddress}</p>

                            </div>

                          )}

                        </div>



                        <div>

                          <label className="block text-sm font-semibold text-gray-700 mb-2">

                            City <span className="text-red-500">*</span>

                          </label>

                          <input

                            ref={(el) => (fieldRefs.current['fromCity'] = el)}

                            name="fromCity"

                            value={loadForm.fromCity}

                            onChange={handleChange}

                            placeholder="Auto-filled from ZIP (editable)"

                            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                              formErrors.fromCity ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                            }`}

                          />

                          {formErrors.fromCity && (

                            <div className="flex items-center gap-2 mt-2">

                              <XCircle className="text-red-500" size={16} />

                              <p className="text-sm text-red-600">{formErrors.fromCity}</p>

                            </div>

                          )}

                        </div>



                        <div>

                          <label className="block text-sm font-semibold text-gray-700 mb-2">

                            State <span className="text-red-500">*</span>

                          </label>

                          <input

                            ref={(el) => (fieldRefs.current['fromState'] = el)}

                            name="fromState"

                            value={loadForm.fromState}

                            onChange={handleChange}

                            placeholder="Auto-filled from ZIP (editable, e.g., NJ)"

                            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                              formErrors.fromState ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                            }`}

                          />

                          {formErrors.fromState && (

                            <div className="flex items-center gap-2 mt-2">

                              <XCircle className="text-red-500" size={16} />

                              <p className="text-sm text-red-600">{formErrors.fromState}</p>

                            </div>

                          )}

                        </div>

                      </div>

                      <div className="relative">

                          <label className="block text-sm font-semibold text-gray-700 mb-2">

                            ZIP Code <span className="text-red-500">*</span>

                          </label>

                          <input

                            ref={(el) => (fieldRefs.current['fromZip'] = el)}

                            name="fromZip"

                            placeholder="Enter 5-digit ZIP code"

                            value={loadForm.fromZip}

                            onChange={handleChange}

                            onFocus={() => fromZipOptions.length && setShowFromZipDD(true)}

                            onBlur={() => setTimeout(() => setShowFromZipDD(false), 150)}

                            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                              formErrors.fromZip ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                            }`}

                          />

                          {formErrors.fromZip && (

                            <div className="flex items-center gap-2 mt-2">

                              <XCircle className="text-red-500" size={16} />

                              <p className="text-sm text-red-600">{formErrors.fromZip}</p>

                            </div>

                          )}

                          <SearchableZipDropdown

                            which="from"

                            open={showFromZipDD}

                            setOpen={setShowFromZipDD}

                            options={fromZipOptions}

                            query={fromZipQuery}

                            setQuery={setFromZipQuery}

                            onSelect={applyZipSelection}

                          />

                        </div>



                      {/* Loading/Unloading Location */}

                      <div className="space-y-4">

                        <div className="flex items-center gap-2 mb-3">

                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>

                          <h4 className="font-semibold text-gray-700">Loading/Unloading Location</h4>

                        </div>

                        

                        



                        <div>

                          <label className="block text-sm font-semibold text-gray-700 mb-2">

                            Loading/Unloading Full Address <span className="text-red-500">*</span>

                          </label>

                          <input

                            ref={(el) => (fieldRefs.current['toAddress'] = el)}

                            name="toAddress"

                            value={loadForm.toAddress}

                            onChange={handleChange}

                            placeholder="Select from dropdown or type full address"

                            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                              formErrors.toAddress ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                            }`}

                          />

                          {formErrors.toAddress && (

                            <div className="flex items-center gap-2 mt-2">

                              <XCircle className="text-red-500" size={16} />

                              <p className="text-sm text-red-600">{formErrors.toAddress}</p>

                            </div>

                          )}

                        </div>



                        <div>

                          <label className="block text-sm font-semibold text-gray-700 mb-2">

                            City <span className="text-red-500">*</span>

                          </label>

                          <input

                            ref={(el) => (fieldRefs.current['toCity'] = el)}

                            name="toCity"

                            value={loadForm.toCity}

                            onChange={handleChange}

                            placeholder="Auto-filled from ZIP (editable)"

                            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                              formErrors.toCity ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                            }`}

                          />

                          {formErrors.toCity && (

                            <div className="flex items-center gap-2 mt-2">

                              <XCircle className="text-red-500" size={16} />

                              <p className="text-sm text-red-600">{formErrors.toCity}</p>

                            </div>

                          )}

                        </div>



                        <div>

                          <label className="block text-sm font-semibold text-gray-700 mb-2">

                            State <span className="text-red-500">*</span>

                          </label>

                          <input

                            ref={(el) => (fieldRefs.current['toState'] = el)}

                            name="toState"

                            value={loadForm.toState}

                            onChange={handleChange}

                            placeholder="Auto-filled from ZIP (editable, e.g., AZ)"

                            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                              formErrors.toState ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                            }`}

                          />

                          {formErrors.toState && (

                            <div className="flex items-center gap-2 mt-2">

                              <XCircle className="text-red-500" size={16} />

                              <p className="text-sm text-red-600">{formErrors.toState}</p>

                            </div>

                          )}

                        </div>

                      </div>

                      <div className="relative">

                          <label className="block text-sm font-semibold text-gray-700 mb-2">

                            ZIP Code <span className="text-red-500">*</span>

                          </label>

                          <input

                            ref={(el) => (fieldRefs.current['toZip'] = el)}

                            name="toZip"

                            placeholder="Enter 5-digit ZIP code"

                            value={loadForm.toZip}

                            onChange={handleChange}

                            onFocus={() => toZipOptions.length && setShowToZipDD(true)}

                            onBlur={() => setTimeout(() => setShowToZipDD(false), 150)}

                            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                              formErrors.toZip ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                            }`}

                          />

                          {formErrors.toZip && (

                            <div className="flex items-center gap-2 mt-2">

                              <XCircle className="text-red-500" size={16} />

                              <p className="text-sm text-red-600">{formErrors.toZip}</p>

                            </div>

                          )}

                          <SearchableZipDropdown

                            which="to"

                            open={showToZipDD}

                            setOpen={setShowToZipDD}

                            options={toZipOptions}

                            query={toZipQuery}

                            setQuery={setToZipQuery}

                            onSelect={applyZipSelection}

                          />

                        </div>



                      {/* Drayage Details - Moved under Loading/Unloading Location */}

                      <div className="mt-6 pt-6 border-t border-gray-200">

                        <div className="flex items-center gap-2 mb-4">

                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>

                          <h4 className="font-semibold text-gray-700">Return Location</h4>

                        </div>

                        

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                          



                          <div>

                            <label className="block text-sm font-semibold text-gray-700 mb-2">

                              Return Full Address <span className="text-red-500">*</span>

                            </label>

                            <input

                              ref={(el) => (fieldRefs.current['returnAddress'] = el)}

                              name="returnAddress"

                              value={loadForm.returnAddress}

                              onChange={handleChange}

                              placeholder="Enter full address"

                              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                                formErrors.returnAddress ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                              }`}

                            />

                            {formErrors.returnAddress && (

                              <div className="flex items-center gap-2 mt-2">

                                <XCircle className="text-red-500" size={16} />

                                <p className="text-sm text-red-600">{formErrors.returnAddress}</p>

                              </div>

                            )}

                          </div>



                          <div>

                            <label className="block text-sm font-semibold text-gray-700 mb-2">

                              City <span className="text-red-500">*</span>

                            </label>

                            <input

                              ref={(el) => (fieldRefs.current['returnCity'] = el)}

                              name="returnCity"

                              value={loadForm.returnCity}

                              onChange={handleChange}

                              placeholder="Enter city"

                              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                                formErrors.returnCity ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                              }`}

                            />

                            {formErrors.returnCity && (

                              <div className="flex items-center gap-2 mt-2">

                                <XCircle className="text-red-500" size={16} />

                                <p className="text-sm text-red-600">{formErrors.returnCity}</p>

                              </div>

                            )}

                          </div>



                          <div>

                            <label className="block text-sm font-semibold text-gray-700 mb-2">

                              State <span className="text-red-500">*</span>

                            </label>

                            <input

                              ref={(el) => (fieldRefs.current['returnState'] = el)}

                              name="returnState"

                              value={loadForm.returnState}

                              onChange={handleChange}

                              placeholder="Enter state (e.g., CA)"

                              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                                formErrors.returnState ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                              }`}

                            />

                            {formErrors.returnState && (

                              <div className="flex items-center gap-2 mt-2">

                                <XCircle className="text-red-500" size={16} />

                                <p className="text-sm text-red-600">{formErrors.returnState}</p>

                              </div>

                            )}

                          </div>

                          <div>

                            <label className="block text-sm font-semibold text-gray-700 mb-2">

                               ZIP Code <span className="text-red-500">*</span>

                            </label>

                          <input

                              ref={(el) => (fieldRefs.current['returnZip'] = el)}

                              name="returnZip"

                              value={loadForm.returnZip}

                            onChange={handleChange}

                            onFocus={() => returnZipOptions.length && setShowReturnZipDD(true)}

                            onBlur={() => setTimeout(() => setShowReturnZipDD(false), 150)}

                            placeholder="Enter 5-digit ZIP code"

                              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                                formErrors.returnZip ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                              }`}

                            />

                            {formErrors.returnZip && (

                              <div className="flex items-center gap-2 mt-2">

                                <XCircle className="text-red-500" size={16} />

                                <p className="text-sm text-red-600">{formErrors.returnZip}</p>

                              </div>

                            )}

                          <SearchableZipDropdown

                            which="return"

                            open={showReturnZipDD}

                            setOpen={setShowReturnZipDD}

                            options={returnZipOptions}

                            query={returnZipQuery}

                            setQuery={setReturnZipQuery}

                            onSelect={applyZipSelection}

                          />

                          </div>

                        </div>

                      </div>

                    </div>

                  )}

                </div>





                {/* Load Details Section */}

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

                  <div className="flex items-center gap-3 mb-6">

                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">

                      <Truck className="text-purple-600" size={20} />

                    </div>

                    <h3 className="text-xl font-semibold text-gray-800">Load Details</h3>

                  </div>

                  

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    <div>

                      <label className="block text-sm font-semibold text-gray-700 mb-2">

                        Vehicle Type <span className="text-red-500">*</span>

                      </label>

                      <div className={`${formErrors.vehicleType ? 'border-red-400 bg-red-50' : ''}`}>

                        <VehicleTypeDropdown

                          open={vehicleTypeDropdownOpen}

                          setOpen={setVehicleTypeDropdownOpen}

                          options={vehicleTypeOptions}

                          searchQuery={vehicleTypeSearchQuery}

                          setSearchQuery={setVehicleTypeSearchQuery}

                          onSelect={handleVehicleTypeSelect}

                          inputValue={loadForm.vehicleType}

                          setInputValue={(value) => setLoadForm(prev => ({ ...prev, vehicleType: value }))}

                        />

                      </div>

                      {formErrors.vehicleType && (

                        <div className="flex items-center gap-2 mt-2">

                          <XCircle className="text-red-500" size={16} />

                          <p className="text-sm text-red-600">{formErrors.vehicleType}</p>

                        </div>

                      )}

                    </div>

                    

                    {/* Rate Fields: Line Haul, FSC, Other */}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 col-span-2">

                      <div>

                        <label className="block text-sm font-semibold text-gray-700 mb-2">

                          Line Haul ($)

                        </label>

                        <input

                          ref={(el) => (fieldRefs.current['lineHaul'] = el)}

                          name="lineHaul"

                          inputMode="decimal"

                          placeholder="e.g., 1500 or 1500.50"

                          value={loadForm.lineHaul}

                          onChange={handleChange}

                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                            formErrors.lineHaul ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                          }`}

                        />

                        {formErrors.lineHaul && (

                          <div className="flex items-center gap-2 mt-2">

                            <XCircle className="text-red-500" size={16} />

                            <p className="text-sm text-red-600">{formErrors.lineHaul}</p>

                          </div>

                        )}

                      </div>

                      

                      <div>

                        <label className="block text-sm font-semibold text-gray-700 mb-2">

                          FSC (%)

                        </label>

                        <input

                          ref={(el) => (fieldRefs.current['fsc'] = el)}

                          name="fsc"

                          inputMode="decimal"

                          placeholder="e.g., 10 for 10%"
                          value={loadForm.fsc}

                          onChange={handleChange}

                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                            formErrors.fsc ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                          }`}

                        />

                        {formErrors.fsc && (

                          <div className="flex items-center gap-2 mt-2">

                            <XCircle className="text-red-500" size={16} />

                            <p className="text-sm text-red-600">{formErrors.fsc}</p>

                          </div>

                        )}

                      </div>

                      

                      <div>

                        <label className="block text-sm font-semibold text-gray-700 mb-2">

                          Other accessorials ($)

                        </label>

                        <input

                          ref={(el) => (fieldRefs.current['other'] = el)}

                          name="other"

                          readOnly

                          onClick={() => setShowChargesCalculator(true)}

                          placeholder="Click to add charges"

                          value={loadForm.other || ''}

                          className={`w-full px-4 py-3 border-2 rounded-xl cursor-pointer bg-white hover:border-blue-400 transition-all duration-200 ${

                            formErrors.other ? 'border-red-400 bg-red-50' : 'border-gray-200'

                          }`}

                        />

                        {formErrors.other && (

                          <div className="flex items-center gap-2 mt-2">

                            <XCircle className="text-red-500" size={16} />

                            <p className="text-sm text-red-600">{formErrors.other}</p>

                          </div>

                        )}

                      </div>

                    </div>

                    

                    {/* Total Rate Display */}

                    <div className="col-span-2">

                      <label className="block text-sm font-semibold text-gray-700 mb-2">

                        Total Rate ($)

                      </label>

                      <div className="w-full px-4 py-3 border-2 rounded-xl bg-gray-50 border-gray-300 font-semibold text-gray-700">

                        ${(() => {

                          const lineHaul = parseFloat(String(loadForm.lineHaul || '0').replace(/\.$/, '')) || 0;

                          const fsc = parseFloat(String(loadForm.fsc || '0').replace(/\.$/, '')) || 0;

                          const fscAmount = lineHaul * (fsc / 100); // FSC is a percentage of lineHaul
                          const other = parseFloat(String(loadForm.other || '0').replace(/\.$/, '')) || 0;

                          const total = lineHaul + fscAmount + other;
                          return total.toFixed(2);

                        })()}

                      </div>

                    </div>



                    {loadType === 'DRAYAGE' && (

                      <>

                        <div>

                          <label className="block text-sm font-semibold text-gray-700 mb-2">

                            Weight (lbs) <span className="text-red-500">*</span>

                          </label>

                          <input

                            ref={(el) => (fieldRefs.current['weight'] = el)}

                            name="weight"

                            placeholder="e.g., 25000"

                            value={loadForm.weight}

                            onChange={handleChange}

                            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                              formErrors.weight ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                            }`}

                          />

                          {formErrors.weight && (

                            <div className="flex items-center gap-2 mt-2">

                              <XCircle className="text-red-500" size={16} />

                              <p className="text-sm text-red-600">{formErrors.weight}</p>

                            </div>

                          )}

                        </div>



                        <div>

                          <label className="block text-sm font-semibold text-gray-700 mb-2">

                            Commodity <span className="text-red-500">*</span>

                          </label>

                          <input

                            ref={(el) => (fieldRefs.current['commodity'] = el)}

                            name="commodity"

                            placeholder="e.g., Electronics, Furniture"

                            value={loadForm.commodity}

                            onChange={handleChange}

                            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                              formErrors.commodity ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                            }`}

                          />

                          {formErrors.commodity && (

                            <div className="flex items-center gap-2 mt-2">

                              <XCircle className="text-red-500" size={16} />

                              <p className="text-sm text-red-600">{formErrors.commodity}</p>

                            </div>

                          )}

                        </div>

                      </>

                    )}

                  </div>

                </div>



                {/* Schedule Section */}

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

                  <div className="flex items-center gap-3 mb-6">

                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">

                      <Calendar className="text-indigo-600" size={20} />

                    </div>

                    <h3 className="text-xl font-semibold text-gray-800">Schedule & Timeline</h3>

                  </div>

                  

                  {loadType === "DRAYAGE" ? (

                    /* DRAYAGE - Show Pickup Date, Delivery Date, and Bid Deadline */

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                      <div onClick={() => openDatePicker('pickupDate')} className="cursor-pointer">

                        <label className="block text-sm font-semibold text-gray-700 mb-2">

                          Pickup Date <span className="text-red-500">*</span>

                        </label>

                        <input

                          ref={(el) => (fieldRefs.current['pickupDate'] = el)}

                          type="datetime-local"

                          name="pickupDate"

                          value={loadForm.pickupDate}

                          onChange={handleChange}

                          min={todayStr()}

                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 cursor-pointer ${

                            formErrors.pickupDate ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                          }`}

                          onClick={(e) => e.target.showPicker?.()}

                        />

                        {formErrors.pickupDate && (

                          <div className="flex items-center gap-2 mt-2">

                            <XCircle className="text-red-500" size={16} />

                            <p className="text-sm text-red-600">{formErrors.pickupDate}</p>

                          </div>

                        )}

                      </div>



                      <div onClick={() => openDatePicker('deliveryDate')} className="cursor-pointer">

                        <label className="block text-sm font-semibold text-gray-700 mb-2">

                          Delivery Date <span className="text-red-500">*</span>

                        </label>

                        <input

                          ref={(el) => (fieldRefs.current['deliveryDate'] = el)}

                          type="datetime-local"

                          name="deliveryDate"

                          value={loadForm.deliveryDate}

                          onChange={handleChange}

                          min={loadForm.pickupDate || todayStr()}

                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 cursor-pointer ${

                            formErrors.deliveryDate ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                          }`}

                          onClick={(e) => e.target.showPicker?.()}

                        />

                        {formErrors.deliveryDate && (

                          <div className="flex items-center gap-2 mt-2">

                            <XCircle className="text-red-500" size={16} />

                            <p className="text-sm text-red-600">{formErrors.deliveryDate}</p>

                          </div>

                        )}

                      </div>

                      <div onClick={() => openDatePicker('returnDate')} className="cursor-pointer">

                            <label className="block text-sm font-semibold text-gray-700 mb-2">

                              Return Date <span className="text-red-500">*</span>

                            </label>

                            <input

                              ref={(el) => (fieldRefs.current['returnDate'] = el)}

                              type="datetime-local"

                              name="returnDate"

                              value={loadForm.returnDate}

                              onChange={handleChange}

                              min={todayStr()}

                              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 cursor-pointer ${

                                formErrors.returnDate ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                              }`}

                              onClick={(e) => e.target.showPicker?.()}

                            />

                            {formErrors.returnDate && (

                              <div className="flex items-center gap-2 mt-2">

                                <XCircle className="text-red-500" size={16} />

                                <p className="text-sm text-red-600">{formErrors.returnDate}</p>

                              </div>

                            )}

                          </div>



                      <div onClick={() => openDatePicker('bidDeadline')} className="cursor-pointer">

                        <label className="block text-sm font-semibold text-gray-700 mb-2">

                          Bid Deadline <span className="text-red-500">*</span>

                        </label>

                        <input

                          ref={(el) => (fieldRefs.current['bidDeadline'] = el)}

                          type="datetime-local"

                          name="bidDeadline"

                          value={loadForm.bidDeadline}

                          onChange={handleChange}

                          min={todayStr()}

                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 cursor-pointer ${

                            formErrors.bidDeadline ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                          }`}

                          onClick={(e) => e.target.showPicker?.()}

                        />

                        {formErrors.bidDeadline && (

                          <div className="flex items-center gap-2 mt-2">

                            <XCircle className="text-red-500" size={16} />

                            <p className="text-sm text-red-600">{formErrors.bidDeadline}</p>

                          </div>

                        )}

                      </div>

                    </div>

                  ) : (

                    /* OTR - Show only Bid Deadline */

                    <div className="grid grid-cols-1 md:grid-cols-1 gap-6">

                      <div onClick={() => openDatePicker('bidDeadline')} className="cursor-pointer">

                        <label className="block text-sm font-semibold text-gray-700 mb-2">

                          Bid Deadline <span className="text-red-500">*</span>

                        </label>

                        <input

                          ref={(el) => (fieldRefs.current['bidDeadline'] = el)}

                          type="datetime-local"

                          name="bidDeadline"

                          value={loadForm.bidDeadline}

                          onChange={handleChange}

                          min={todayStr()}

                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 cursor-pointer ${

                            formErrors.bidDeadline ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                          }`}

                          onClick={(e) => e.target.showPicker?.()}

                        />

                        {formErrors.bidDeadline && (

                          <div className="flex items-center gap-2 mt-2">

                            <XCircle className="text-red-500" size={16} />

                            <p className="text-sm text-red-600">{formErrors.bidDeadline}</p>

                          </div>

                        )}

                      </div>

                    </div>

                  )}

                </div>



                {/* Additional Details Section */}

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

                  <div className="flex items-center gap-3 mb-6">

                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">

                      <FileText className="text-orange-600" size={20} />

                    </div>

                    <h3 className="text-xl font-semibold text-gray-800">Additional Details</h3>

                  </div>

                  

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {loadType === 'DRAYAGE' && (

                    <div>

                      <label className="block text-sm font-semibold text-gray-700 mb-2">

                        Container No

                      </label>

                      <input

                        ref={(el) => (fieldRefs.current['containerNo'] = el)}

                        name="containerNo"

                        value={loadForm.containerNo || ''}

                        onChange={handleChange}

                        placeholder="Alphanumeric only"

                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                          formErrors.containerNo ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                        }`}

                      />

                      {formErrors.containerNo && (

                        <div className="flex items-center gap-2 mt-2">

                          <XCircle className="text-red-500" size={16} />

                          <p className="text-sm text-red-600">{formErrors.containerNo}</p>

                        </div>

                      )}

                    </div>

                    )}

                    

                    <div>

                      <label className="block text-sm font-semibold text-gray-700 mb-2">

                        PO Number

                      </label>

                      <input

                        ref={(el) => (fieldRefs.current['poNumber'] = el)}

                        name="poNumber"

                        value={loadForm.poNumber || ''}

                        onChange={handleChange}

                        placeholder="Alphanumeric only"

                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                          formErrors.poNumber ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                        }`}

                      />

                      {formErrors.poNumber && (

                        <div className="flex items-center gap-2 mt-2">

                          <XCircle className="text-red-500" size={16} />

                          <p className="text-sm text-red-600">{formErrors.poNumber}</p>

                        </div>

                      )}

                    </div>

                    

                    <div>

                      <label className="block text-sm font-semibold text-gray-700 mb-2">

                        BOL Number

                      </label>

                      <input

                        ref={(el) => (fieldRefs.current['bolNumber'] = el)}

                        name="bolNumber"

                        value={loadForm.bolNumber || ''}

                        onChange={handleChange}

                        placeholder="Alphanumeric only"

                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                          formErrors.bolNumber ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                        }`}

                      />

                      {formErrors.bolNumber && (

                        <div className="flex items-center gap-2 mt-2">

                          <XCircle className="text-red-500" size={16} />

                          <p className="text-sm text-red-600">{formErrors.bolNumber}</p>

                        </div>

                      )}

                    </div>

                    

                    {loadType !== 'DRAYAGE' && (

                      <div>

                        <label className="block text-sm font-semibold text-gray-700 mb-2">

                          Rate Type

                        </label>

                        <input

                          ref={(el) => (fieldRefs.current['rateType'] = el)}

                          name="rateType"

                          value={loadForm.rateType}

                          onChange={handleChange}

                          placeholder="e.g., Flat Rate / Per Mile"

                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                            formErrors.rateType ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                          }`}

                        />

                        {formErrors.rateType && (

                          <div className="flex items-center gap-2 mt-2">

                            <XCircle className="text-red-500" size={16} />

                            <p className="text-sm text-red-600">{formErrors.rateType}</p>

                          </div>

                        )}

                      </div>

                    )}

                  </div>

                </div>





                {/* Enhanced Form Actions */}

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

                  <div className="flex justify-between items-center">

                    <div className="flex items-center gap-3">

                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">

                        <CheckCircle className="text-gray-600" size={20} />

                      </div>

                      <div>

                        <h3 className="text-lg font-semibold text-gray-800">Ready to Submit?</h3>

                        <p className="text-sm text-gray-600">Review your information and create the load</p>

                      </div>

                    </div>

                    

                    <div className="flex gap-4">

                      <button

                        type="button"

                        onClick={() => {

                          setShowLoadCreationModal(false);

                          resetLoadForm();

                        }}

                        disabled={creatingLoad || (loadType === "DRAYAGE" && creatingDrayage)}

                        className="px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"

                      >

                        Cancel

                      </button>



                      {(() => {

                        const isSubmitting = creatingLoad || (loadType === "DRAYAGE" && creatingDrayage);

                        return (

                          <button

                            type="submit"

                            disabled={isSubmitting}

                            aria-busy={isSubmitting}

                            onClick={() => console.log("🔥 Submit button clicked!")}

                            className={[

                              "relative inline-flex items-center justify-center gap-3",

                              "px-8 py-3 rounded-xl text-white font-semibold shadow-lg",

                              "bg-gradient-to-r from-blue-600 to-indigo-600",

                              "hover:from-blue-700 hover:to-indigo-700",

                              "transform hover:scale-105 transition-all duration-200",

                              isSubmitting ? "opacity-75 cursor-not-allowed" : "",

                              "min-w-[180px]"

                            ].join(" ")}

                            title={loadType === "DRAYAGE" ? "Make sure at one time only one DRAYAGE is created" : undefined}

                          >

                            {isSubmitting && (

                              <span

                                className="inline-block h-5 w-5 border-2 border-white/90 border-t-transparent rounded-full animate-spin"

                                aria-hidden="true"

                              />

                            )}

                            <span>

                              {isSubmitting ? (loadType === "DRAYAGE" ? "Creating Drayage..." : "Submitting...") : "Create Load"}

                            </span>

                          </button>

                        );

                      })()}

                    </div>

                  </div>

                </div>



                </form>

              </div>

            </div>

          </div>

        </div>

        </>

      )}



      {/* View Load Modal */}

      {showViewModal && selectedLoadForAction && (

        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-center items-center p-4">

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

            <style>{`

              .view-modal-scroll::-webkit-scrollbar {

                display: none;

              }

              .view-modal-scroll {

                scrollbar-width: none;

                -ms-overflow-style: none;

              }

            `}</style>

            {/* Header */}

            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">

              <div className="flex justify-between items-center">

                <div className="flex items-center gap-4">

                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">

                    <Truck className="text-white" size={24} />

                  </div>

                  <div>

                    <h2 className="text-2xl font-bold">Load Details</h2>

                    <p className="text-blue-100">Complete information about the load</p>

                  </div>

                </div>

                <button

                  onClick={() => {

                    setShowViewModal(false);

                    setSelectedLoadForAction(null);

                    setCmtAssignment(null);

                    setLoadingCmtAssignment(false);

                  }}

                  className="text-white hover:text-gray-200 text-2xl font-bold"

                >

                  ×

                </button>

              </div>

            </div>



            {/* Content */}

            <div className="p-6 space-y-6 view-modal-scroll">

              {/* Basic Information */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <div className="bg-gray-50 rounded-xl p-4">

                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">

                    <FileText className="text-blue-600" size={18} />

                    Basic Information

                  </h3>

                  <div className="space-y-2">

                    <div className="flex justify-between">

                      <span className="text-gray-600">Load ID:</span>

                      <span className="font-medium">{selectedLoadForAction.id}</span>

                    </div>

                    <div className="flex justify-between">

                      <span className="text-gray-600">Shipment Number:</span>

                      <span className="font-medium">{selectedLoadForAction.shipmentNumber}</span>

                    </div>

                    <div className="flex justify-between">

                      <span className="text-gray-600">Load Type:</span>

                      <span className="font-medium">{selectedLoadForAction.loadType}</span>

                    </div>

                    <div className="flex justify-between">

                      <span className="text-gray-600">Vehicle Type:</span>

                      <span className="font-medium">{selectedLoadForAction.vehicleType}</span>

                    </div>

                    <div className="flex justify-between">

                      <span className="text-gray-600">Rate:</span>

                      <span className="font-bold text-green-600">${selectedLoadForAction.rate.toLocaleString()}</span>

                    </div>

                  </div>

                </div>



                <div className="bg-gray-50 rounded-xl p-4">

                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">

                    <MapPin className="text-green-600" size={18} />

                    Location Details

                  </h3>

                  <div className="space-y-2">

                    <div>

                      <span className="text-gray-600">Origin:</span>

                      <p className="font-medium">{selectedLoadForAction.origin}</p>

                    </div>

                    <div>

                      <span className="text-gray-600">Destination:</span>

                      <p className="font-medium">{selectedLoadForAction.destination}</p>

                    </div>

                    {selectedLoadForAction.weight && (

                      <div className="flex justify-between">

                        <span className="text-gray-600">Weight:</span>

                        <span className="font-medium">{selectedLoadForAction.weight} lbs</span>

                      </div>

                    )}

                    {selectedLoadForAction.commodity && (

                      <div>

                        <span className="text-gray-600">Commodity:</span>

                        <p className="font-medium">{selectedLoadForAction.commodity}</p>

                      </div>

                    )}

                  </div>

                </div>

              </div>



              {/* Schedule Information */}

              <div className="bg-gray-50 rounded-xl p-4">

                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">

                  <Calendar className="text-purple-600" size={18} />

                  Schedule & Timeline

                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  {selectedLoadForAction.pickupDate && (

                    <div>

                      <span className="text-gray-600">Pickup Date:</span>

                      <p className="font-medium">{formatDateTimeDisplay(selectedLoadForAction.pickupDate)}</p>

                    </div>

                  )}

                  {selectedLoadForAction.deliveryDate && (

                    <div>

                      <span className="text-gray-600">Delivery Date:</span>

                      <p className="font-medium">{formatDateTimeDisplay(selectedLoadForAction.deliveryDate)}</p>

                    </div>

                  )}

                  {selectedLoadForAction.bidDeadline && (

                    <div>

                      <span className="text-gray-600">Bid Deadline:</span>

                      <p className="font-medium">{formatDateTimeDisplay(selectedLoadForAction.bidDeadline)}</p>

                    </div>

                  )}

                </div>

              </div>



              {/* CMT Assignment Information */}

              {loadingCmtAssignment ? (

                <div className="bg-gray-50 rounded-xl p-4">

                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">

                    <User className="text-purple-600" size={18} />

                    CMT Assignment

                  </h3>

                  <div className="flex items-center justify-center py-4">

                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>

                    <span className="ml-2 text-gray-600">Loading CMT assignment...</span>

                  </div>

                </div>

              ) : cmtAssignment ? (

                <div className="bg-gray-50 rounded-xl p-4">

                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">

                    <User className="text-purple-600" size={18} />

                    CMT Assignment

                  </h3>

                  <div className="space-y-4">

                    {cmtAssignment.hasCMTAssignment && cmtAssignment.cmtAssignment?.assignedCMTUser ? (

                      <>

                        <div className="bg-white rounded-lg p-4 border border-purple-200">

                          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">

                            <User className="text-purple-600" size={16} />

                            Assigned CMT User

                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                            <div className="flex justify-between">

                              <span className="text-gray-600">Name:</span>

                              <span className="font-medium">{cmtAssignment.cmtAssignment.assignedCMTUser.displayName || cmtAssignment.cmtAssignment.assignedCMTUser.employeeName}</span>

                            </div>

                            <div className="flex justify-between">

                              <span className="text-gray-600">Employee ID:</span>

                              <span className="font-medium">{cmtAssignment.cmtAssignment.assignedCMTUser.empId}</span>

                            </div>

                            <div className="flex justify-between">

                              <span className="text-gray-600">Email:</span>

                              <span className="font-medium text-sm">{cmtAssignment.cmtAssignment.assignedCMTUser.email}</span>

                            </div>

                            <div className="flex justify-between">

                              <span className="text-gray-600">Mobile:</span>

                              <span className="font-medium">{cmtAssignment.cmtAssignment.assignedCMTUser.mobileNo}</span>

                            </div>

                            <div className="flex justify-between">

                              <span className="text-gray-600">Assigned At:</span>

                              <span className="font-medium">{formatDateTimeDisplay(cmtAssignment.cmtAssignment.assignedCMTUser.assignedAt)}</span>

                            </div>

                          </div>

                        </div>



                      </>

                    ) : (

                      <div className="text-center py-4">

                        <User className="w-12 h-12 text-gray-300 mx-auto mb-2" />

                        <p className="text-gray-500">No CMT user assigned to this load</p>

                      </div>

                    )}

                  </div>

                </div>

              ) : null}



              {/* Rate Details */}

              {selectedLoadForAction.rateDetails && (

                <div className="bg-gray-50 rounded-xl p-4">

                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">

                    <DollarSign className="text-green-600" size={18} />

                    Rate Details

                  </h3>

                  <div className="space-y-3">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                      {selectedLoadForAction.rateDetails.lineHaul !== undefined && selectedLoadForAction.rateDetails.lineHaul !== null && (

                        <div className="bg-white rounded-lg p-3 border border-gray-200">

                          <span className="text-gray-600 text-sm">Line Haul:</span>

                          <p className="font-bold text-green-600 text-lg">${parseFloat(selectedLoadForAction.rateDetails.lineHaul || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>

                        </div>

                      )}

                      {selectedLoadForAction.rateDetails.fsc !== undefined && selectedLoadForAction.rateDetails.fsc !== null && (

                        <div className="bg-white rounded-lg p-3 border border-gray-200">

                          <span className="text-gray-600 text-sm">FSC:</span>

                          <p className="font-bold text-green-600 text-lg">${parseFloat(selectedLoadForAction.rateDetails.fsc || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>

                        </div>

                      )}

                    </div>

                    

                    {selectedLoadForAction.rateDetails.other && Array.isArray(selectedLoadForAction.rateDetails.other) && selectedLoadForAction.rateDetails.other.length > 0 && (

                      <div className="bg-white rounded-lg p-3 border border-gray-200">

                        <span className="text-gray-600 text-sm font-semibold mb-2 block">Other Charges:</span>

                        <div className="space-y-2">

                          {selectedLoadForAction.rateDetails.other.map((charge, index) => (

                            <div key={charge._id || index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">

                              <div>

                                <span className="font-medium text-gray-800">{charge.name || 'Unnamed Charge'}</span>

                                <span className="text-gray-500 text-sm ml-2">

                                  ({charge.quantity || 0} × ${parseFloat(charge.amount || 0).toFixed(2)})

                                </span>

                              </div>

                              <span className="font-bold text-green-600">

                                ${parseFloat(charge.total || (charge.quantity * charge.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

                              </span>

                            </div>

                          ))}

                        </div>

                      </div>

                    )}



                    {selectedLoadForAction.rateDetails.totalRates !== undefined && selectedLoadForAction.rateDetails.totalRates !== null && (

                      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 border-2 border-green-400">

                        <div className="flex justify-between items-center">

                          <span className="text-white font-semibold text-lg">Total Rates:</span>

                          <span className="font-bold text-white text-2xl">

                            ${parseFloat(selectedLoadForAction.rateDetails.totalRates || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

                          </span>

                        </div>

                      </div>

                    )}

                  </div>

                </div>

              )}



              {/* Additional Details */}

              <div className="bg-gray-50 rounded-xl p-4">

                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">

                  <FileText className="text-orange-600" size={18} />

                  Additional Information

                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <div className="flex justify-between">

                    <span className="text-gray-600">Status:</span>

                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusColor(selectedLoadForAction.status)}`}>

                      {selectedLoadForAction.status === 'completed' || selectedLoadForAction.status === 'delivered' ? 'Completed' :

                        selectedLoadForAction.status === 'in-transit' || selectedLoadForAction.status === 'in transit' ? 'In Transit' :

                          selectedLoadForAction.status === 'assigned' ? 'Assigned' :

                            selectedLoadForAction.status === 'pending-approval' || selectedLoadForAction.status === 'pending approval' ? 'Pending Approval' :

                              selectedLoadForAction.status === 'posted' ? 'Posted' :

                                selectedLoadForAction.status === 'bidding' ? 'Bidding' :

                                  selectedLoadForAction.status || 'Available'}

                    </span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-gray-600">Trucker:</span>

                    <span className="font-medium">{selectedLoadForAction.truckerName}</span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-gray-600">Created:</span>

                    <span className="font-medium">{formatDateTimeDisplay(selectedLoadForAction.createdAt)}</span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-gray-600">Created By:</span>

                    <span className="font-medium">{selectedLoadForAction.createdBy}</span>

                  </div>

                  {selectedLoadForAction.containerNo && (

                    <div className="flex justify-between">

                      <span className="text-gray-600">Container No:</span>

                      <span className="font-medium">{selectedLoadForAction.containerNo}</span>

                    </div>

                  )}

                  {selectedLoadForAction.poNumber && (

                    <div className="flex justify-between">

                      <span className="text-gray-600">PO Number:</span>

                      <span className="font-medium">{selectedLoadForAction.poNumber}</span>

                    </div>

                  )}

                  {selectedLoadForAction.bolNumber && (

                    <div className="flex justify-between">

                      <span className="text-gray-600">BOL Number:</span>

                      <span className="font-medium">{selectedLoadForAction.bolNumber}</span>

                    </div>

                  )}

                </div>

                {selectedLoadForAction.remarks && (

                  <div className="mt-4">

                    <span className="text-gray-600">Remarks:</span>

                    <p className="font-medium mt-1">{selectedLoadForAction.remarks}</p>

                  </div>

                )}

              </div>

            </div>

          </div>

        </div>

      )}



      {/* Edit Load Modal */}

      {showEditModal && selectedLoadForAction && (

        <>

          <style>{`

            .edit-modal-scroll::-webkit-scrollbar {

              width: 8px;

            }

            .edit-modal-scroll::-webkit-scrollbar-track {

              background: #f1f5f9;

              border-radius: 4px;

            }

            .edit-modal-scroll::-webkit-scrollbar-thumb {

              background: #cbd5e1;

              border-radius: 4px;

            }

            .edit-modal-scroll::-webkit-scrollbar-thumb:hover {

              background: #94a3b8;

            }

            .edit-modal-scroll {

              scrollbar-width: thin;

              scrollbar-color: #cbd5e1 #f1f5f9;

            }

          `}</style>

          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-center items-center p-4">

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col border border-gray-200">

            

            {/* Clean Header Design */}

            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-t-2xl">

              <div className="flex justify-between items-center">

                <div className="flex items-center gap-4">

                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">

                    <FileText className="text-white" size={24} />

                  </div>

                  <div>

                    <h2 className="text-2xl font-bold">{isDuplicating ? 'Duplicate Load' : 'Edit Load'}</h2>

                    <p className="text-green-100">{isDuplicating ? 'Create a copy of this load' : 'Update load information'}</p>

                  </div>

                </div>

                

                <div className="flex items-center gap-4">

                  {/* Load Type Selector - Fixed */}

                  <div className="flex bg-white/20 rounded-xl p-1">

                    {["OTR", "DRAYAGE"].map((type) => (

                      <button

                        key={type}

                        onClick={() => { setLoadType(type); setFormErrors({}); }}

                        className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${

                          loadType === type 

                            ? "bg-white text-green-700 shadow-sm" 

                            : "text-white hover:bg-white/10"

                        }`}

                      >

                        {type}

                      </button>

                    ))}

                  </div>

                  

                  {/* Close Button */}

                  <button

                    onClick={() => {

                      setShowEditModal(false);

                      setSelectedLoadForAction(null);

                      resetLoadForm();

                    }}

                    className="text-white hover:text-gray-200 text-2xl font-bold p-2 hover:bg-white/10 rounded-lg transition-all duration-200"

                    title="Close Modal"

                  >

                    ×

                  </button>

                </div>

              </div>

            </div>



            {/* Enhanced Form Container - Scrollable */}

            <div className="flex-1 overflow-y-auto bg-gray-50/50 edit-modal-scroll">

              <div className="p-8">

                <form onSubmit={handleLoadSubmit} noValidate className="space-y-8">

                

                {/* Shipper Selection Section */}

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

                  <div className="flex items-center gap-3 mb-4">

                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">

                      <Building className="text-blue-600" size={20} />

                    </div>

                    <h3 className="text-xl font-semibold text-gray-800">Shipper Information</h3>

                  </div>

                  

                  <div>

                    <label className="block text-sm font-semibold text-gray-700 mb-2">

                      Select Shipper <span className="text-red-500">*</span>

                    </label>

                    <div className={`${formErrors.shipperId ? 'border-red-400 bg-red-50' : ''}`}>

                      <MaterialShipperDropdown

                        open={shipperDropdownOpen}

                        setOpen={setShipperDropdownOpen}

                        options={shippers}

                        searchQuery={shipperSearchQuery}

                        setSearchQuery={setShipperSearchQuery}

                        onSelect={handleShipperSelect}

                        inputValue={shipperInputValue}

                        setInputValue={setShipperInputValue}

                      />

                    </div>

                    {formErrors.shipperId && (

                      <div className="flex items-center gap-2 mt-2">

                        <XCircle className="text-red-500" size={16} />

                        <p className="text-sm text-red-600">{formErrors.shipperId}</p>

                      </div>

                    )}

                  </div>

                </div>



                {/* Location Information Section */}

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

                  <div className="flex items-center gap-3 mb-6">

                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">

                      <MapPin className="text-green-600" size={20} />

                    </div>

                    <h3 className="text-xl font-semibold text-gray-800">Location Details</h3>

                  </div>

                  

                  {loadType === "OTR" ? (

                    /* OTR - Multiple Pickup and Delivery Locations */

                    <div className="space-y-8">

                      {/* Multiple Pickup Locations */}

                      <div>

                        <div className="flex items-center justify-between mb-4">

                          <div className="flex items-center gap-2">

                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>

                            <h4 className="font-semibold text-gray-700">Pickup Locations</h4>

                          </div>

                          <button

                            type="button"

                            onClick={addPickupLocation}

                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"

                          >

                            <Plus size={16} />

                            Add Pickup Location

                          </button>

                        </div>

                        

                        {pickupLocations.length === 0 ? (

                          <div className="text-center py-8 text-gray-500">

                            <MapPin size={48} className="mx-auto mb-4 text-gray-300" />

                            <p>No pickup locations added yet</p>

                            <p className="text-sm">Click "Add Pickup Location" to get started</p>

                          </div>

                        ) : (

                          <div className="space-y-4">

                            {pickupLocations.map((location, index) => (

                              <div key={location.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50">

                                <div className="flex items-center justify-between mb-4">

                                  <h5 className="font-medium text-gray-700">Pickup Location {index + 1}</h5>

                                  <button

                                    type="button"

                                    onClick={() => removePickupLocation(location.id)}

                                    className="text-red-500 hover:text-red-700"

                                  >

                                    <XCircle size={20} />

                                  </button>

                                </div>

                                

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                                  <div className="relative">

                                    <label className="block text-sm font-medium text-gray-700 mb-1">

                                      Pickup Address <span className="text-red-500">*</span>

                                    </label>

                                    <input

                                      type="text"

                                      value={location.address}

                                      onChange={(e) => handleLocationAddressChange(location.id, e.target.value, 'pickup')}

                                      onFocus={() => pickupZipOptions[location.id]?.length && setShowPickupZipDD(prev => ({ ...prev, [location.id]: true }))}

                                      onBlur={() => setTimeout(() => setShowPickupZipDD(prev => ({ ...prev, [location.id]: false })), 150)}

                                      placeholder="Enter ZIP code or full address"

                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                                    />

                                    <SearchableZipDropdown

                                      which="pickup"

                                      open={showPickupZipDD[location.id] || false}

                                      setOpen={(open) => setShowPickupZipDD(prev => ({ ...prev, [location.id]: open }))}

                                      options={pickupZipOptions[location.id] || []}

                                      query={pickupZipQueries[location.id] || ""}

                                      setQuery={(query) => setPickupZipQueries(prev => ({ ...prev, [location.id]: query }))}

                                      onSelect={(which, item) => applyZipToLocation(location.id, item, 'pickup')}

                                    />

                                  </div>

                                  

                                  <div>

                                    <label className="block text-sm font-medium text-gray-700 mb-1">

                                      City <span className="text-red-500">*</span>

                                    </label>

                                    <input

                                      type="text"

                                      value={location.city}

                                      onChange={(e) => updatePickupLocation(location.id, 'city', e.target.value)}

                                      placeholder="Enter city"

                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                                    />

                                  </div>

                                  

                                  <div>

                                    <label className="block text-sm font-medium text-gray-700 mb-1">

                                      State <span className="text-red-500">*</span>

                                    </label>

                                    <input

                                      type="text"

                                      value={location.state}

                                      onChange={(e) => updatePickupLocation(location.id, 'state', e.target.value)}

                                      placeholder="Enter state"

                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                                    />

                                  </div>

                                  
                                  <div className="relative">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      ZIP Code <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={location.zip || ''}
                                      onChange={(e) => handleLocationZipChange(location.id, e.target.value, 'pickup')}
                                      onFocus={() => pickupZipOptions[location.id]?.length && setShowPickupZipDD(prev => ({ ...prev, [location.id]: true }))}
                                      onBlur={() => setTimeout(() => setShowPickupZipDD(prev => ({ ...prev, [location.id]: false })), 150)}
                                      placeholder="Enter ZIP code"
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <SearchableZipDropdown
                                      which="pickup"
                                      open={showPickupZipDD[location.id] || false}
                                      setOpen={(open) => setShowPickupZipDD(prev => ({ ...prev, [location.id]: open }))}
                                      options={pickupZipOptions[location.id] || []}
                                      query={pickupZipQueries[location.id] || ""}
                                      setQuery={(query) => setPickupZipQueries(prev => ({ ...prev, [location.id]: query }))}
                                      onSelect={(which, item) => applyZipToLocation(location.id, item, 'pickup')}
                                    />
                                  </div>
                                  

                                  <div>

                                    <label className="block text-sm font-medium text-gray-700 mb-1">

                                      Weight (lbs) <span className="text-red-500">*</span>

                                    </label>

                                    <input

                                      type="text"

                                      value={location.weight}

                                      onChange={(e) => updatePickupLocation(location.id, 'weight', e.target.value)}

                                      placeholder="Enter weight"

                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                                    />

                                  </div>

                                  

                                  <div>

                                    <label className="block text-sm font-medium text-gray-700 mb-1">

                                      Commodity

                                    </label>

                                    <input

                                      type="text"

                                      value={location.commodity}

                                      onChange={(e) => updatePickupLocation(location.id, 'commodity', e.target.value)}

                                      placeholder="Enter commodity"

                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                                    />

                                  </div>

                                  

                                  <div>

                                    <label className="block text-sm font-medium text-gray-700 mb-1">

                                      Pickup Date <span className="text-red-500">*</span>

                                    </label>

                                    <input

                                      type="datetime-local"

                                      value={location.pickupDate}

                                      onChange={(e) => updatePickupLocation(location.id, 'pickupDate', e.target.value)}

                                      min={todayStr()}

                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                                    />

                                  </div>

                                  

                                  <div>

                                    <label className="block text-sm font-medium text-gray-700 mb-1">

                                      Delivery Date <span className="text-red-500">*</span>

                                    </label>

                                    <input

                                      type="datetime-local"

                                      value={location.deliveryDate}

                                      onChange={(e) => updatePickupLocation(location.id, 'deliveryDate', e.target.value)}

                                      min={location.pickupDate || todayStr()}

                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                                    />

                                  </div>

                                </div>

                              </div>

                            ))}

                          </div>

                        )}

                      </div>



                      {/* Multiple Delivery Locations */}

                      <div>

                        <div className="flex items-center justify-between mb-4">

                          <div className="flex items-center gap-2">

                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>

                            <h4 className="font-semibold text-gray-700">Delivery Locations</h4>

                          </div>

                          <button

                            type="button"

                            onClick={addDeliveryLocation}

                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"

                          >

                            <Plus size={16} />

                            Add Delivery Location

                          </button>

                        </div>

                        

                        {deliveryLocations.length === 0 ? (

                          <div className="text-center py-8 text-gray-500">

                            <MapPin size={48} className="mx-auto mb-4 text-gray-300" />

                            <p>No delivery locations added yet</p>

                            <p className="text-sm">Click "Add Delivery Location" to get started</p>

                          </div>

                        ) : (

                          <div className="space-y-4">

                            {deliveryLocations.map((location, index) => (

                              <div key={location.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50">

                                <div className="flex items-center justify-between mb-4">

                                  <h5 className="font-medium text-gray-700">Delivery Location {index + 1}</h5>

                                  <button

                                    type="button"

                                    onClick={() => removeDeliveryLocation(location.id)}

                                    className="text-red-500 hover:text-red-700"

                                  >

                                    <XCircle size={20} />

                                  </button>

                                </div>

                                

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                                  <div className="relative">

                                    <label className="block text-sm font-medium text-gray-700 mb-1">

                                      Delivery Address <span className="text-red-500">*</span>

                                    </label>

                                    <input

                                      type="text"

                                      value={location.address}

                                      onChange={(e) => handleLocationAddressChange(location.id, e.target.value, 'delivery')}

                                      onFocus={() => deliveryZipOptions[location.id]?.length && setShowDeliveryZipDD(prev => ({ ...prev, [location.id]: true }))}

                                      onBlur={() => setTimeout(() => setShowDeliveryZipDD(prev => ({ ...prev, [location.id]: false })), 150)}

                                      placeholder="Enter ZIP code or full address"

                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                                    />

                                    <SearchableZipDropdown

                                      which="delivery"

                                      open={showDeliveryZipDD[location.id] || false}

                                      setOpen={(open) => setShowDeliveryZipDD(prev => ({ ...prev, [location.id]: open }))}

                                      options={deliveryZipOptions[location.id] || []}

                                      query={deliveryZipQueries[location.id] || ""}

                                      setQuery={(query) => setDeliveryZipQueries(prev => ({ ...prev, [location.id]: query }))}

                                      onSelect={(which, item) => applyZipToLocation(location.id, item, 'delivery')}

                                    />

                                  </div>

                                  

                                  <div>

                                    <label className="block text-sm font-medium text-gray-700 mb-1">

                                      City <span className="text-red-500">*</span>

                                    </label>

                                    <input

                                      type="text"

                                      value={location.city}

                                      onChange={(e) => updateDeliveryLocation(location.id, 'city', e.target.value)}

                                      placeholder="Enter city"

                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                                    />

                                  </div>

                                  

                                  <div>

                                    <label className="block text-sm font-medium text-gray-700 mb-1">

                                      State <span className="text-red-500">*</span>

                                    </label>

                                    <input

                                      type="text"

                                      value={location.state}

                                      onChange={(e) => updateDeliveryLocation(location.id, 'state', e.target.value)}

                                      placeholder="Enter state"

                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                                    />

                                  </div>

                                  
                                  <div className="relative">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      ZIP Code <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={location.zip || ''}
                                      onChange={(e) => handleLocationZipChange(location.id, e.target.value, 'delivery')}
                                      onFocus={() => deliveryZipOptions[location.id]?.length && setShowDeliveryZipDD(prev => ({ ...prev, [location.id]: true }))}
                                      onBlur={() => setTimeout(() => setShowDeliveryZipDD(prev => ({ ...prev, [location.id]: false })), 150)}
                                      placeholder="Enter ZIP code"
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <SearchableZipDropdown
                                      which="delivery"
                                      open={showDeliveryZipDD[location.id] || false}
                                      setOpen={(open) => setShowDeliveryZipDD(prev => ({ ...prev, [location.id]: open }))}
                                      options={deliveryZipOptions[location.id] || []}
                                      query={deliveryZipQueries[location.id] || ""}
                                      setQuery={(query) => setDeliveryZipQueries(prev => ({ ...prev, [location.id]: query }))}
                                      onSelect={(which, item) => applyZipToLocation(location.id, item, 'delivery')}
                                    />
                                  </div>
                                  

                                  <div>

                                    <label className="block text-sm font-medium text-gray-700 mb-1">

                                      Weight (lbs) <span className="text-red-500">*</span>

                                    </label>

                                    <input

                                      type="text"

                                      value={location.weight}

                                      onChange={(e) => updateDeliveryLocation(location.id, 'weight', e.target.value)}

                                      placeholder="Enter weight"

                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                                    />

                                  </div>

                                  

                                  <div>

                                    <label className="block text-sm font-medium text-gray-700 mb-1">

                                      Commodity

                                    </label>

                                    <input

                                      type="text"

                                      value={location.commodity}

                                      onChange={(e) => updateDeliveryLocation(location.id, 'commodity', e.target.value)}

                                      placeholder="Enter commodity"

                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                                    />

                                  </div>

                                  

                                  <div>

                                    <label className="block text-sm font-medium text-gray-700 mb-1">

                                      Delivery Date <span className="text-red-500">*</span>

                                    </label>

                                    <input

                                      type="datetime-local"

                                      value={location.deliveryDate}

                                      onChange={(e) => updateDeliveryLocation(location.id, 'deliveryDate', e.target.value)}

                                      min={todayStr()}

                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

                                    />

                                  </div>

                                </div>

                              </div>

                            ))}

                          </div>

                        )}

                      </div>

                    </div>

                  ) : (

                    /* DRAYAGE - Single Pickup and Loading/Unloading Location */

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                      {/* Pickup Location */}

                      <div className="space-y-4">

                        <div className="flex items-center gap-2 mb-3">

                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>

                          <h4 className="font-semibold text-gray-700">Pickup Location</h4>

                        </div>

                        

                        



                        <div>

                          <label className="block text-sm font-semibold text-gray-700 mb-2">

                            Pickup Full Address <span className="text-red-500">*</span>

                          </label>

                          <input

                            ref={(el) => (fieldRefs.current['fromAddress'] = el)}

                            name="fromAddress"

                            value={loadForm.fromAddress}

                            onChange={handleChange}

                            placeholder="Select from dropdown or type full address"

                            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                              formErrors.fromAddress ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                            }`}

                          />

                          {formErrors.fromAddress && (

                            <div className="flex items-center gap-2 mt-2">

                              <XCircle className="text-red-500" size={16} />

                              <p className="text-sm text-red-600">{formErrors.fromAddress}</p>

                            </div>

                          )}

                        </div>



                        <div>

                          <label className="block text-sm font-semibold text-gray-700 mb-2">

                            City <span className="text-red-500">*</span>

                          </label>

                          <input

                            ref={(el) => (fieldRefs.current['fromCity'] = el)}

                            name="fromCity"

                            value={loadForm.fromCity}

                            onChange={handleChange}

                            placeholder="Auto-filled from ZIP (editable)"

                            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                              formErrors.fromCity ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                            }`}

                          />

                          {formErrors.fromCity && (

                            <div className="flex items-center gap-2 mt-2">

                              <XCircle className="text-red-500" size={16} />

                              <p className="text-sm text-red-600">{formErrors.fromCity}</p>

                            </div>

                          )}

                        </div>



                        <div>

                          <label className="block text-sm font-semibold text-gray-700 mb-2">

                            State <span className="text-red-500">*</span>

                          </label>

                          <input

                            ref={(el) => (fieldRefs.current['fromState'] = el)}

                            name="fromState"

                            value={loadForm.fromState}

                            onChange={handleChange}

                            placeholder="Auto-filled from ZIP (editable, e.g., NJ)"

                            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                              formErrors.fromState ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                            }`}

                          />

                          {formErrors.fromState && (

                            <div className="flex items-center gap-2 mt-2">

                              <XCircle className="text-red-500" size={16} />

                              <p className="text-sm text-red-600">{formErrors.fromState}</p>

                            </div>

                          )}

                        </div>

                      </div>

                      <div className="relative">

                          <label className="block text-sm font-semibold text-gray-700 mb-2">

                            ZIP Code <span className="text-red-500">*</span>

                          </label>

                          <input

                            ref={(el) => (fieldRefs.current['fromZip'] = el)}

                            name="fromZip"

                            placeholder="Enter 5-digit ZIP code"

                            value={loadForm.fromZip}

                            onChange={handleChange}

                            onFocus={() => fromZipOptions.length && setShowFromZipDD(true)}

                            onBlur={() => setTimeout(() => setShowFromZipDD(false), 150)}

                            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                              formErrors.fromZip ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                            }`}

                          />

                          {formErrors.fromZip && (

                            <div className="flex items-center gap-2 mt-2">

                              <XCircle className="text-red-500" size={16} />

                              <p className="text-sm text-red-600">{formErrors.fromZip}</p>

                            </div>

                          )}

                          <SearchableZipDropdown

                            which="from"

                            open={showFromZipDD}

                            setOpen={setShowFromZipDD}

                            options={fromZipOptions}

                            query={fromZipQuery}

                            setQuery={setFromZipQuery}

                            onSelect={applyZipSelection}

                          />

                        </div>



                      {/* Loading/Unloading Location */}

                      <div className="space-y-4">

                        <div className="flex items-center gap-2 mb-3">

                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>

                          <h4 className="font-semibold text-gray-700">Loading/Unloading Location</h4>

                        </div>

                        

                        



                        <div>

                          <label className="block text-sm font-semibold text-gray-700 mb-2">

                            Loading/Unloading Full Address <span className="text-red-500">*</span>

                          </label>

                          <input

                            ref={(el) => (fieldRefs.current['toAddress'] = el)}

                            name="toAddress"

                            value={loadForm.toAddress}

                            onChange={handleChange}

                            placeholder="Select from dropdown or type full address"

                            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                              formErrors.toAddress ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                            }`}

                          />

                          {formErrors.toAddress && (

                            <div className="flex items-center gap-2 mt-2">

                              <XCircle className="text-red-500" size={16} />

                              <p className="text-sm text-red-600">{formErrors.toAddress}</p>

                            </div>

                          )}

                        </div>



                        <div>

                          <label className="block text-sm font-semibold text-gray-700 mb-2">

                            City <span className="text-red-500">*</span>

                          </label>

                          <input

                            ref={(el) => (fieldRefs.current['toCity'] = el)}

                            name="toCity"

                            value={loadForm.toCity}

                            onChange={handleChange}

                            placeholder="Auto-filled from ZIP (editable)"

                            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                              formErrors.toCity ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                            }`}

                          />

                          {formErrors.toCity && (

                            <div className="flex items-center gap-2 mt-2">

                              <XCircle className="text-red-500" size={16} />

                              <p className="text-sm text-red-600">{formErrors.toCity}</p>

                            </div>

                          )}

                        </div>



                        <div>

                          <label className="block text-sm font-semibold text-gray-700 mb-2">

                            State <span className="text-red-500">*</span>

                          </label>

                          <input

                            ref={(el) => (fieldRefs.current['toState'] = el)}

                            name="toState"

                            value={loadForm.toState}

                            onChange={handleChange}

                            placeholder="Auto-filled from ZIP (editable, e.g., AZ)"

                            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                              formErrors.toState ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                            }`}

                          />

                          {formErrors.toState && (

                            <div className="flex items-center gap-2 mt-2">

                              <XCircle className="text-red-500" size={16} />

                              <p className="text-sm text-red-600">{formErrors.toState}</p>

                            </div>

                          )}

                        </div>

                      </div>

                      <div className="relative">

                          <label className="block text-sm font-semibold text-gray-700 mb-2">

                             ZIP Code <span className="text-red-500">*</span>

                          </label>

                          <input

                            ref={(el) => (fieldRefs.current['toZip'] = el)}

                            name="toZip"

                            placeholder="Enter 5-digit ZIP code"

                            value={loadForm.toZip}

                            onChange={handleChange}

                            onFocus={() => toZipOptions.length && setShowToZipDD(true)}

                            onBlur={() => setTimeout(() => setShowToZipDD(false), 150)}

                            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                              formErrors.toZip ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                            }`}

                          />

                          {formErrors.toZip && (

                            <div className="flex items-center gap-2 mt-2">

                              <XCircle className="text-red-500" size={16} />

                              <p className="text-sm text-red-600">{formErrors.toZip}</p>

                            </div>

                          )}

                          <SearchableZipDropdown

                            which="to"

                            open={showToZipDD}

                            setOpen={setShowToZipDD}

                            options={toZipOptions}

                            query={toZipQuery}

                            setQuery={setToZipQuery}

                            onSelect={applyZipSelection}

                          />

                        </div>



                      {/* Drayage Details - Moved under Loading/Unloading Location */}

                      <div className="mt-6 pt-6 border-t border-gray-200">

                        <div className="flex items-center gap-2 mb-4">

                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>

                          <h4 className="font-semibold text-gray-700">Return Location</h4>

                        </div>

                        

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                          <div>

                            <label className="block text-sm font-semibold text-gray-700 mb-2">

                              Return Full Address <span className="text-red-500">*</span>

                            </label>

                            <input

                              ref={(el) => (fieldRefs.current['returnAddress'] = el)}

                              name="returnAddress"

                              value={loadForm.returnAddress}

                              onChange={handleChange}

                              placeholder="Enter full address"

                              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                                formErrors.returnAddress ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                              }`}

                            />

                            {formErrors.returnAddress && (

                              <div className="flex items-center gap-2 mt-2">

                                <XCircle className="text-red-500" size={16} />

                                <p className="text-sm text-red-600">{formErrors.returnAddress}</p>

                              </div>

                            )}

                          </div>



                          <div>

                            <label className="block text-sm font-semibold text-gray-700 mb-2">

                              City <span className="text-red-500">*</span>

                            </label>

                            <input

                              ref={(el) => (fieldRefs.current['returnCity'] = el)}

                              name="returnCity"

                              value={loadForm.returnCity}

                              onChange={handleChange}

                              placeholder="Enter city"

                              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                                formErrors.returnCity ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                              }`}

                            />

                            {formErrors.returnCity && (

                              <div className="flex items-center gap-2 mt-2">

                                <XCircle className="text-red-500" size={16} />

                                <p className="text-sm text-red-600">{formErrors.returnCity}</p>

                              </div>

                            )}

                          </div>



                          <div>

                            <label className="block text-sm font-semibold text-gray-700 mb-2">

                              State <span className="text-red-500">*</span>

                            </label>

                            <input

                              ref={(el) => (fieldRefs.current['returnState'] = el)}

                              name="returnState"

                              value={loadForm.returnState}

                              onChange={handleChange}

                              placeholder="Enter state (e.g., CA)"

                              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                                formErrors.returnState ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                              }`}

                            />

                            {formErrors.returnState && (

                              <div className="flex items-center gap-2 mt-2">

                                <XCircle className="text-red-500" size={16} />

                                <p className="text-sm text-red-600">{formErrors.returnState}</p>

                              </div>

                            )}

                          </div>

                          <div>

                            <label className="block text-sm font-semibold text-gray-700 mb-2">

                               ZIP Code <span className="text-red-500">*</span>

                            </label>

                          <input

                              ref={(el) => (fieldRefs.current['returnZip'] = el)}

                              name="returnZip"

                              value={loadForm.returnZip}

                            onChange={handleChange}

                            onFocus={() => returnZipOptions.length && setShowReturnZipDD(true)}

                            onBlur={() => setTimeout(() => setShowReturnZipDD(false), 150)}

                            placeholder="Enter 5-digit ZIP code"

                              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                                formErrors.returnZip ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                              }`}

                            />

                            {formErrors.returnZip && (

                              <div className="flex items-center gap-2 mt-2">

                                <XCircle className="text-red-500" size={16} />

                                <p className="text-sm text-red-600">{formErrors.returnZip}</p>

                              </div>

                            )}

                          <SearchableZipDropdown

                            which="return"

                            open={showReturnZipDD}

                            setOpen={setShowReturnZipDD}

                            options={returnZipOptions}

                            query={returnZipQuery}

                            setQuery={setReturnZipQuery}

                            onSelect={applyZipSelection}

                          />

                          </div>

                        </div>

                      </div>

                    </div>

                  )}

                </div>





                {/* Load Details Section */}

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

                  <div className="flex items-center gap-3 mb-6">

                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">

                      <Truck className="text-purple-600" size={20} />

                    </div>

                    <h3 className="text-xl font-semibold text-gray-800">Load Details</h3>

                  </div>

                  

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    <div>

                      <label className="block text-sm font-semibold text-gray-700 mb-2">

                        Vehicle Type <span className="text-red-500">*</span>

                      </label>

                      <div className={`${formErrors.vehicleType ? 'border-red-400 bg-red-50' : ''}`}>

                        <VehicleTypeDropdown

                          open={vehicleTypeDropdownOpen}

                          setOpen={setVehicleTypeDropdownOpen}

                          options={vehicleTypeOptions}

                          searchQuery={vehicleTypeSearchQuery}

                          setSearchQuery={setVehicleTypeSearchQuery}

                          onSelect={handleVehicleTypeSelect}

                          inputValue={loadForm.vehicleType}

                          setInputValue={(value) => setLoadForm(prev => ({ ...prev, vehicleType: value }))}

                        />

                      </div>

                      {formErrors.vehicleType && (

                        <div className="flex items-center gap-2 mt-2">

                          <XCircle className="text-red-500" size={16} />

                          <p className="text-sm text-red-600">{formErrors.vehicleType}</p>

                        </div>

                      )}

                    </div>

                    

                    {/* Rate Fields: Line Haul, FSC, Other */}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 col-span-2">

                      <div>

                        <label className="block text-sm font-semibold text-gray-700 mb-2">

                          Line Haul ($)

                        </label>

                        <input

                          ref={(el) => (fieldRefs.current['lineHaul'] = el)}

                          name="lineHaul"

                          inputMode="decimal"

                          placeholder="e.g., 1500 or 1500.50"

                          value={loadForm.lineHaul}

                          onChange={handleChange}

                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                            formErrors.lineHaul ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                          }`}

                        />

                        {formErrors.lineHaul && (

                          <div className="flex items-center gap-2 mt-2">

                            <XCircle className="text-red-500" size={16} />

                            <p className="text-sm text-red-600">{formErrors.lineHaul}</p>

                          </div>

                        )}

                      </div>

                      

                      <div>

                        <label className="block text-sm font-semibold text-gray-700 mb-2">

                          FSC (%)
                        </label>

                        <input

                          ref={(el) => (fieldRefs.current['fsc'] = el)}

                          name="fsc"

                          inputMode="decimal"

                          placeholder="e.g., 10 for 10%"
                          value={loadForm.fsc}

                          onChange={handleChange}

                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                            formErrors.fsc ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                          }`}

                        />

                        {formErrors.fsc && (

                          <div className="flex items-center gap-2 mt-2">

                            <XCircle className="text-red-500" size={16} />

                            <p className="text-sm text-red-600">{formErrors.fsc}</p>

                          </div>

                        )}

                      </div>

                      

                      <div>

                        <label className="block text-sm font-semibold text-gray-700 mb-2">

                          Other ($)

                        </label>

                        <input

                          ref={(el) => (fieldRefs.current['other'] = el)}

                          name="other"

                          readOnly

                          onClick={() => setShowChargesCalculator(true)}

                          placeholder="Click to add charges"

                          value={loadForm.other || ''}

                          className={`w-full px-4 py-3 border-2 rounded-xl cursor-pointer bg-white hover:border-blue-400 transition-all duration-200 ${

                            formErrors.other ? 'border-red-400 bg-red-50' : 'border-gray-200'

                          }`}

                        />

                        {formErrors.other && (

                          <div className="flex items-center gap-2 mt-2">

                            <XCircle className="text-red-500" size={16} />

                            <p className="text-sm text-red-600">{formErrors.other}</p>

                          </div>

                        )}

                      </div>

                    </div>

                    

                    {/* Total Rate Display */}

                    <div className="col-span-2">

                      <label className="block text-sm font-semibold text-gray-700 mb-2">

                        Total Rate ($)

                      </label>

                      <div className="w-full px-4 py-3 border-2 rounded-xl bg-gray-50 border-gray-300 font-semibold text-gray-700">

                        ${(() => {

                          const lineHaul = parseFloat(String(loadForm.lineHaul || '0').replace(/\.$/, '')) || 0;

                          const fsc = parseFloat(String(loadForm.fsc || '0').replace(/\.$/, '')) || 0;

                          const fscAmount = lineHaul * (fsc / 100); // FSC is a percentage of lineHaul
                          const other = parseFloat(String(loadForm.other || '0').replace(/\.$/, '')) || 0;

                          const total = lineHaul + fscAmount + other;
                          return total.toFixed(2);

                        })()}

                      </div>

                    </div>



                    {loadType === 'DRAYAGE' && (

                      <>

                        <div>

                          <label className="block text-sm font-semibold text-gray-700 mb-2">

                            Weight (lbs) <span className="text-red-500">*</span>

                          </label>

                          <input

                            ref={(el) => (fieldRefs.current['weight'] = el)}

                            name="weight"

                            placeholder="e.g., 25000"

                            value={loadForm.weight}

                            onChange={handleChange}

                            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                              formErrors.weight ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                            }`}

                          />

                          {formErrors.weight && (

                            <div className="flex items-center gap-2 mt-2">

                              <XCircle className="text-red-500" size={16} />

                              <p className="text-sm text-red-600">{formErrors.weight}</p>

                            </div>

                          )}

                        </div>



                        <div>

                          <label className="block text-sm font-semibold text-gray-700 mb-2">

                            Commodity <span className="text-red-500">*</span>

                          </label>

                          <input

                            ref={(el) => (fieldRefs.current['commodity'] = el)}

                            name="commodity"

                            placeholder="e.g., Electronics, Furniture"

                            value={loadForm.commodity}

                            onChange={handleChange}

                            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                              formErrors.commodity ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                            }`}

                          />

                          {formErrors.commodity && (

                            <div className="flex items-center gap-2 mt-2">

                              <XCircle className="text-red-500" size={16} />

                              <p className="text-sm text-red-600">{formErrors.commodity}</p>

                            </div>

                          )}

                        </div>

                      </>

                    )}

                  </div>

                </div>



                {/* Schedule Section */}

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

                  <div className="flex items-center gap-3 mb-6">

                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">

                      <Calendar className="text-indigo-600" size={20} />

                    </div>

                    <h3 className="text-xl font-semibold text-gray-800">Schedule & Timeline</h3>

                  </div>

                  

                  {loadType === "DRAYAGE" ? (

                    /* DRAYAGE - Show Pickup Date, Delivery Date, and Bid Deadline */

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                      <div onClick={() => openDatePicker('pickupDate')} className="cursor-pointer">

                        <label className="block text-sm font-semibold text-gray-700 mb-2">

                          Pickup Date <span className="text-red-500">*</span>

                        </label>

                        <input

                          ref={(el) => (fieldRefs.current['pickupDate'] = el)}

                          type="datetime-local"

                          name="pickupDate"

                          value={loadForm.pickupDate}

                          onChange={handleChange}

                          min={todayStr()}

                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 cursor-pointer ${

                            formErrors.pickupDate ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                          }`}

                          onClick={(e) => e.target.showPicker?.()}

                        />

                        {formErrors.pickupDate && (

                          <div className="flex items-center gap-2 mt-2">

                            <XCircle className="text-red-500" size={16} />

                            <p className="text-sm text-red-600">{formErrors.pickupDate}</p>

                          </div>

                        )}

                      </div>



                      <div onClick={() => openDatePicker('deliveryDate')} className="cursor-pointer">

                        <label className="block text-sm font-semibold text-gray-700 mb-2">

                          Delivery Date <span className="text-red-500">*</span>

                        </label>

                        <input

                          ref={(el) => (fieldRefs.current['deliveryDate'] = el)}

                          type="datetime-local"

                          name="deliveryDate"

                          value={loadForm.deliveryDate}

                          onChange={handleChange}

                          min={loadForm.pickupDate || todayStr()}

                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 cursor-pointer ${

                            formErrors.deliveryDate ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                          }`}

                          onClick={(e) => e.target.showPicker?.()}

                        />

                        {formErrors.deliveryDate && (

                          <div className="flex items-center gap-2 mt-2">

                            <XCircle className="text-red-500" size={16} />

                            <p className="text-sm text-red-600">{formErrors.deliveryDate}</p>

                          </div>

                        )}

                      </div>

                      <div onClick={() => openDatePicker('returnDate')} className="cursor-pointer">

                            <label className="block text-sm font-semibold text-gray-700 mb-2">

                              Return Date <span className="text-red-500">*</span>

                            </label>

                            <input

                              ref={(el) => (fieldRefs.current['returnDate'] = el)}

                              type="datetime-local"

                              name="returnDate"

                              value={loadForm.returnDate}

                              onChange={handleChange}

                              min={todayStr()}

                              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 cursor-pointer ${

                                formErrors.returnDate ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                              }`}

                              onClick={(e) => e.target.showPicker?.()}

                            />

                            {formErrors.returnDate && (

                              <div className="flex items-center gap-2 mt-2">

                                <XCircle className="text-red-500" size={16} />

                                <p className="text-sm text-red-600">{formErrors.returnDate}</p>

                              </div>

                            )}

                          </div>



                      <div onClick={() => openDatePicker('bidDeadline')} className="cursor-pointer">

                        <label className="block text-sm font-semibold text-gray-700 mb-2">

                          Bid Deadline <span className="text-red-500">*</span>

                        </label>

                        <input

                          ref={(el) => (fieldRefs.current['bidDeadline'] = el)}

                          type="datetime-local"

                          name="bidDeadline"

                          value={loadForm.bidDeadline}

                          onChange={handleChange}

                          min={todayStr()}

                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 cursor-pointer ${

                            formErrors.bidDeadline ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                          }`}

                          onClick={(e) => e.target.showPicker?.()}

                        />

                        {formErrors.bidDeadline && (

                          <div className="flex items-center gap-2 mt-2">

                            <XCircle className="text-red-500" size={16} />

                            <p className="text-sm text-red-600">{formErrors.bidDeadline}</p>

                          </div>

                        )}

                      </div>

                    </div>

                  ) : (

                    /* OTR - Show only Bid Deadline */

                    <div className="grid grid-cols-1 md:grid-cols-1 gap-6">

                      <div onClick={() => openDatePicker('bidDeadline')} className="cursor-pointer">

                        <label className="block text-sm font-semibold text-gray-700 mb-2">

                          Bid Deadline <span className="text-red-500">*</span>

                        </label>

                        <input

                          ref={(el) => (fieldRefs.current['bidDeadline'] = el)}

                          type="datetime-local"

                          name="bidDeadline"

                          value={loadForm.bidDeadline}

                          onChange={handleChange}

                          min={todayStr()}

                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 cursor-pointer ${

                            formErrors.bidDeadline ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                          }`}

                          onClick={(e) => e.target.showPicker?.()}

                        />

                        {formErrors.bidDeadline && (

                          <div className="flex items-center gap-2 mt-2">

                            <XCircle className="text-red-500" size={16} />

                            <p className="text-sm text-red-600">{formErrors.bidDeadline}</p>

                          </div>

                        )}

                      </div>

                    </div>

                  )}

                </div>



                {/* Additional Details Section */}

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

                  <div className="flex items-center gap-3 mb-6">

                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">

                      <FileText className="text-orange-600" size={20} />

                    </div>

                    <h3 className="text-xl font-semibold text-gray-800">Additional Details</h3>

                  </div>

                  

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {loadType === 'DRAYAGE' && (

                    <div>

                      <label className="block text-sm font-semibold text-gray-700 mb-2">

                        Container No

                      </label>

                      <input

                        ref={(el) => (fieldRefs.current['containerNo'] = el)}

                        name="containerNo"

                        value={loadForm.containerNo || ''}

                        onChange={handleChange}

                        placeholder="Alphanumeric only"

                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                          formErrors.containerNo ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                        }`}

                      />

                      {formErrors.containerNo && (

                        <div className="flex items-center gap-2 mt-2">

                          <XCircle className="text-red-500" size={16} />

                          <p className="text-sm text-red-600">{formErrors.containerNo}</p>

                        </div>

                      )}

                    </div>

                    )}

                    

                    <div>

                      <label className="block text-sm font-semibold text-gray-700 mb-2">

                        PO Number

                      </label>

                      <input

                        ref={(el) => (fieldRefs.current['poNumber'] = el)}

                        name="poNumber"

                        value={loadForm.poNumber || ''}

                        onChange={handleChange}

                        placeholder="Alphanumeric only"

                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                          formErrors.poNumber ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                        }`}

                      />

                      {formErrors.poNumber && (

                        <div className="flex items-center gap-2 mt-2">

                          <XCircle className="text-red-500" size={16} />

                          <p className="text-sm text-red-600">{formErrors.poNumber}</p>

                        </div>

                      )}

                    </div>

                    

                    <div>

                      <label className="block text-sm font-semibold text-gray-700 mb-2">

                        BOL Number

                      </label>

                      <input

                        ref={(el) => (fieldRefs.current['bolNumber'] = el)}

                        name="bolNumber"

                        value={loadForm.bolNumber || ''}

                        onChange={handleChange}

                        placeholder="Alphanumeric only"

                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                          formErrors.bolNumber ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                        }`}

                      />

                      {formErrors.bolNumber && (

                        <div className="flex items-center gap-2 mt-2">

                          <XCircle className="text-red-500" size={16} />

                          <p className="text-sm text-red-600">{formErrors.bolNumber}</p>

                        </div>

                      )}

                    </div>

                    

                    {loadType !== 'DRAYAGE' && (

                      <div>

                        <label className="block text-sm font-semibold text-gray-700 mb-2">

                          Rate Type

                        </label>

                        <input

                          ref={(el) => (fieldRefs.current['rateType'] = el)}

                          name="rateType"

                          value={loadForm.rateType}

                          onChange={handleChange}

                          placeholder="e.g., Flat Rate / Per Mile"

                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${

                            formErrors.rateType ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'

                          }`}

                        />

                        {formErrors.rateType && (

                          <div className="flex items-center gap-2 mt-2">

                            <XCircle className="text-red-500" size={16} />

                            <p className="text-sm text-red-600">{formErrors.rateType}</p>

                          </div>

                        )}

                      </div>

                    )}

                  </div>

                </div>





                {/* Enhanced Form Actions */}

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

                  <div className="flex justify-between items-center">

                    <div className="flex items-center gap-3">

                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">

                        <CheckCircle className="text-gray-600" size={20} />

                      </div>

                      <div>

                        <h3 className="text-lg font-semibold text-gray-800">Ready to Update?</h3>

                        <p className="text-sm text-gray-600">Review your changes and update the load</p>

                      </div>

                    </div>

                    

                    <div className="flex gap-4">

                      <button

                        type="button"

                        onClick={() => {

                          setShowEditModal(false);

                          setSelectedLoadForAction(null);

                        }}

                        disabled={creatingLoad || (loadType === "DRAYAGE" && creatingDrayage)}

                        className="px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"

                      >

                        Cancel

                      </button>



                      {(() => {

                        const isSubmitting = creatingLoad || (loadType === "DRAYAGE" && creatingDrayage);

                        return (

                          <button

                            type="submit"

                            disabled={isSubmitting}

                            aria-busy={isSubmitting}

                            onClick={() => console.log("🔥 Edit Submit button clicked!")}

                            className={[

                              "relative inline-flex items-center justify-center gap-3",

                              "px-8 py-3 rounded-xl text-white font-semibold shadow-lg",

                              "bg-gradient-to-r from-green-600 to-green-700",

                              "hover:from-green-700 hover:to-green-800",

                              "transform hover:scale-105 transition-all duration-200",

                              isSubmitting ? "opacity-75 cursor-not-allowed" : "",

                              "min-w-[180px]"

                            ].join(" ")}

                          >

                            {isSubmitting && (

                              <span

                                className="inline-block h-5 w-5 border-2 border-white/90 border-t-transparent rounded-full animate-spin"

                                aria-hidden="true"

                              />

                            )}

                            <span>

                              {isSubmitting ? (loadType === "DRAYAGE" ? (isDuplicating ? "Creating Drayage..." : "Updating Drayage...") : (isDuplicating ? "Creating..." : "Updating...")) : (isDuplicating ? "Duplicate Load" : "Update Load")}

                            </span>

                          </button>

                        );

                      })()}

                    </div>

                  </div>

                </div>



                </form>

              </div>

            </div>

          </div>

        </div>

        </>

      )}



      {/* Delete Confirmation Modal */}

      {showDeleteModal && selectedLoadForAction && (

        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-center items-center p-4">

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

            {/* Header */}

            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-t-2xl">

              <div className="flex justify-between items-center">

                <div className="flex items-center gap-4">

                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">

                    <XCircle className="text-white" size={24} />

                  </div>

                  <div>

                    <h2 className="text-xl font-bold">Delete Load</h2>

                    <p className="text-red-100">This action cannot be undone</p>

                  </div>

                </div>

                <button

                  onClick={() => {

                    setShowDeleteModal(false);

                    setSelectedLoadForAction(null);

                  }}

                  className="text-white hover:text-gray-200 text-2xl font-bold"

                >

                  ×

                </button>

              </div>

            </div>



            {/* Content */}

            <div className="p-6">

              <div className="text-center mb-6">

                <XCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />

                <h3 className="text-lg font-semibold text-gray-700 mb-2">Are you sure?</h3>

                <p className="text-gray-500">

                  You are about to delete load <span className="font-semibold">{selectedLoadForAction.id}</span>.

                  This action cannot be undone.

                </p>

              </div>



              {/* Actions */}

              <div className="flex gap-4">

                <button

                  onClick={() => {

                    setShowDeleteModal(false);

                    setSelectedLoadForAction(null);

                  }}

                  disabled={submitting}

                  className={`flex-1 px-4 py-3 rounded-lg transition-colors font-medium ${

                    submitting 

                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 

                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'

                  }`}

                >

                  Cancel

                </button>

                <button

                  onClick={confirmDelete}

                  disabled={submitting}

                  className={`flex-1 px-4 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 ${

                    submitting 

                      ? 'bg-red-400 text-white cursor-not-allowed' 

                      : 'bg-red-600 text-white hover:bg-red-700'

                  }`}

                >

                  {submitting ? (

                    <>

                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>

                      Deleting...

                    </>

                  ) : (

                    'Delete Load'

                  )}

                </button>

              </div>

            </div>

          </div>

        </div>

      )}



      {/* Charges Calculator Modal */}

      {showChargesCalculator && (

        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-center items-center p-4">

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-200">

            {/* Header */}

            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">

              <div className="flex justify-between items-center">

                <h2 className="text-2xl font-bold">Charges Calculator</h2>

                <button

                  onClick={handleCancelCharges}

                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"

                >

                  <XCircle size={24} />

                </button>

              </div>

            </div>



            {/* Content */}

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">

              {/* Table Header */}

              <div className="grid grid-cols-12 gap-4 mb-4 font-semibold text-gray-700 text-sm">

                <div className="col-span-4">

                  Name <span className="text-red-500">*</span>

                </div>

                <div className="col-span-2">

                  # Quantity <span className="text-red-500">*</span>

                </div>

                <div className="col-span-2">

                  $ Amount <span className="text-red-500">*</span>

                </div>

                <div className="col-span-3">

                  $ Total

                </div>

                <div className="col-span-1">

                  Action

                </div>

              </div>



              {/* Charges Rows */}

              {charges.map((charge, index) => {

                const quantity = parseFloat(charge.quantity) || 0;

                const amount = parseFloat(charge.amount) || 0;

                const total = (quantity * amount).toFixed(2);

                

                return (

                  <div key={charge.id} className="grid grid-cols-12 gap-4 mb-4 items-center">

                    <div className="col-span-4">

                      <input

                        type="text"

                        placeholder="Enter charge name"

                        value={charge.name}

                        onChange={(e) => handleChargeChange(charge.id, 'name', e.target.value)}

                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

                      />

                    </div>

                    <div className="col-span-2">

                      <input

                        type="text"

                        inputMode="numeric"

                        value={charge.quantity}

                        onChange={(e) => handleChargeChange(charge.id, 'quantity', e.target.value)}

                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

                      />

                    </div>

                    <div className="col-span-2">

                      <input

                        type="text"

                        inputMode="decimal"

                        value={charge.amount}

                        onChange={(e) => handleChargeChange(charge.id, 'amount', e.target.value)}

                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

                      />

                    </div>

                    <div className="col-span-3">

                      <div className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-green-50 font-semibold text-gray-700">

                        ${total}

                      </div>

                    </div>

                    <div className="col-span-1 flex justify-center">

                      <button

                        onClick={() => deleteCharge(charge.id)}

                        disabled={charges.length === 1}

                        className={`p-2 rounded-lg transition-colors ${

                          charges.length === 1

                            ? 'text-gray-300 cursor-not-allowed'

                            : 'text-gray-600 hover:bg-red-100 hover:text-red-600'

                        }`}

                      >

                        <Trash2 size={20} />

                      </button>

                    </div>

                  </div>

                );

              })}



              {/* Add New Charge Button */}

              <div className="flex justify-center mb-6">

                <button

                  onClick={addNewCharge}

                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"

                >

                  <Plus size={20} />

                  Add New Charge

                </button>

              </div>

            </div>



            {/* Footer */}

            <div className="bg-white border-t border-gray-200 p-6 rounded-b-2xl">

              <div className="flex justify-between items-center">

                <div className="flex items-center gap-3 bg-green-500 text-white px-6 py-4 rounded-xl font-semibold shadow-lg">

                  <DollarSign size={24} className="text-white" />

                  <span>Total Charges ${calculateChargesTotal()}</span>

                </div>

                <div className="flex gap-4">

                  <button

                    onClick={handleCancelCharges}

                    className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"

                  >

                    Cancel

                  </button>

                  <button

                    onClick={handleApplyCharges}

                    className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors shadow-lg"

                  >

                    Apply to Carrier Fees

                  </button>

                </div>

              </div>

            </div>

          </div>

        </div>

      )}



    </div>

  );

} 