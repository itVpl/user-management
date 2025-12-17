import React, { useEffect, useState, useRef } from 'react';
import { FaArrowLeft, FaDownload, FaEye, FaFileAlt, FaEdit } from 'react-icons/fa';
import { User, Mail, Phone, Building, FileText, CheckCircle, XCircle, Clock, PlusCircle, MapPin, Truck, Calendar, Eye, Edit, Upload } from 'lucide-react';
import AddTruckerForm from './AddTruckerform';
import axios from 'axios';
import API_CONFIG from '../../config/api.js';
// --- Geo helpers: Country / State / City ---
// ========= US STATES AND CITIES DATA =========
const US_STATES_CITIES = {
  "Alabama": ["Birmingham", "Montgomery", "Mobile", "Huntsville", "Tuscaloosa", "Hoover", "Dothan", "Auburn", "Decatur", "Madison"],
  "Alaska": ["Anchorage", "Fairbanks", "Juneau", "Sitka", "Ketchikan", "Wasilla", "Kenai", "Kodiak", "Bethel", "Palmer"],
  "Arizona": ["Phoenix", "Tucson", "Mesa", "Chandler", "Scottsdale", "Glendale", "Gilbert", "Tempe", "Peoria", "Surprise"],
  "Arkansas": ["Little Rock", "Fort Smith", "Fayetteville", "Springdale", "Jonesboro", "North Little Rock", "Conway", "Rogers", "Pine Bluff", "Bentonville"],
  "California": ["Los Angeles", "San Diego", "San Jose", "San Francisco", "Fresno", "Sacramento", "Long Beach", "Oakland", "Bakersfield", "Anaheim", "Santa Ana", "Riverside", "Stockton", "Irvine", "Chula Vista", "Fremont", "San Bernardino", "Modesto", "Fontana", "Oxnard"],
  "Colorado": ["Denver", "Colorado Springs", "Aurora", "Fort Collins", "Lakewood", "Thornton", "Arvada", "Westminster", "Pueblo", "Centennial"],
  "Connecticut": ["Bridgeport", "New Haven", "Hartford", "Stamford", "Waterbury", "Norwalk", "Danbury", "New Britain", "West Hartford", "Greenwich"],
  "Delaware": ["Wilmington", "Dover", "Newark", "Middletown", "Smyrna", "Milford", "Seaford", "Georgetown", "Elsmere", "New Castle"],
  "Florida": ["Jacksonville", "Miami", "Tampa", "Orlando", "St. Petersburg", "Hialeah", "Tallahassee", "Fort Lauderdale", "Port St. Lucie", "Cape Coral", "Pembroke Pines", "Hollywood", "Miramar", "Gainesville", "Coral Springs"],
  "Georgia": ["Atlanta", "Augusta", "Columbus", "Savannah", "Athens", "Sandy Springs", "Roswell", "Macon", "Johns Creek", "Albany"],
  "Hawaii": ["Honolulu", "Pearl City", "Hilo", "Kailua", "Kaneohe", "Kahului", "Kihei", "Kailua-Kona", "Waipahu", "Mililani"],
  "Idaho": ["Boise", "Nampa", "Meridian", "Idaho Falls", "Pocatello", "Caldwell", "Coeur d'Alene", "Twin Falls", "Lewiston", "Post Falls"],
  "Illinois": ["Chicago", "Aurora", "Rockford", "Joliet", "Naperville", "Springfield", "Peoria", "Elgin", "Waukegan", "Cicero", "Champaign", "Bloomington", "Arlington Heights", "Evanston", "Schaumburg"],
  "Indiana": ["Indianapolis", "Fort Wayne", "Evansville", "South Bend", "Carmel", "Fishers", "Bloomington", "Hammond", "Gary", "Muncie"],
  "Iowa": ["Des Moines", "Cedar Rapids", "Davenport", "Sioux City", "Iowa City", "Waterloo", "Council Bluffs", "Ames", "West Des Moines", "Dubuque"],
  "Kansas": ["Wichita", "Overland Park", "Kansas City", "Olathe", "Topeka", "Lawrence", "Shawnee", "Manhattan", "Lenexa", "Salina"],
  "Kentucky": ["Louisville", "Lexington", "Bowling Green", "Owensboro", "Covington", "Hopkinsville", "Richmond", "Florence", "Georgetown", "Henderson"],
  "Louisiana": ["New Orleans", "Baton Rouge", "Shreveport", "Lafayette", "Lake Charles", "Kenner", "Bossier City", "Monroe", "Alexandria", "Houma"],
  "Maine": ["Portland", "Lewiston", "Bangor", "South Portland", "Auburn", "Biddeford", "Sanford", "Saco", "Augusta", "Westbrook"],
  "Maryland": ["Baltimore", "Frederick", "Rockville", "Gaithersburg", "Bowie", "Annapolis", "College Park", "Salisbury", "Laurel", "Greenbelt"],
  "Massachusetts": ["Boston", "Worcester", "Springfield", "Lowell", "Cambridge", "New Bedford", "Brockton", "Quincy", "Lynn", "Fall River"],
  "Michigan": ["Detroit", "Grand Rapids", "Warren", "Sterling Heights", "Lansing", "Ann Arbor", "Flint", "Dearborn", "Livonia", "Troy"],
  "Minnesota": ["Minneapolis", "St. Paul", "Rochester", "Duluth", "Bloomington", "Brooklyn Park", "Plymouth", "St. Cloud", "Eagan", "Woodbury"],
  "Mississippi": ["Jackson", "Gulfport", "Southaven", "Hattiesburg", "Biloxi", "Meridian", "Tupelo", "Greenville", "Olive Branch", "Horn Lake"],
  "Missouri": ["Kansas City", "St. Louis", "Springfield", "Columbia", "Independence", "Lee's Summit", "O'Fallon", "St. Joseph", "St. Charles", "St. Peters"],
  "Montana": ["Billings", "Missoula", "Great Falls", "Bozeman", "Butte", "Helena", "Kalispell", "Havre", "Anaconda", "Miles City"],
  "Nebraska": ["Omaha", "Lincoln", "Bellevue", "Grand Island", "Kearney", "Fremont", "Hastings", "North Platte", "Norfolk", "Columbus"],
  "Nevada": ["Las Vegas", "Henderson", "Reno", "North Las Vegas", "Sparks", "Carson City", "Fernley", "Elko", "Mesquite", "Boulder City"],
  "New Hampshire": ["Manchester", "Nashua", "Concord", "Derry", "Rochester", "Dover", "Salem", "Merrimack", "Londonderry", "Hudson"],
  "New Jersey": ["Newark", "Jersey City", "Paterson", "Elizabeth", "Edison", "Woodbridge", "Lakewood", "Toms River", "Hamilton", "Trenton"],
  "New Mexico": ["Albuquerque", "Las Cruces", "Rio Rancho", "Santa Fe", "Roswell", "Farmington", "Clovis", "Hobbs", "Carlsbad", "Alamogordo"],
  "New York": ["New York City", "Buffalo", "Rochester", "Yonkers", "Syracuse", "Albany", "New Rochelle", "Mount Vernon", "Schenectady", "Utica"],
  "North Carolina": ["Charlotte", "Raleigh", "Greensboro", "Durham", "Winston-Salem", "Fayetteville", "Cary", "Wilmington", "High Point", "Concord"],
  "North Dakota": ["Fargo", "Bismarck", "Grand Forks", "Minot", "West Fargo", "Williston", "Dickinson", "Mandan", "Jamestown", "Wahpeton"],
  "Ohio": ["Columbus", "Cleveland", "Cincinnati", "Toledo", "Akron", "Dayton", "Parma", "Canton", "Youngstown", "Lorain"],
  "Oklahoma": ["Oklahoma City", "Tulsa", "Norman", "Broken Arrow", "Lawton", "Edmond", "Moore", "Midwest City", "Enid", "Stillwater"],
  "Oregon": ["Portland", "Eugene", "Salem", "Gresham", "Hillsboro", "Bend", "Beaverton", "Medford", "Springfield", "Corvallis"],
  "Pennsylvania": ["Philadelphia", "Pittsburgh", "Allentown", "Erie", "Reading", "Scranton", "Bethlehem", "Lancaster", "Harrisburg", "Altoona"],
  "Rhode Island": ["Providence", "Warwick", "Cranston", "Pawtucket", "East Providence", "Woonsocket", "Newport", "Central Falls", "Westerly", "Cumberland"],
  "South Carolina": ["Charleston", "Columbia", "North Charleston", "Mount Pleasant", "Rock Hill", "Greenville", "Summerville", "Sumter", "Hilton Head Island", "Spartanburg"],
  "South Dakota": ["Sioux Falls", "Rapid City", "Aberdeen", "Brookings", "Watertown", "Mitchell", "Yankton", "Pierre", "Huron", "Vermillion"],
  "Tennessee": ["Nashville", "Memphis", "Knoxville", "Chattanooga", "Clarksville", "Murfreesboro", "Franklin", "Jackson", "Johnson City", "Bartlett"],
  "Texas": ["Houston", "San Antonio", "Dallas", "Austin", "Fort Worth", "El Paso", "Arlington", "Corpus Christi", "Plano", "Laredo", "Lubbock", "Garland", "Irving", "Amarillo", "Grand Prairie"],
  "Utah": ["Salt Lake City", "West Valley City", "Provo", "West Jordan", "Orem", "Sandy", "Ogden", "St. George", "Layton", "Taylorsville"],
  "Vermont": ["Burlington", "Essex", "South Burlington", "Colchester", "Rutland", "Montpelier", "Barre", "St. Albans", "Brattleboro", "Milton"],
  "Virginia": ["Virginia Beach", "Norfolk", "Chesapeake", "Richmond", "Newport News", "Alexandria", "Hampton", "Portsmouth", "Suffolk", "Roanoke"],
  "Washington": ["Seattle", "Spokane", "Tacoma", "Vancouver", "Bellevue", "Kent", "Everett", "Renton", "Yakima", "Federal Way"],
  "West Virginia": ["Charleston", "Huntington", "Parkersburg", "Morgantown", "Wheeling", "Martinsburg", "Fairmont", "Beckley", "Clarksburg", "South Charleston"],
  "Wisconsin": ["Milwaukee", "Madison", "Green Bay", "Kenosha", "Racine", "Appleton", "Waukesha", "Oshkosh", "Eau Claire", "Janesville"],
  "Wyoming": ["Cheyenne", "Casper", "Laramie", "Gillette", "Rock Springs", "Sheridan", "Green River", "Evanston", "Riverton", "Jackson"]
};

const fetchCountriesAPI = async () => {
  // Simple return - only US for now
  return [{ label: "United States", value: "United States" }];
};

const fetchStatesAPI = async (country) => {
  if (!country || country !== "United States") return [];
  return Object.keys(US_STATES_CITIES).map(state => ({ label: state, value: state }));
};

const fetchCitiesAPI = async (country, state) => {
  if (!country || !state || country !== "United States" || !US_STATES_CITIES[state]) return [];
  return US_STATES_CITIES[state].map(city => ({ label: city, value: city }));
};
function SearchableSelect({
  name,
  value,
  onChange,        // (string) => void
  options = [],    // [{label,value}]
  placeholder = "Select...",
  disabled = false,
  className = "w-full border px-4 py-2 rounded-lg"
}) {
  return (
    <>
      <input
        name={name}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        list={`${name}-list`}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
      />
      <datalist id={`${name}-list`}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </datalist>
    </>
  );
}
// === Reusable searchable dropdown (Clear + search input inside) ===
function SelectWithSearch({
  name,
  value,
  onChange,          // (string) => void
  options = [],      // [{label,value}]
  placeholder = "Select...",
  disabled = false,
  error = "",
  required = false,
  inputClass = "",
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");

  const ref = React.useRef(null);

  React.useEffect(() => {
    function onDocClick(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      {/* Display box */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((s) => !s)}
        className={`w-full text-left border px-4 py-2 rounded-lg bg-white ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} ${error ? "border-red-500" : "border-gray-400"} ${inputClass}`}
      >
        {value || <span className="text-gray-400">{placeholder}</span>}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl">
          {/* Search box */}
          <div className="p-3 border-b">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${name.toLowerCase()}...`}
              className="w-full border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 px-3 py-2 rounded-lg"
            />
          </div>

          <div className="max-h-56 overflow-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-gray-500 text-sm">No results</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setQ("");
                  }}
                  className={`w-full text-left px-4 py-2 hover:bg-blue-50 ${opt.value === value ? "bg-blue-50" : ""}`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>

          <div className="flex justify-end p-2 border-t">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setQ("");
                // panel open rehne do so user pick kare
              }}
              className="px-3 py-1 rounded-lg border text-sm hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* error text */}
      {error ? (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      ) : null}
    </div>
  );
}

// === Helpers: validations + utils ===
const formatDDMMYYYY = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return '—';
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yy = dt.getFullYear();
  return `${dd}/${mm}/${yy}`;
};

const isValidEmail = (val = '') =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(val).trim());

// const isValidPhone = (val) =>
//   /^[6-9]\d{9}$/.test(String(val || '').trim());

// ZIP validation: Supports US (5 digits or 5-4 format) and India (6 digits)
const isValidZip = (val) => {
  const trimmed = String(val || '').trim();
  // US format: 5 digits or 5-4 format (e.g., 12345 or 12345-6789)
  const usZipPattern = /^\d{5}(-\d{4})?$/;
  // India PIN: exactly 6 digits, first not 0
  const indiaPinPattern = /^[1-9]\d{5}$/;
  return usZipPattern.test(trimmed) || indiaPinPattern.test(trimmed);
};

const ALLOWED_DOC_EXT = ['PDF', 'DOC', 'DOCX'];
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const getExt = (nameOrUrl = '') => (nameOrUrl.split('?')[0].split('.').pop() || '').toUpperCase();
const fileIsAllowed = (file) => !!file && ALLOWED_DOC_EXT.includes(getExt(file.name)) && file.size <= MAX_FILE_BYTES;

const IMG_EXTS = ['PNG', 'JPG', 'JPEG', 'GIF', 'WEBP'];
const isImageUrl = (url = '') => IMG_EXTS.includes(getExt(url));
const absUrl = (u) => (u?.startsWith('http') ? u : `${API_CONFIG.BASE_URL}/${u}`);

// NEW: common attachment validator (images/pdf/doc upto 10MB)
const ALLOWED_ACTION_EXT = ['PNG', 'JPG', 'JPEG', 'WEBP', 'PDF', 'DOC', 'DOCX'];
const actionFileIsAllowed = (file) => {
  if (!file) return true;
  const ext = (file.name.split('.').pop() || '').toUpperCase();
  return ALLOWED_ACTION_EXT.includes(ext) && file.size <= MAX_FILE_BYTES;
};


export default function TruckerDocuments() {
  const [editErrors, setEditErrors] = useState({});
  const [docErrors, setDocErrors] = useState({});
  const [truckers, setTruckers] = useState([]);
  const [viewDoc, setViewDoc] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [selectedTrucker, setSelectedTrucker] = useState(null);
  const [reason, setReason] = useState('');
  const [showAddTruckerForm, setShowAddTruckerForm] = useState(false);
  const [Loading, setLoading] = useState(true);
  const [showTruckerModal, setShowTruckerModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [editUploadStatus, setEditUploadStatus] = useState({
    brokeragePacket: false,
    carrierPartnerAgreement: false,
    w9Form: false,
    mcAuthority: false,
    safetyLetter: false,
    bankingInfo: false,
    inspectionLetter: false,
    insurance: false,
  });
  const [error, setError] = useState(null);
  // NEW: Blacklist/OK action states
  const [actionType, setActionType] = useState(''); // '', 'ok', 'blacklist'
  const [actionLoading, setActionLoading] = useState(false);
  const [actionErrors, setActionErrors] = useState({});
  const [actionForm, setActionForm] = useState({
    reason: '',
    remarks: '',
    attachment: null, // File
  });

// Geo dropdown state (for EDIT modal)
const [countryOptions, setCountryOptions] = useState([]);
const [stateOptions, setStateOptions] = useState([]);
const [cityOptions, setCityOptions] = useState([]);
const [geoLoading, setGeoLoading] = useState({
  countries: false,
  states: false,
  cities: false,
});

// Secondary Address Geo dropdown state
const [secondaryStateOptions, setSecondaryStateOptions] = useState([]);
const [secondaryCityOptions, setSecondaryCityOptions] = useState([]);
const [secondaryGeoLoading, setSecondaryGeoLoading] = useState({
  states: false,
  cities: false,
});

// Cache refs for geo data
const statesCacheRef = useRef({});  // { [country]: [{label,value}] }
const citiesCacheRef = useRef({});  // { [`${country}|${state}`]: [{label,value}] }

useEffect(() => {
  // Jab edit modal open ho, countries lao; aur agar form me country/state pehle se hai to dependent bhi
  if (!showEditModal) return;

  let mounted = true;
  (async () => {
    try {
      setGeoLoading((p) => ({ ...p, countries: true }));
      const countries = await fetchCountriesAPI();
      if (!mounted) return;
      setCountryOptions(countries);

      // agar record me pehle se country pada hai
      const ctry = (editFormData.country || "").trim();
      if (ctry) {
        setGeoLoading((p) => ({ ...p, states: true }));
        const states = await fetchStatesAPI(ctry);
        if (!mounted) return;
        setStateOptions(states);

        const st = (editFormData.state || "").trim();
        if (st) {
          setGeoLoading((p) => ({ ...p, cities: true }));
          const cities = await fetchCitiesAPI(ctry, st);
          if (!mounted) return;
          setCityOptions(cities);
        } else {
          setCityOptions([]);
        }
      } else {
        setStateOptions([]);
        setCityOptions([]);
      }

      // Load working address cities if exists (preload for existing states)
      if (editFormData.workingAddress && editFormData.workingAddress.length > 0) {
        const country = editFormData.country || "";
        if (country) {
          for (const addr of editFormData.workingAddress) {
            if (addr.state) {
              const key = `${country}|${addr.state}`;
              if (!citiesCacheRef.current[key]) {
                try {
                  const cities = await fetchCitiesAPI(country, addr.state);
                  if (mounted) {
                    citiesCacheRef.current[key] = cities;
                  }
                } catch (e) {
                  console.error("Failed to preload cities for working address", e);
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.error("Countries/States preload failed:", e?.message || e);
      // minimal fallback
      if (mounted && countryOptions.length === 0) {
        setCountryOptions([{ label: "United States", value: "United States" }]);
      }
    } finally {
      setGeoLoading({ countries: false, states: false, cities: false });
      setSecondaryGeoLoading({ states: false, cities: false });
    }
  })();

  return () => { mounted = false; };
}, [showEditModal]);
const handleCountrySelect = async (country) => {
  setEditFormData((p) => ({ ...p, country, state: "", city: "" }));
  setStateOptions([]);
  setCityOptions([]);
  if (!country) return;
  try {
    setGeoLoading((p) => ({ ...p, states: true }));
    const states = await fetchStatesAPI(country);
    setStateOptions(states);
  } finally {
    setGeoLoading((p) => ({ ...p, states: false }));
  }
};

const handleStateSelect = async (state) => {
  const country = editFormData.country || "";
  setEditFormData((p) => ({ ...p, state, city: "" }));
  setCityOptions([]);
  if (!country || !state) return;
  try {
    setGeoLoading((p) => ({ ...p, cities: true }));
    const cities = await fetchCitiesAPI(country, state);
    setCityOptions(cities);
  } finally {
    setGeoLoading((p) => ({ ...p, cities: false }));
  }
};

const handleCitySelect = (city) => {
  setEditFormData((p) => ({ ...p, city }));
};

// Working Address handlers
const handleAddWorkingAddress = () => {
  setEditFormData(prev => ({
    ...prev,
    workingAddress: [...(prev.workingAddress || []), { state: "", city: "", attachment: null, attachmentUrl: "" }]
  }));
};

const handleRemoveWorkingAddress = (idx) => {
  setEditFormData(prev => ({
    ...prev,
    workingAddress: prev.workingAddress.filter((_, i) => i !== idx)
  }));
};

const handleWorkingAddressStateChange = async (idx, state) => {
  const updated = [...editFormData.workingAddress];
  updated[idx] = { ...updated[idx], state, city: "" };
  setEditFormData(prev => ({ ...prev, workingAddress: updated }));
  
  // Load cities for the selected state and cache them
  if (state && editFormData.country) {
    try {
      const key = `${editFormData.country}|${state}`;
      if (!citiesCacheRef.current[key]) {
        const cities = await fetchCitiesAPI(editFormData.country, state);
        citiesCacheRef.current[key] = cities;
      }
    } catch (e) {
      console.error("Failed to load cities", e);
    }
  }
};

const handleWorkingAddressCityChange = (idx, city) => {
  const updated = [...editFormData.workingAddress];
  updated[idx] = { ...updated[idx], city };
  setEditFormData(prev => ({ ...prev, workingAddress: updated }));
};

const handleWorkingAddressFileChange = (idx, file) => {
  const updated = [...editFormData.workingAddress];
  updated[idx] = { ...updated[idx], attachment: file };
  setEditFormData(prev => ({ ...prev, workingAddress: updated }));
};

  // Document fields configuration
  const documentFields = [
    { key: 'brokeragePacket', label: 'Brokerage Packet', required: true },
    { key: 'carrierPartnerAgreement', label: 'Carrier Partner Agreement' },
    { key: 'w9Form', label: 'W9 Form', required: true },
    { key: 'mcAuthority', label: 'MC Authority', required: true },
    { key: 'safetyLetter', label: 'Safety Letter', required: false },
    { key: 'bankingInfo', label: 'Banking Information', required: true },
    { key: 'inspectionLetter', label: 'Inspection Letter', required: false },
    { key: 'insurance', label: 'Insurance', required: true },
  ];

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTruckers();
  }, []);

  const fetchTruckers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is authenticated
      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      if (!token) {
        setError("Authentication required. Please login again.");
        setLoading(false);
        return;
      }

      // Create axios instance with auth header
      const axiosInstance = axios.create({
        baseURL: `${API_CONFIG.BASE_URL}`,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Try different endpoints based on user role
      let response;
      try {
        // First try the CMT specific endpoint
        response = await axiosInstance.get('/api/v1/shipper_driver/cmt/truckers');
        response = response.data; // Extract data from axios response
      } catch (cmtError) {

        try {
          // Fallback to general truckers endpoint
          response = await axiosInstance.get('/api/v1/truckers');
          response = response.data; // Extract data from axios response
        } catch (generalError) {

          // Try one more endpoint
          response = await axiosInstance.get('/api/v1/shipper_driver/truckers');
          response = response.data; // Extract data from axios response
        }
      }

      // Handle different response structures
      let truckersList = [];
      if (response.truckers) {
        truckersList = response.truckers;
      } else if (response.data && response.data.truckers) {
        truckersList = response.data.truckers;
      } else if (response.data && Array.isArray(response.data)) {
        truckersList = response.data;
      } else if (Array.isArray(response)) {
        truckersList = response;
      }
      
      // Debug: Log first trucker to see structure
      if (truckersList.length > 0) {

        console.log(JSON.stringify(truckersList[0], null, 2));
      }
      
      setTruckers(truckersList);
    } catch (err) {
      console.error('Error fetching truckers:', err);
      if (err.message.includes('403') || err.message.includes('401')) {
        setError("Access denied. Please check your permissions or login again.");
      } else if (err.message.includes('500')) {
        setError("Server error. Please try again later.");
      } else {
        setError("Failed to load truckers. Please try again.");
      }
      setTruckers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status) => {
    try {
      const { userId } = selectedTrucker;

      // Get authentication token
      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");

      // Create axios instance with auth header
      const axiosInstance = axios.create({
        baseURL: `${API_CONFIG.BASE_URL}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      await axiosInstance.patch(`/api/v1/shipper_driver/update-status/${userId}`, {
        status,
        statusReason: reason || null,
      });
      setModalType(null);
      setReason('');
      setSelectedTrucker(null);
      setViewDoc(false);
      fetchTruckers(); // Refresh
    } catch (err) {
      console.error('Status update failed:', err);
      alert('Failed to update status. Please try again.');
    }
  };

  // Handle edit trucker
  // NOTE: Currently using data from table row. There is NO API call to fetch a single trucker.
  // The edit form data comes directly from the trucker object passed when clicking Edit button.
  const handleEditTrucker = (trucker) => {

    // Get company address - API uses 'compAdd' field
    const companyAddress = trucker.compAdd || trucker.address || trucker.companyAddress || trucker.compAddress || '';
    
    // Get zip code - API uses 'zipcode' field (lowercase)
    const zipCodeValue = trucker.zipcode || trucker.zipCode || trucker.pinCode || trucker.pincode || trucker.postalCode || trucker.zip || '';


    // Get working address data
    const workingAddr = trucker.workingAddress || [];
    
    setEditFormData({
      _id: trucker._id || trucker.userId,
      compName: trucker.compName || '',
      email: trucker.email || trucker.emailId || trucker.contactEmail || '',
      phoneNo: trucker.phoneNo || '',
      secondaryPhoneNo: trucker.secondaryPhoneNo || '',
      mc_dot_no: trucker.mc_dot_no || '',
      carrierType: trucker.carrierType || '',
      fleetsize: trucker.fleetsize || '',
      city: trucker.city || '',
      state: trucker.state || '',
      country: trucker.country || '',
      // Company address - API response uses 'compAdd'
      address: companyAddress,
      // Zip code - API response uses 'zipcode' (lowercase)
      zipCode: zipCodeValue,
      // Working Address (array)
      workingAddress: Array.isArray(workingAddr) ? workingAddr.map(addr => ({
        state: addr.state || '',
        city: addr.city || '',
        attachment: null, // File will be uploaded separately
        attachmentUrl: addr.attachment || '' // Keep existing URL if any
      })) : [],
      status: trucker.status || 'pending',

      // ... (baaki document URLs same rakhna)
      // (yahan tumhare pehle wale absolute URL mapping hi rehne do)

      brokeragePacketUrl: (trucker.brokeragePacketUrl || trucker.brokeragePacket || trucker.documents?.brokeragePacket) ? absUrl(trucker.brokeragePacketUrl || trucker.brokeragePacket || trucker.documents?.brokeragePacket) : null,
      brokeragePacketFileName: trucker.brokeragePacketFileName || trucker.brokeragePacketName || null,
      carrierPartnerAgreementUrl: (trucker.carrierPartnerAgreementUrl || trucker.carrierPartnerAgreement || trucker.documents?.carrierPartnerAgreement) ? absUrl(trucker.carrierPartnerAgreementUrl || trucker.carrierPartnerAgreement || trucker.documents?.carrierPartnerAgreement) : null,
      carrierPartnerAgreementFileName: trucker.carrierPartnerAgreementFileName || trucker.carrierPartnerAgreementName || null,
      w9FormUrl: (trucker.w9FormUrl || trucker.w9Form || trucker.documents?.w9Form) ? absUrl(trucker.w9FormUrl || trucker.w9Form || trucker.documents?.w9Form) : null,
      w9FormFileName: trucker.w9FormFileName || trucker.w9FormName || null,
      mcAuthorityUrl: (trucker.mcAuthorityUrl || trucker.mcAuthority || trucker.documents?.mcAuthority) ? absUrl(trucker.mcAuthorityUrl || trucker.mcAuthority || trucker.documents?.mcAuthority) : null,
      mcAuthorityFileName: trucker.mcAuthorityFileName || trucker.mcAuthorityName || null,
      safetyLetterUrl: (trucker.safetyLetterUrl || trucker.safetyLetter || trucker.documents?.safetyLetter) ? absUrl(trucker.safetyLetterUrl || trucker.safetyLetter || trucker.documents?.safetyLetter) : null,
      safetyLetterFileName: trucker.safetyLetterFileName || trucker.safetyLetterName || null,
      bankingInfoUrl: (trucker.bankingInfoUrl || trucker.bankingInfo || trucker.documents?.bankingInfo) ? absUrl(trucker.bankingInfoUrl || trucker.bankingInfo || trucker.documents?.bankingInfo) : null,
      bankingInfoFileName: trucker.bankingInfoFileName || trucker.bankingInfoName || null,
      inspectionLetterUrl: (trucker.inspectionLetterUrl || trucker.inspectionLetter || trucker.documents?.inspectionLetter) ? absUrl(trucker.inspectionLetterUrl || trucker.inspectionLetter || trucker.documents?.inspectionLetter) : null,
      inspectionLetterFileName: trucker.inspectionLetterFileName || trucker.inspectionLetterName || null,
      insuranceUrl: (trucker.insuranceUrl || trucker.insurance || trucker.documents?.insurance) ? absUrl(trucker.insuranceUrl || trucker.insurance || trucker.documents?.insurance) : null,
      insuranceFileName: trucker.insuranceFileName || trucker.insuranceName || null,

      // new file placeholders
      brokeragePacket: null,
      carrierPartnerAgreement: null,
      w9Form: null,
      mcAuthority: null,
      safetyLetter: null,
      bankingInfo: null,
      inspectionLetter: null,
      insurance: null,

    });

    // Reset upload status
    setEditUploadStatus({
      brokeragePacket: false,
      carrierPartnerAgreement: false,
      w9Form: false,
      mcAuthority: false,
      safetyLetter: false,
      bankingInfo: false,
      inspectionLetter: false,
      insurance: false,
    });

    setShowEditModal(true);
  };

  // Handle edit form submission
  const handleEditSubmit = async (e) => {
    e.preventDefault();

    // 1) Field validations
    const errs = {};
    if (!editFormData.compName?.trim()) errs.compName = true;
    // email required + format
    if (!editFormData.email?.trim()) {
      errs.email = 'required';
    } else if (!isValidEmail(editFormData.email)) {
      errs.email = 'invalid';
    }

    if (!editFormData.address?.trim()) errs.address = true;
    if (!editFormData.country?.trim()) errs.country = true;
    if (!editFormData.state?.trim()) errs.state = true;
    if (!editFormData.city?.trim()) errs.city = true;

    if (!editFormData.zipCode?.trim()) errs.zipCode = true;
    else if (!isValidZip(editFormData.zipCode)) errs.zipCode = true;

    // if (!isValidPhone(editFormData.phoneNo)) errs.phoneNo = true;
    if (!editFormData.mc_dot_no?.trim()) errs.mc_dot_no = true;
    if (!editFormData.carrierType?.trim()) errs.carrierType = true;
    if (editFormData.fleetsize === '' || editFormData.fleetsize === null || Number(editFormData.fleetsize) <= 0) {
      errs.fleetsize = true;
    }

    setEditErrors(errs);
    if (Object.keys(errs).length) return;

    // 2) Documents validations
    const requiredDocKeys = ['brokeragePacket', 'w9Form', 'mcAuthority', 'bankingInfo', 'insurance'];

    const missingRequired = [];
    const badFiles = [];

    requiredDocKeys.forEach((k) => {
      const existingUrl = editFormData[`${k}Url`];
      const newFile = editFormData[k];

      if (!existingUrl && !newFile) {
        missingRequired.push(k);
      }
      if (newFile && !fileIsAllowed(newFile)) {
        badFiles.push(k);
      }
    });

    if (missingRequired.length) {
      const msgMap = {
        brokeragePacket: 'Please choose the Brokerage Packet file.',
        w9Form: 'Please choose the W9 Form file.',
        mcAuthority: 'Please choose the MC Authority file.',
        bankingInfo: 'Please choose the Banking Information file.',
        insurance: 'Please choose the Insurance file.',
      };
      alert(missingRequired.map(k => msgMap[k]).join('\n'));
      return;
    }

    if (badFiles.length) {
      alert('Please select the .pdf , .doc and .docx file only and size <= 10 MB.');
      return;
    }

    try {
      // 3) Prepare payloads
      const documentsFormData = new FormData();
      documentFields.forEach(doc => {
        if (editFormData[doc.key]) {
          documentsFormData.append(doc.key, editFormData[doc.key]);
        }
      });

      // Add workingAddress and attachments to documentsFormData
      if (editFormData.workingAddress && editFormData.workingAddress.length > 0) {
        // Filter addresses that have at least state, city, or attachment
        const validAddresses = editFormData.workingAddress.filter(addr => 
          addr.state?.trim() || addr.city?.trim() || (addr.attachment && addr.attachment instanceof File)
        );
        
        if (validAddresses.length > 0) {
          // Filter addresses that have state/city for JSON (attachments can be separate)
          const addressesWithLocation = validAddresses.filter(addr => 
            addr.state?.trim() || addr.city?.trim()
          );
          
          // Send workingAddress as JSON string (only state and city, no attachments in JSON)
          const workingAddressJson = addressesWithLocation.map(addr => ({
            state: addr.state?.trim() || "",
            city: addr.city?.trim() || ""
          }));
          
          // Always send workingAddress JSON
          if (workingAddressJson.length > 0) {
            documentsFormData.append("workingAddress", JSON.stringify(workingAddressJson));
            console.log('workingAddress JSON:', JSON.stringify(workingAddressJson));
          }
          
          // Send workingAddressAttachments (multiple files)
          // IMPORTANT: Send attachments in the SAME order as addressesWithLocation array
          // Backend will match attachment[0] with workingAddress[0], etc.
          // Match by iterating through addressesWithLocation and sending File if present
          let attachmentCount = 0;
          addressesWithLocation.forEach((addr, idx) => {
            // Only send if it's a File object (new upload), not a URL string (existing)
            if (addr.attachment && addr.attachment instanceof File) {
              documentsFormData.append("workingAddressAttachments", addr.attachment);
              attachmentCount++;
              console.log(`Added workingAddressAttachments[${idx}]:`, addr.attachment.name, `(${addr.attachment.size} bytes) for address: ${addr.state}, ${addr.city}`);
            } else {
              console.log(`No new attachment for workingAddress[${idx}]:`, addr.state, addr.city, `(existing: ${addr.attachmentUrl || 'none'})`);
            }
          });
          console.log(`Total workingAddressAttachments to send: ${attachmentCount} out of ${addressesWithLocation.length} addresses`);
          
          // Ensure we're sending workingAddress even if no attachments (backend needs it)
          if (attachmentCount === 0 && workingAddressJson.length > 0) {
            console.warn('⚠️ No attachments to send, but workingAddress JSON will be sent');
          }
        }
      }

      const jsonData = {
        compName: editFormData.compName,
        email: editFormData.email,
        phoneNo: editFormData.phoneNo,
        secondaryPhoneNo: editFormData.secondaryPhoneNo || '',
        mc_dot_no: editFormData.mc_dot_no,
        carrierType: editFormData.carrierType,
        fleetsize: editFormData.fleetsize,
        city: editFormData.city,
        state: editFormData.state,
        country: editFormData.country,
        address: editFormData.address,
        zipCode: editFormData.zipCode,
        // Working Address (only if array has entries, without attachments)
        ...(editFormData.workingAddress && editFormData.workingAddress.length > 0 ? {
          workingAddress: editFormData.workingAddress
            .filter(addr => addr.state?.trim() || addr.city?.trim())
            .map(addr => ({
              state: addr.state?.trim() || "",
              city: addr.city?.trim() || ""
            }))
        } : {})
      };

      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const axiosInstance = axios.create({
        baseURL: `${API_CONFIG.BASE_URL}`,
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // 4) API calls
      const hasFileUploads = documentFields.some(doc => editFormData[doc.key]);
      const hasWorkingAddressAttachments = editFormData.workingAddress?.some(addr => 
        addr.attachment && addr.attachment instanceof File
      );
      
      // Debug: Log FormData contents
      console.log('Documents FormData contents:');
      for (let [key, value] of documentsFormData.entries()) {
        if (value instanceof File) {
          console.log(`${key}:`, value.name, `(${value.size} bytes)`);
        } else {
          console.log(`${key}:`, value);
        }
      }
      
      // Send documents and workingAddress attachments together to documents endpoint
      if (hasFileUploads || hasWorkingAddressAttachments) {
        console.log('Sending to documents endpoint:', hasFileUploads, hasWorkingAddressAttachments);
        try {
          // Note: Don't set Content-Type header - let axios set it automatically with boundary
          const documentsResponse = await axiosInstance.put(
            `/api/v1/shipper_driver/update/${editFormData._id}/documents`,
            documentsFormData
          );
          console.log('Documents API Response:', documentsResponse.data);
          if (documentsResponse.data?.workingAddress) {
            console.log('Updated workingAddress from API:', documentsResponse.data.workingAddress);
          }
        } catch (error) {
          console.error('Error uploading documents/workingAddress attachments:', error);
          console.error('Error response:', error.response?.data);
          throw error; // Re-throw to show error to user
        }
      }

      // Send main update (workingAddress included in jsonData if present)
      await axiosInstance.put(
        `/api/v1/shipper_driver/update/${editFormData._id}`,
        jsonData,
        { headers: { 'Content-Type': 'application/json' } }
      );

      // 5) Reset + refresh
      setShowEditModal(false);
      setEditFormData({});
      setEditUploadStatus({
        brokeragePacket: false,
        carrierPartnerAgreement: false,
        w9Form: false,
        mcAuthority: false,
        safetyLetter: false,
        bankingInfo: false,
        inspectionLetter: false,
        insurance: false,
      });
      await fetchTruckers();
      alert('Trucker Update successfully.');

    } catch (err) {
      console.error('Error updating trucker:', err);
      alert('Failed to update trucker. Please try again.');
    }
  };


  // Handle input change for edit form
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle file change for edit form
  // Handle file change for edit form (with inline validation)
  const handleEditFileChange = (e) => {
    const { name, files } = e.target;
    if (!(files && files[0])) {
      // clear chosen file + error (user cleared)
      setEditFormData(prev => ({ ...prev, [name]: null }));
      setEditUploadStatus(prev => ({ ...prev, [name]: false }));
      setDocErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
      return;
    }

    const file = files[0];
    const ext = (file.name.split('.').pop() || '').toUpperCase();

    let errMsg = '';
    if (!['PDF', 'DOC', 'DOCX'].includes(ext)) {
      errMsg = 'Please select the .pdf, .doc and .docx file only.';
    } else if (file.size > 10 * 1024 * 1024) {
      errMsg = 'Please choose the file less than 10 MB.';
    }

    if (errMsg) {
      // set error and DO NOT attach invalid file
      setDocErrors(prev => ({ ...prev, [name]: errMsg }));
      setEditFormData(prev => ({ ...prev, [name]: null }));
      setEditUploadStatus(prev => ({ ...prev, [name]: false }));
    } else {
      // valid
      setDocErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
      setEditFormData(prev => ({ ...prev, [name]: file }));
      setEditUploadStatus(prev => ({ ...prev, [name]: true }));
    }
  };

  // NEW: handle changes
  const handleActionInput = (e) => {
    const { name, value, files } = e.target;
    if (name === 'attachment') {
      const f = files?.[0] || null;
      if (f && !actionFileIsAllowed(f)) {
        setActionErrors(prev => ({ ...prev, attachment: 'Only images/pdf/doc (≤10 MB) allowed.' }));
        setActionForm(prev => ({ ...prev, attachment: null }));
      } else {
        setActionErrors(prev => { const c = { ...prev }; delete c.attachment; return c; });
        setActionForm(prev => ({ ...prev, attachment: f }));
      }
      return;
    }
    setActionForm(prev => ({ ...prev, [name]: value }));
  };

  // NEW: submit to API
  const handleAccountAction = async (e) => {
    e.preventDefault();
    if (!actionType) return;

    // basic validation
    const errs = {};
    if (!actionForm.reason?.trim()) errs.reason = true;
    if (!actionFileIsAllowed(actionForm.attachment)) errs.attachment = 'Invalid file.';
    setActionErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      setActionLoading(true);

      // token + axios
      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      const axiosInstance = axios.create({
        baseURL: `${API_CONFIG.BASE_URL}`,
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // userId resolve (we saved _id as _id || userId earlier)
      const userId = editFormData._id || selectedTrucker?.userId || selectedTrucker?._id;

      const fd = new FormData();
      // NOTE: backend aapke screenshots ke mutabik form-data expect karta hai
      if (actionType === 'blacklist') {
        fd.append('blacklistReason', actionForm.reason);
        if (actionForm.remarks) fd.append('blacklistRemarks', actionForm.remarks);
        if (actionForm.attachment) fd.append('attachments', actionForm.attachment);
        // optional: kabhi-kabhi API userid key bhi leti hai, harmless to add:
        fd.append('userid', userId);

        await axiosInstance.put(`/api/v1/shipper_driver/blacklist/${userId}`, fd);
        alert('User blacklisted successfully.');
      } else {
        // OK → remove from blacklist
        fd.append('removalReason', actionForm.reason);
        if (actionForm.remarks) fd.append('removalRemarks', actionForm.remarks);
        if (actionForm.attachment) fd.append('attachments', actionForm.attachment);

        await axiosInstance.put(`/api/v1/shipper_driver/blacklist/${userId}/remove`, fd);
        alert('User removed from blacklist successfully.');
      }

      // reset + refresh
      setActionType('');
      setActionForm({ reason: '', remarks: '', attachment: null });
      await fetchTruckers();
      setShowEditModal(false); // optional: close modal after action
    } catch (err) {
      console.error('Account action failed:', err);
      alert('Failed to complete account action. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Get upload icon for edit form
  const getEditUploadIcon = (fieldName) => {
    if (editUploadStatus[fieldName]) {
      return <CheckCircle className="text-green-500" size={20} />;
    }
    return <Upload className="text-gray-400" size={20} />;
  };

  // Debug function to test different endpoints
  const testEndpoints = async () => {
    const endpoints = [
      '/api/v1/shipper_driver/cmt/truckers',
      '/api/v1/truckers',
      '/api/v1/shipper_driver/truckers',
      '/api/v1/inhouseUser/department/CMT'
    ];

    // Get authentication token
    const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");

    // Create axios instance with auth header
    const axiosInstance = axios.create({
      baseURL: `${API_CONFIG.BASE_URL}`,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    for (const endpoint of endpoints) {
      try {

        const response = await axiosInstance.get(endpoint);

        return response.data;
      } catch (error) {

      }
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

  // Search and filter functionality
  const filteredTruckers = truckers.filter(trucker => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      trucker.compName?.toLowerCase().includes(searchLower) ||
      trucker.email?.toLowerCase().includes(searchLower) ||
      trucker.mc_dot_no?.toLowerCase().includes(searchLower) ||
      trucker.phoneNo?.toLowerCase().includes(searchLower)
    );
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredTruckers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTruckers = filteredTruckers.slice(startIndex, endIndex);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Handle view trucker details
  const handleViewTrucker = (trucker) => {
    setSelectedTrucker(trucker);
    setShowTruckerModal(true);
  };

  // Handle document preview
  const handleDocumentPreview = (documentUrl, documentName) => {
    setSelectedDocument({ url: documentUrl, name: documentName });
  };

  // Get document display name
  const getDocumentDisplayName = (docKey) => {
    const displayNames = {
      brokeragePacket: 'Brokerage Packet',
      carrierPartnerAgreement: 'Carrier Partner Agreement',
      w9Form: 'W9 Form',
      mcAuthority: 'MC Authority',
      safetyLetter: 'Safety Letter',
      bankingInfo: 'Banking Information',
      inspectionLetter: 'Inspection Letter',
      insurance: 'Insurance'
    };
    return displayNames[docKey] || docKey;
  };



  if (previewImg) {
    return (
      <div 
        className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center"
        onClick={() => setPreviewImg(null)}
      >
        <div 
          className="relative bg-white rounded-2xl shadow-2xl overflow-hidden p-4"
          onClick={(e) => e.stopPropagation()}
        >
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

  if (selectedDocument) {
    return (
      <div 
        className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4"
        onClick={() => setSelectedDocument(null)}
      >
        <div 
          className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 flex justify-between items-center">
            <h3 className="text-lg font-semibold">{selectedDocument.name}</h3>
            <button
              onClick={() => setSelectedDocument(null)}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
          <div className="p-4">
            {isImageUrl(selectedDocument.url) ? (
              <img
                src={selectedDocument.url}
                alt={selectedDocument.name}
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                <div className="text-center">
                  <FaFileAlt className="text-6xl text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Document preview not available</p>
                  <a
                    href={selectedDocument.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                  >
                    Download Document
                  </a>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    );
  }

  if (modalType) {
    return (
      <div 
        className="fixed inset-0 z-50 backdrop-blur-sm bg-black/30 flex items-center justify-center"
        onClick={() => setModalType(null)}
      >
        <div 
          className="bg-white p-8 rounded-2xl shadow-2xl w-[400px] relative flex flex-col items-center"
          onClick={(e) => e.stopPropagation()}
        >
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

  if (showEditModal) {
    return (
      <div 
        className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4"
      >
        <div 
          className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-auto max-h-[90vh] p-4 bg-gradient-to-br from-blue-200 via-white to-blue-300" 
          style={{
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none', // IE 10+
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <style>{`
             .hide-scrollbar::-webkit-scrollbar { display: none; }
           `}</style>
          <button
            onClick={() => setShowEditModal(false)}
            className="absolute top-3 right-3 text-gray-500 hover:text-black text-2xl"
          >
            ×
          </button>
          <div className="hide-scrollbar">
            <form noValidate onSubmit={handleEditSubmit} className="w-full max-w-2xl flex flex-col gap-4">
              {/* Basic Details Card */}
              <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl mb-1 p-8 flex flex-col items-center">
                <h4 className="text-2xl font-bold mb-4 text-center">Basic Details</h4>
                <div className="w-full flex flex-col gap-4">
                  {/* Company Name full width */}
                  <label className="text-sm font-medium text-gray-700">Company Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="compName"
                    placeholder="Company Name"
                    value={editFormData.compName}
                    onChange={handleEditInputChange}
                    className={`w-full border px-4 py-2 rounded-lg ${editErrors.compName ? 'border-red-500' : 'border-gray-400'}`}

                  />
                  {editErrors.compName && <p className="text-xs text-red-600 mt-1">Please enter the company name.</p>}

                  {/* Company Address */}
                  <label className="text-sm font-medium text-gray-700 mt-3">Company Address <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="address"
                    placeholder="Company Address"
                    value={editFormData.address}
                    onChange={handleEditInputChange}
                    className={`w-full border px-4 py-2 rounded-lg ${editErrors.address ? 'border-red-500' : 'border-gray-400'}`}

                  />
                  {editErrors.address && <p className="text-xs text-red-600 mt-1">Please enter the company address.</p>}

                  {/* Email */}
                  <label className="text-sm font-medium text-gray-700 mt-3">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email Address"
                    value={editFormData.email}
                    onChange={handleEditInputChange}
                    className={`w-full border px-4 py-2 rounded-lg ${editErrors.email ? 'border-red-500' : 'border-gray-400'}`}
                    aria-invalid={!!editErrors.email}
                    aria-describedby={editErrors.email ? 'email-err' : undefined}
                  />
                  {editErrors.email && (
                    <p id="email-err" className="text-xs text-red-600 mt-1">
                      {editErrors.email === 'invalid'
                        ? 'Please enter a valid email address.'
                        : 'Please enter the email address.'}
                    </p>
                  )}


                  {/* Phone | MC/DOT */}
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Phone <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="phoneNo"
                        placeholder="10-digit Mobile (starts 6-9)"
                        value={editFormData.phoneNo}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setEditFormData(prev => ({ ...prev, phoneNo: v }));
                        }}
                        onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
                        inputMode="numeric"
                        className={`w-full border px-4 py-2 rounded-lg ${editErrors.phoneNo ? 'border-red-500' : 'border-gray-400'}`}

                      />
                      {editErrors.phoneNo && <p className="text-xs text-red-600 mt-1">Please enter the valid mobile number.</p>}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">MC/DOT No <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="mc_dot_no"
                        placeholder="MC/DOT Number"
                        value={editFormData.mc_dot_no}
                        onChange={handleEditInputChange}
                        className={`w-full border px-4 py-2 rounded-lg ${editErrors.mc_dot_no ? 'border-red-500' : 'border-gray-400'}`}

                      />
                      {editErrors.mc_dot_no && <p className="text-xs text-red-600 mt-1">Please enter the mc/dot no.</p>}
                    </div>
                  </div>

                  {/* Secondary Phone Number */}
                  <div className="mt-3">
                    <label className="text-sm font-medium text-gray-700">Secondary Phone Number</label>
                    <input
                      type="text"
                      name="secondaryPhoneNo"
                      placeholder="Secondary Phone Number (Optional)"
                      value={editFormData.secondaryPhoneNo || ''}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setEditFormData(prev => ({ ...prev, secondaryPhoneNo: v }));
                      }}
                      onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
                      inputMode="numeric"
                      className="w-full border px-4 py-2 rounded-lg border-gray-400"
                    />
                  </div>

                  {/* City | State */}
                  <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
    <label className="text-sm font-medium text-gray-700">
      Country <span className="text-red-500">*</span>
    </label>
    <SelectWithSearch
      name="Country"
      value={editFormData.country}
      onChange={handleCountrySelect}
      options={countryOptions}
      placeholder={geoLoading.countries ? "Loading..." : "Select..."}
      disabled={geoLoading.countries}
      error={editErrors.country ? "Please enter the county." : ""}
    />
  </div>


                   <div>
    <label className="text-sm font-medium text-gray-700">
      State <span className="text-red-500">*</span>
    </label>
    <SelectWithSearch
      name="State"
      value={editFormData.state}
      onChange={handleStateSelect}
      options={stateOptions}
      placeholder={geoLoading.states ? "Loading..." : "Select..."}
      disabled={!editFormData.country || geoLoading.states}
      error={editErrors.state ? "Please enter the state." : ""}
      inputClass=""
    />
  </div>

                  </div>

                  {/* Country | Zip */}
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
    <label className="text-sm font-medium text-gray-700">
      City <span className="text-red-500">*</span>
    </label>
    <SelectWithSearch
      name="City"
      value={editFormData.city}
      onChange={handleCitySelect}
      options={cityOptions}
      placeholder={geoLoading.cities ? "Loading..." : "Select..."}
      disabled={!editFormData.state || geoLoading.cities}
      error={editErrors.city ? "Please enter the city." : ""}
    />
  </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Zip Code <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="zipCode"
                        placeholder="Zip Code"
                        value={editFormData.zipCode}
                        onChange={(e) => {
                          const v = e.target.value.toUpperCase().replace(/[^0-9-]/g, '').slice(0, 10);
                          setEditFormData(prev => ({ ...prev, zipCode: v }));
                        }}
                        className={`w-full border px-4 py-2 rounded-lg ${editErrors.zipCode ? 'border-red-500' : 'border-gray-400'}`}

                      />
                      {editErrors.zipCode && (
                        <p className="text-xs text-red-600 mt-1">
                          {editFormData.zipCode?.trim() ? 'Please enter the valid zip code.' : 'Please enter the zip code.'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Working Address Card (Optional) */}
              <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl mb-1 p-8">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-2xl font-bold">Working Address (Optional)</h4>
                  <button
                    type="button"
                    onClick={handleAddWorkingAddress}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <PlusCircle size={18} /> Add More
                  </button>
                </div>
                <div className="w-full flex flex-col gap-4">
                  {editFormData.workingAddress && editFormData.workingAddress.length > 0 ? (
                    editFormData.workingAddress.map((addr, idx) => {
                      // Get cities for this address's state
                      const addrStateCities = addr.state ? (citiesCacheRef.current[`${editFormData.country}|${addr.state}`] || []) : [];
                      
                      return (
                        <div key={idx} className="border-2 border-gray-200 rounded-xl p-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-lg font-semibold text-gray-700">Working Address #{idx + 1}</h5>
                            <button
                              type="button"
                              onClick={() => handleRemoveWorkingAddress(idx)}
                              className="text-red-600 hover:text-red-700 font-semibold"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-700">State</label>
                              <SelectWithSearch
                                name={`workingAddress_${idx}_state`}
                                value={addr.state || ''}
                                onChange={(val) => handleWorkingAddressStateChange(idx, val)}
                                options={stateOptions}
                                placeholder="Search state…"
                                loading={geoLoading.states}
                                error=""
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700">City</label>
                              <SelectWithSearch
                                name={`workingAddress_${idx}_city`}
                                value={addr.city || ''}
                                onChange={(val) => handleWorkingAddressCityChange(idx, val)}
                                options={addrStateCities}
                                placeholder={addr.state ? "Search city…" : "Select state first"}
                                allowCustom
                                disabled={!addr.state}
                                loading={geoLoading.cities}
                                error=""
                              />
                            </div>
                          </div>
                          <div className="mt-4">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <FileText size={16} />
                              Attachment (Optional)
                            </label>
                            <div className="relative mt-2">
                              <input
                                type="file"
                                onChange={(e) => {
                                  const file = e.target.files?.[0] || null;
                                  handleWorkingAddressFileChange(idx, file);
                                }}
                                className="w-full border border-gray-400 px-4 py-2 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                accept=".pdf,.doc,.docx"
                              />
                              {addr.attachment && (
                                <div className="mt-2 text-sm text-green-600 flex items-center gap-2">
                                  <CheckCircle size={16} />
                                  {addr.attachment.name}
                                </div>
                              )}
                              {addr.attachmentUrl && !addr.attachment && (
                                <div className="mt-2 text-sm text-blue-600 flex items-center gap-2">
                                  <FileText size={16} />
                                  <a href={addr.attachmentUrl.startsWith('http') ? addr.attachmentUrl : `${API_CONFIG.BASE_URL}/${addr.attachmentUrl}`} target="_blank" rel="noreferrer" className="hover:underline">
                                    Current Attachment
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No working addresses added. Click "Add More" to add one.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Fleet Details Card */}
              <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl mb-1 p-8 flex flex-col items-center">
                <h4 className="text-2xl font-bold mb-4 text-center">Fleet Details</h4>
                <div className="w-full grid grid-cols-2 gap-4">
                  {/* Carrier Type */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Carrier Type <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="carrierType"
                      placeholder="Carrier Type"
                      value={editFormData.carrierType}
                      onChange={handleEditInputChange}
                      className={`border px-4 py-2 rounded-lg ${editErrors.carrierType ? 'border-red-500' : 'border-gray-400'}`}
                    />
                    {editErrors.carrierType && <p className="text-xs text-red-600 mt-1">Please enter the Carrier Type.</p>}
                  </div>
                  {/* Fleet Size */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Fleet Size <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      name="fleetsize"
                      placeholder="Fleet Size"
                      value={editFormData.fleetsize}
                      onChange={handleEditInputChange}
                      className={`border px-4 py-2 rounded-lg ${editErrors.fleetsize ? 'border-red-500' : 'border-gray-400'}`}
                    />
                    {editErrors.fleetsize && <p className="text-xs text-red-600 mt-1">Please enter the Fleet Size.</p>}
                  </div>
                </div>
              </div>

              {/* Current Documents Display Card */}
              {/* Only show Current Documents section if there are existing documents */}
              {Object.keys(editFormData).some(key => key.endsWith('Url') && editFormData[key]) && (
                <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl mb-1 p-8 flex flex-col items-center">
                  <h4 className="text-2xl font-bold mb-4 text-center">Current Documents</h4>
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documentFields.map((doc) => {
                      const docUrl = editFormData[`${doc.key}Url`];
                      const docFileName = editFormData[`${doc.key}FileName`];

                      if (!docUrl) return null;

                      return (
                        <div key={doc.key} className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 shadow-sm border border-green-100 hover:shadow-md transition">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <FileText className="text-green-600" size={16} />
                              <span className="font-medium text-sm text-gray-800">
                                {doc.label}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 bg-green-100 px-2 py-1 rounded">
                              Current
                            </span>
                          </div>

                          <div className="space-y-2">
                            <div className="text-xs text-gray-600 truncate">
                              {docFileName || 'Document uploaded'}
                            </div>

                            <div className="flex gap-2">
                              {/* // Current Documents card (inside map) */}
                              <button
                                onClick={() => handleDocumentPreview(absUrl(docUrl), doc.label)}
                                className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-blue-600 transition"
                              >
                                <Eye size={12} />
                                Preview
                              </button>
                              <a
                                href={absUrl(docUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-green-600 transition"
                              >
                                <FaDownload size={10} />
                                Download
                              </a>

                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Required Documents Upload Card */}
              <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl mb-1 p-8 flex flex-col items-center">
                <h4 className="text-2xl font-bold mb-4 text-center">Upload New Documents</h4>
                <div className="w-full grid grid-cols-2 gap-4">
                  {documentFields.map((doc) => (
                    <div key={doc.key} className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FileText size={16} />
                        {doc.label}
                        {doc.required && <span className="text-red-500">*</span>}
                      </label>

                      <div className="relative">
                        <input
                          type="file"
                          name={doc.key}
                          onChange={handleEditFileChange}
                          className="w-full border border-gray-400 px-4 py-2 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          accept=".pdf,.doc,.docx"
                        />
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                          {getEditUploadIcon(doc.key)}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        {editFormData[`${doc.key}Url`] ? 'Upload new file to replace current document' : 'Upload document'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              {/* NEW: Account Action Block (OK / Blacklist) */}
              {/* Account Action (OK / Blacklist) */}
              <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl mb-1 p-8 flex flex-col items-center">
                <h4 className="text-2xl font-bold mb-4 text-center">Account Action</h4>

                {/* Dropdown */}
                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Select Action</label>
                    <select
                      value={actionType}
                      onChange={(e) => {
                        setActionType(e.target.value);
                        setActionForm({ reason: '', remarks: '', attachment: null });
                        setActionErrors({});
                      }}
                      className="w-full border px-4 py-2 rounded-lg border-gray-400"
                    >
                      <option value="">— Select —</option>
                      <option value="ok">OK (Remove from Blacklist)</option>
                      <option value="blacklist">Blacklist</option>
                    </select>
                  </div>
                </div>

                {/* NOTE: yahan koi <form> NAHI hoga */}
                {actionType && (
                  <div
                    className="w-full mt-4 space-y-4"
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} // Enter dabne se outer form submit na ho
                  >
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        {actionType === 'blacklist' ? 'Blacklist Reason' : 'Removal Reason'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="reason"
                        value={actionForm.reason}
                        onChange={handleActionInput}
                        placeholder={actionType === 'blacklist' ? 'Payment Issues' : 'Payment Issues Resolved'}
                        className={`w-full border px-4 py-2 rounded-lg ${actionErrors.reason ? 'border-red-500' : 'border-gray-400'}`}
                      />
                      {actionErrors.reason && <p className="text-xs text-red-600 mt-1">Please enter the reason.</p>}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Remarks</label>
                      <textarea
                        name="remarks"
                        rows={3}
                        value={actionForm.remarks}
                        onChange={handleActionInput}
                        className="w-full border px-4 py-2 rounded-lg border-gray-400"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Attachment (optional)</label>
                      <input
                        type="file"
                        name="attachment"
                        onChange={handleActionInput}
                        accept=".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx"
                        className={`w-full border px-4 py-2 rounded-lg ${actionErrors.attachment ? 'border-red-500' : 'border-gray-400'}`}
                      />
                      {actionErrors.attachment && <p className="text-xs text-red-600 mt-1">{actionErrors.attachment}</p>}
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"               // IMPORTANT
                        onClick={handleAccountAction}
                        disabled={actionLoading}
                        className="flex-1 py-3 rounded-full text-lg font-bold bg-black text-white hover:opacity-90 transition disabled:opacity-60"
                      >
                        {actionLoading ? 'Submitting…' : (actionType === 'blacklist' ? 'Blacklist User' : 'Remove From Blacklist')}
                      </button>
                      <button
                        type="button"               // IMPORTANT
                        onClick={() => { setActionType(''); setActionForm({ reason: '', remarks: '', attachment: null }); setActionErrors({}); }}
                        className="flex-1 py-3 rounded-full text-lg font-bold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}
              </div>


              {/* Action Buttons Card */}
              <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl mb-1 p-8 flex flex-col items-center">
                <div className="w-full flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 py-3 rounded-full text-lg font-bold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-full text-lg font-bold bg-black text-white hover:opacity-90 transition"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Search and Add Trucker Section */}
      <div className="flex justify-between items-center gap-4 mb-6">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search truckers by name, email, MC/DOT number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500 transition-all duration-200 hover:border-gray-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Add Trucker Button */}
        <button
          onClick={() => setShowAddTruckerForm(true)}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 whitespace-nowrap"
        >
          <PlusCircle size={20} /> Add Trucker
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="text-red-600" size={16} />
              </div>
              <div>
                <h3 className="text-red-800 font-semibold">Error Loading Data</h3>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchTruckers}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
              >
                Retry
              </button>
              <button
                onClick={testEndpoints}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Debug API
              </button>
            </div>
          </div>
        </div>
      )}

      {viewDoc && selectedTrucker ? (
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
              href={absUrl(selectedTrucker.docUpload)}
              target="_blank"
              rel="noreferrer"
              className="hover:scale-110 transition-transform"
            >
              <FaDownload className="text-blue-500 text-2xl cursor-pointer" />
            </a>

            <img
              src={absUrl(selectedTrucker.docUpload)}
              alt="Uploaded Doc"
              className="rounded-xl shadow-lg max-h-[250px] w/full object-contain border border-blue-100 cursor-pointer hover:scale-105 transition"
              onClick={() => setPreviewImg(absUrl(selectedTrucker.docUpload))}
            />

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border rounded-2xl p-6 bg-gradient-to-br from-blue-50 to-white shadow flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-2">
                <Building className="text-blue-500" size={20} />
                <h3 className="text-lg font-bold text-blue-700">Company Info</h3>
              </div>
              <div className="flex items-center gap-2 text-gray-700"><User size={16} /> <span className="font-medium">Company:</span> {selectedTrucker.compName}</div>
              <div className="flex items-center gap-2 text-gray-700"><FileText size={16} /> <span className="font-medium">MC/DOT No:</span> {selectedTrucker.mc_dot_no}</div>
              <div className="flex items-center gap-2 text-gray-700"><Mail size={16} /> <span className="font-medium">Email:</span> {selectedTrucker.email}</div>
              <div className="flex items-center gap-2 text-gray-700"><Phone size={16} /> <span className="font-medium">Phone:</span> {selectedTrucker.phoneNo}</div>
              <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mt-2 ${statusColor(selectedTrucker.status)}`}>
                {selectedTrucker.status === 'approved' && <CheckCircle size={14} />}
                {selectedTrucker.status === 'rejected' && <XCircle size={14} />}
                {selectedTrucker.status === 'pending' && <Clock size={14} />}
                {selectedTrucker.status || 'Pending'}
              </div>
            </div>
            <div className="flex flex-col items-center justify-center">
              <img
                src={`${API_CONFIG.BASE_URL}/${selectedTrucker.docUpload}`}
                alt="Uploaded Doc"
                className="rounded-xl shadow-lg max-h-[250px] w-full object-contain border border-blue-100 cursor-pointer hover:scale-105 transition"
                onClick={() => setPreviewImg(`${API_CONFIG.BASE_URL}/${selectedTrucker.docUpload}`)}
              />
              <div className="text-xs text-gray-400 mt-2">Click image to preview</div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <table className="w-full table-auto">
              <thead className="bg-gradient-to-r from-blue-50 to-purple-100">
                <tr>
                  <th className="p-4 text-left font-semibold text-blue-700">Date</th>
                  <th className="p-4 text-left font-semibold text-blue-700">Trucker Name</th>
                  <th className="p-4 text-left font-semibold text-blue-700">MC/DOT No</th>
                  <th className="p-4 text-left font-semibold text-blue-700">Email</th>
                  <th className="p-4 text-left font-semibold text-blue-700">Status</th>
                  <th className="p-4 text-left font-semibold text-blue-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {Loading ? (
                  <tr>
                    <td colSpan="6" className="py-12">
                      <div className="flex flex-col justify-center items-center bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg py-16 mx-4">
                        <div className="relative">
                          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-purple-600 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
                        </div>
                        <div className="mt-6 text-center">
                          <p className="text-xl font-semibold text-gray-800 mb-2">Loading Truckers...</p>
                          <p className="text-sm text-gray-600">Please wait while we fetch trucker documents</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : currentTruckers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <Truck className="text-gray-400" size={24} />
                        </div>
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Truckers Found</h3>
                          <p className="text-gray-500 text-sm">
                            {searchTerm ? 'No truckers match your search criteria.' : 'No truckers have been added yet.'}
                          </p>
                          {searchTerm && (
                            <button
                              onClick={() => setSearchTerm('')}
                              className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              Clear search
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {currentTruckers.map((t, idx) => (
                      <tr key={t.userId || idx} className="border-t text-sm hover:bg-blue-50 transition">
                        <td className="p-4">{formatDDMMYYYY(t.addedAt)}</td>
                        <td className="p-4">{t.compName}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-700">
                              {t.mc_dot_no || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">{t.email}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${statusColor(t.status)}`}>
                            {t.status === 'approved' && <CheckCircle size={14} />}
                            {t.status === 'rejected' && <XCircle size={14} />}
                            {t.status === 'pending' && <Clock size={14} />}
                            {t.status || 'Pending'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewTrucker(t)}
                              className="flex items-center gap-1 bg-transparent text-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-500/30 transition border border-blue-200"
                            >
                              <Eye size={14} />
                              View
                            </button>
                            <button
                              onClick={() => handleEditTrucker(t)}
                              className="flex items-center gap-1 bg-transparent text-green-600 px-3 py-1 rounded text-sm hover:bg-green-500/30 transition border border-green-200"
                            >
                              <Edit size={14} />
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Enhanced Pagination */}
          {!Loading && filteredTruckers.length > 0 && (
            <div className="mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredTruckers.length)} of {filteredTruckers.length} results
                  {searchTerm && ` (filtered from ${truckers.length} total)`}
                </div>

                <div className="flex items-center gap-2">
                  {/* Previous Button */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>

                  {/* Page Numbers */}
                  <div className="flex gap-1">
                    {/* First Page */}
                    {currentPage > 3 && (
                      <button
                        onClick={() => handlePageChange(1)}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        1
                      </button>
                    )}

                    {/* Ellipsis after first page */}
                    {currentPage > 4 && (
                      <span className="px-2 py-2 text-gray-500">...</span>
                    )}

                    {/* Pages around current page */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        if (totalPages <= 7) return true;
                        return page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1);
                      })
                      .map((page) => (
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

                    {/* Ellipsis before last page */}
                    {currentPage < totalPages - 3 && (
                      <span className="px-2 py-2 text-gray-500">...</span>
                    )}

                    {/* Last Page */}
                    {currentPage < totalPages - 2 && totalPages > 1 && (
                      <button
                        onClick={() => handlePageChange(totalPages)}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {totalPages}
                      </button>
                    )}
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-1"
                  >
                    Next
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Trucker Details Modal */}
      {showTruckerModal && selectedTrucker && (
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4"
          onClick={() => setShowTruckerModal(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" 
            style={{
              scrollbarWidth: 'none', // Firefox
              msOverflowStyle: 'none', // IE 10+
            }}
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
                    <h2 className="text-xl font-bold">{selectedTrucker.compName}</h2>
                    <p className="text-blue-100">Trucker Details</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTruckerModal(false)}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Company & Contact Information */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Building className="text-blue-600" size={20} />
                  <h3 className="text-lg font-bold text-gray-800">Company</h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Building className="text-blue-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Company Name</p>
                      <p className="font-semibold text-gray-800">{selectedTrucker.compName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <FileText className="text-green-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">MC/DOT Number</p>
                      <p className="font-semibold text-gray-800">{selectedTrucker.mc_dot_no}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Mail className="text-green-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email Address</p>
                      <p className="font-semibold text-gray-800">{selectedTrucker.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Phone className="text-green-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone Number</p>
                      <p className="font-semibold text-gray-800">{selectedTrucker.phoneNo}</p>
                    </div>
                  </div>
                  {selectedTrucker.secondaryPhoneNo && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <Phone className="text-green-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Secondary Phone Number</p>
                        <p className="font-semibold text-gray-800">{selectedTrucker.secondaryPhoneNo}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <Truck className="text-orange-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Carrier Type</p>
                      <p className="font-semibold text-gray-800">{selectedTrucker.carrierType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <Truck className="text-orange-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Fleet Size</p>
                      <p className="font-semibold text-gray-800">{selectedTrucker.fleetsize} trucks</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <Calendar className="text-gray-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Registration Date</p>
                      <p className="font-semibold text-gray-800">
                        {new Date(selectedTrucker.addedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="text-purple-600" size={20} />
                  <h3 className="text-lg font-bold text-gray-800">Address Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <MapPin className="text-purple-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">City</p>
                      <p className="font-semibold text-gray-800">{selectedTrucker.city}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <MapPin className="text-purple-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">State</p>
                      <p className="font-semibold text-gray-800">{selectedTrucker.state}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <MapPin className="text-purple-600" size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Country</p>
                      <p className="font-semibold text-gray-800">{selectedTrucker.country}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Working Address Information */}
              {selectedTrucker.workingAddress && Array.isArray(selectedTrucker.workingAddress) && selectedTrucker.workingAddress.length > 0 && (
                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6 mt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="text-orange-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Working Address</h3>
                    <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {selectedTrucker.workingAddress.length} {selectedTrucker.workingAddress.length === 1 ? 'address' : 'addresses'}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {selectedTrucker.workingAddress.map((addr, idx) => (
                      <div key={idx} className="bg-white rounded-xl p-4 border border-orange-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-800">Working Address #{idx + 1}</h4>
                          {addr.attachment && (
                            <a
                              href={addr.attachment.startsWith('http') ? addr.attachment : `${API_CONFIG.BASE_URL}/${addr.attachment}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                            >
                              <FileText size={14} />
                              View Attachment
                            </a>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {addr.state && (
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                <MapPin className="text-orange-600" size={16} />
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">State</p>
                                <p className="font-semibold text-gray-800">{addr.state}</p>
                              </div>
                            </div>
                          )}
                          {addr.city && (
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                <MapPin className="text-orange-600" size={16} />
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">City</p>
                                <p className="font-semibold text-gray-800">{addr.city}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents Section */}
              {selectedTrucker.documentPreview && Object.keys(selectedTrucker.documentPreview).length > 0 && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="text-green-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Uploaded Documents</h3>
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {selectedTrucker.documentCount || Object.keys(selectedTrucker.documentPreview).length} documents
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(selectedTrucker.documentPreview).map(([docKey, docInfo]) => (
                      <div key={docKey} className="bg-white rounded-xl p-4 shadow-sm border border-green-100 hover:shadow-md transition">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <FileText className="text-green-600" size={16} />
                            <span className="font-medium text-sm text-gray-800">
                              {getDocumentDisplayName(docKey)}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {docInfo.fileType}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="text-xs text-gray-600 truncate">
                            {docInfo.fileName}
                          </div>

                          <div className="flex gap-2">
                            {/* // Uploaded Documents (selectedTrucker.documentPreview) card (inside map) */}
                            <button
                              onClick={() => handleDocumentPreview(absUrl(docInfo.url), getDocumentDisplayName(docKey))}
                              className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-blue-600 transition"
                            >
                              <Eye size={12} />
                              Preview
                            </button>
                            <a
                              href={absUrl(docInfo.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-green-600 transition"
                            >
                              <FaDownload size={10} />
                              Download
                            </a>

                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Information */}
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="text-orange-600" size={20} />
                  <h3 className="text-lg font-bold text-gray-800">Status Information</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${statusColor(selectedTrucker.status)}`}>
                      {selectedTrucker.status === 'approved' && <CheckCircle size={14} />}
                      {selectedTrucker.status === 'rejected' && <XCircle size={14} />}
                      {selectedTrucker.status === 'pending' && <Clock size={14} />}
                      {selectedTrucker.status || 'Pending'}
                    </span>
                  </div>
                  {selectedTrucker.statusReason && (
                    <div className="bg-white p-3 rounded-lg border">
                      <p className="text-sm text-gray-600 mb-1">Status Reason:</p>
                      <p className="text-sm text-gray-800">{selectedTrucker.statusReason}</p>
                    </div>
                  )}
                  {selectedTrucker.statusUpdatedAt && (
                    <div className="text-xs text-gray-500">
                      Last updated: {new Date(selectedTrucker.statusUpdatedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddTruckerForm && (
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center"
        >
          <div
            className="relative w-full max-w-3xl rounded-2xl shadow-2xl overflow-auto max-h-[90vh] p-4 bg-gradient-to-br from-blue-200 via-white to-blue-300"
            style={{
              scrollbarWidth: 'none', // Firefox
              msOverflowStyle: 'none', // IE 10+
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <style>{`
              .hide-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>
            <button
              onClick={() => setShowAddTruckerForm(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-black text-2xl"
            >
              ×
            </button>
            <div className="hide-scrollbar">
              <AddTruckerForm onSuccess={() => {
                setShowAddTruckerForm(false);
                fetchTruckers(); // Refresh table after successful addition
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


