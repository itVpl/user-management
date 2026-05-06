// Components/AddTruckerForm.jsx
import React, { useState } from "react";
import axios from "axios";
import alertify from "alertifyjs";
import "alertifyjs/build/css/alertify.css";
import API_CONFIG from "../../config/api";
import {
  FileText,
  Upload,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  PlusCircle,
  Building,
  MapPin,
  Truck,
  Wallet,
  KeyRound,
} from "lucide-react";
// ========= Searchable dropdown (no lib) =========
function SearchableSelect({
  label, required=false, name, value, onChange,
  options = [], placeholder = "Search…",
  disabled = false, allowCustom = false,
  error = "", loading = false, onOpen = null,
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const boxRef = React.useRef(null);

  const shown = React.useMemo(() => {
    const n = q.trim().toLowerCase();
    return options.filter(o =>
      (o.label || "").toLowerCase().includes(n) ||
      (o.value || "").toLowerCase().includes(n)
    );
  }, [q, options]);

  React.useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selectedLabel =
    options.find(o => o.value === value)?.label || (value && allowCustom ? value : "");

  return (
    <div className="w-full" ref={boxRef}>
      {label && (
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen(v => {
            const nx = !v;
            if (nx && typeof onOpen === "function") onOpen();
            return nx;
          });
        }}
        className={`w-full text-left px-4 py-3 border rounded-lg bg-white focus:outline-none ${error ? "border-red-500 bg-red-50 focus:ring-2 focus:ring-red-200" : "border-gray-300 focus:ring-2 focus:ring-blue-500"} ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
        aria-expanded={open}
      >
        {loading ? <span className="text-gray-400">Loading…</span> :
          (selectedLabel || <span className="text-gray-400">Select…</span>)}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}

      {open && !disabled && (
        <div className="relative">
          <div className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-2xl border border-gray-200">
            <div className="p-2 border-b">
              <input
                autoFocus
                disabled={loading}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={placeholder}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <ul className="max-h-56 overflow-auto py-1">
              {shown.map(o => (
                <li
                  key={o.value}
                  onClick={() => { onChange(o.value); setOpen(false); setQ(""); }}
                  className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
                >
                  {o.label}
                </li>
              ))}
              {shown.length === 0 && !allowCustom && (
                <li className="px-3 py-2 text-sm text-gray-500">No results</li>
              )}
              {allowCustom && q.trim() && shown.length === 0 && (
                <li
                  onClick={() => { onChange(q.trim()); setOpen(false); setQ(""); }}
                  className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
                >
                  Use “{q.trim()}”
                </li>
              )}
            </ul>

            <div className="p-2 border-t text-right">
              <button
                type="button"
                onClick={() => { onChange(""); setQ(""); setOpen(false); }}
                className="text-sm px-3 py-1 rounded-lg border hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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

/** Map API stateCode → full name used in {@link US_STATES_CITIES} keys */
const US_STATE_CODE_TO_NAME = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

function resolveUsStateNameForZip(stateRaw, stateCodeRaw) {
  const state = (stateRaw || "").trim();
  if (state && US_STATES_CITIES[state]) return state;
  const code = (stateCodeRaw || "").trim().toUpperCase();
  if (code && US_STATE_CODE_TO_NAME[code]) return US_STATE_CODE_TO_NAME[code];
  if (state) {
    const found = Object.keys(US_STATES_CITIES).find(
      (k) => k.toLowerCase() === state.toLowerCase(),
    );
    if (found) return found;
  }
  return "";
}

// Countries (returns [{label,value}])
async function fetchCountriesAPI() {
  // Simple return - only US for now
  return [{ label: "United States", value: "United States" }];
}

// States for a country (returns [{label,value}])
async function fetchStatesAPI(country) {
  if (country === "United States") {
    return Object.keys(US_STATES_CITIES).map(state => ({ label: state, value: state }));
  }
  return [];
}

// Cities for a (country,state) (returns [{label,value}])
async function fetchCitiesAPI(country, state) {
  if (country === "United States" && US_STATES_CITIES[state]) {
    return US_STATES_CITIES[state].map(city => ({ label: city, value: city }));
  }
  return [];
}

// ---------- Validators ----------
const EMAIL_RE =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // simple + strict enough & no spaces
// const IN_PHONE_RE = /^[6-9]\d{9}$/; 
// 10 digits, starts 6-9, no spaces
// ZIP: US 5 or 5-4 OR India 6-digit
const ZIP_RE = /^(?:\d{5}(?:-\d{4})?|\d{6})$/;

const PASSWORD_RULES = (pwd) => ({
  lengthOk: typeof pwd === "string" && pwd.length >= 8 && pwd.length <= 14,
  lower: /[a-z]/.test(pwd),
  upper: /[A-Z]/.test(pwd),
  numOrSym: /[\d\W_]/.test(pwd),
});

// ---------- Component ----------
export default function AddTruckerForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    compName: "",
    compAdd: "",
    country: "",
    state: "",
    city: "",
    zipcode: "",
    phoneNo: "",
    secondaryPhoneNo: "",
    mc_dot_no: "",
    carrierType: "",
    fleetsize: "",
    insuranceAmount: "",
    loadRef: "",
    email: "",
    password: "",
    confirmPassword: "",
    onboardCompany: "", // Onboard Company
    // Banking Details
    paymentType: "",
    factoringName: "",
    bankName: "",
    accountNumber: "",
    routingNumber: "",
    accountHolderName: "",
    accountType: "",
    bankAddress: "",
    bankCity: "",
    bankState: "",
    bankZipcode: "",
    // Working Address (array of {state, city, attachment})
    workingAddress: [],
    // docs
    brokeragePacket: null,
    carrierPartnerAgreement: null,
    w9Form: null,
    mcAuthority: null,
    safetyLetter: null,
    bankingInfo: null,
    inspectionLetter: null,
    insurance: null,
  });

  const [errors, setErrors] = useState({});
  const [uploadStatus, setUploadStatus] = useState({
    brokeragePacket: false,
    carrierPartnerAgreement: false,
    w9Form: false,
    mcAuthority: false,
    safetyLetter: false,
    bankingInfo: false,
    inspectionLetter: false,
    insurance: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password visibility (default OPEN / visible)
  const [showPassword, setShowPassword] = useState(true);
  const [showConfirm, setShowConfirm] = useState(true);
// === GEO state for dropdowns ===
const [countryOptions, setCountryOptions] = React.useState([]);
const [stateOptions, setStateOptions]     = React.useState([]);
const [cityOptions, setCityOptions]       = React.useState([]);
const [geoLoading, setGeoLoading]         = React.useState({ countries: false, states: false, cities: false });
const [workingAddressRefresh, setWorkingAddressRefresh] = React.useState(0); // Force re-render for working address cities

const statesCacheRef = React.useRef({});  // { [country]: [{label,value}] }
const citiesCacheRef = React.useRef({});  // { [`${country}|${state}`]: [{label,value}] }
const formDataRef = React.useRef(formData);
const zipLookupTimerRef = React.useRef(null);

React.useEffect(() => {
  formDataRef.current = formData;
}, [formData]);

React.useEffect(() => () => clearTimeout(zipLookupTimerRef.current), []);

// Countries load (mount)
React.useEffect(() => {
  let mounted = true;
  (async () => {
    try {
      setGeoLoading(p => ({ ...p, countries: true }));
      const list = await fetchCountriesAPI();
      if (mounted) setCountryOptions(list);

      // OPTIONAL: default United States select (and lock later if you want)
      if (mounted && !formData.country) {
        const us = list.find(x => x.value === "United States");
        if (us) setFormData(p => ({ ...p, country: us.value }));
      }
    } catch (e) {
           console.error("Countries load failed", e?.message || e);
     // Fallback: kam se kam US dikha do
     if (mounted) setCountryOptions([{ label: "United States", value: "United States" }]);
     if (mounted && !formData.country) {
       setFormData(p => ({ ...p, country: "United States" }));
     }
    } finally {
      if (mounted) setGeoLoading(p => ({ ...p, countries: false }));
    }
  })();
  return () => { mounted = false; };
}, []);

// States when country changes
React.useEffect(() => {
  const c = formData.country?.trim();
  if (!c) { setStateOptions([]); setCityOptions([]); return; }

  // cache?
  if (statesCacheRef.current[c]) {
    setStateOptions(statesCacheRef.current[c]);
    return;
  }

  let mounted = true;
  (async () => {
    try {
      setGeoLoading(p => ({ ...p, states: true }));
      const list = await fetchStatesAPI(c);
      if (mounted) {
        setStateOptions(list);
        statesCacheRef.current[c] = list;
      }
    } catch (e) {
      console.error("States load failed", e);
      if (mounted) setStateOptions([]);
    } finally {
      if (mounted) setGeoLoading(p => ({ ...p, states: false }));
    }
  })();

  return () => { mounted = false; };
}, [formData.country]);

// Cities when state changes
React.useEffect(() => {
  const c = formData.country?.trim();
  const s = formData.state?.trim();
  if (!c || !s) { setCityOptions([]); return; }

  const key = `${c}|${s}`;
  if (citiesCacheRef.current[key]) {
    setCityOptions(citiesCacheRef.current[key]);
    return;
  }

  let mounted = true;
  (async () => {
    try {
      setGeoLoading(p => ({ ...p, cities: true }));
      const list = await fetchCitiesAPI(c, s);
      if (mounted) {
        setCityOptions(list);
        citiesCacheRef.current[key] = list;
      }
    } catch (e) {
      console.error("Cities load failed", e);
      if (mounted) setCityOptions([]);
    } finally {
      if (mounted) setGeoLoading(p => ({ ...p, cities: false }));
    }
  })();

  return () => { mounted = false; };
}, [formData.country, formData.state]);

  const documentFields = [
    { key: "brokeragePacket", label: "Brokerage Packet" },
    { key: "carrierPartnerAgreement", label: "Carrier Partner Agreement" },
    { key: "w9Form", label: "W9 Form" },
    { key: "mcAuthority", label: "MC Authority" },
    { key: "safetyLetter", label: "Safety Letter" },
    { key: "bankingInfo", label: "Banking Information" },
    { key: "inspectionLetter", label: "Inspection Letter" },
    { key: "insurance", label: "Insurance" },
  ];

  // ---------- Field-level validation helpers ----------
  const validateField = (name, value) => {
    switch (name) {
      case "compName":
        if (!value?.trim()) return "Please enter the company name.";
        break;
      case "compAdd":
        if (!value?.trim()) return "Please enter the company address.";
        break;
      case "country":
        if (!value?.trim()) return "Please enter the county.";
        break;
      case "state":
        if (!value?.trim()) return "Please enter the state.";
        break;
      case "city":
        if (!value?.trim()) return "Please enter the city.";
        break;
      case "zipcode":
        if (!value?.trim()) return "Please enter the zip code.";
        if (!ZIP_RE.test(value.trim()))
          return "Please enter the valid zip code.";
        break;
      case "phoneNo": {
        if (!value?.trim()) return "Please enter the mobile number.";
        if (/\s/.test(value)) return "Please enter the valid mobile number.";
        // if (!IN_PHONE_RE.test(value))
        //   return "Please enter the valid mobile number.";
        break;
      }
      case "secondaryPhoneNo": {
        // Optional field - only validate format if provided
        if (value?.trim() && /\s/.test(value)) return "Please enter the valid mobile number.";
        break;
      }
      case "mc_dot_no":
        if (!value?.trim()) return "Please enter the mc/dot no.";
        break;
      case "carrierType":
        if (!value?.trim()) return "Please enter the Carrier Type.";
        break;
      case "fleetsize": {
        if (value === "" || value === null)
          return "Please enter the Fleet Size.";
        const n = Number(value);
        if (!Number.isInteger(n) || n < 0)
          return "Please enter the Fleet Size.";
        break;
      }
      case "insuranceAmount": {
        const raw = String(value ?? "").trim();
        if (!raw) return "Please enter the insurance amount.";
        const amt = parseFloat(raw);
        if (!Number.isFinite(amt)) return "Please enter a valid insurance amount.";
        if (amt < 0) return "Insurance amount cannot be negative.";
        break;
      }
      case "email":
        if (!value?.trim()) return "Please enter the email id.";
        if (/\s/.test(value)) return "Please enter the valid email id.";
        if (!EMAIL_RE.test(value)) return "Please enter the valid email id.";
        break;
      case "password": {
        const rules = PASSWORD_RULES(value || "");
        if (!rules.lengthOk) return "Please enter the minimum 8 characters.";
        if (!(rules.lower && rules.upper && rules.numOrSym))
          return "Please enter all combinations of passwords like uppercase ,lowercase,number or symbol";
        break;
      }
      case "confirmPassword":
        if (!value?.length) return "Kindly ensure the  password and confirm password are the same";
        if (value !== formData.password)
          return "Kindly ensure the  password and confirm password are the same";
        break;
      default:
        return null;
    }
    return null;
  };

  const validateAll = () => {
    const newErrors = {};

    // Basic details
    [
      "compName",
      "compAdd",
      "country",
      "state",
      "city",
      "zipcode",
      "phoneNo",
    ].forEach((f) => {
      const msg = validateField(f, formData[f]);
      if (msg) newErrors[f] = msg;
    });

    // Fleet
    ["mc_dot_no", "carrierType", "fleetsize", "insuranceAmount"].forEach((f) => {
      const msg = validateField(f, formData[f]);
      if (msg) newErrors[f] = msg;
    });

    // Account
    ["email", "password", "confirmPassword"].forEach((f) => {
      const msg = validateField(f, formData[f]);
      if (msg) newErrors[f] = msg;
    });

    // Working Address validation (optional - validate each entry if filled)
    if (formData.workingAddress && formData.workingAddress.length > 0) {
      formData.workingAddress.forEach((addr, idx) => {
        if (addr.state?.trim() && !addr.city?.trim()) {
          newErrors[`workingAddress_${idx}_city`] = "Please enter the city for this working address.";
        }
        if (addr.city?.trim() && !addr.state?.trim()) {
          newErrors[`workingAddress_${idx}_state`] = "Please enter the state for this working address.";
        }
      });
    }

    setErrors(newErrors);
    return newErrors;
  };

  const applyZipSampleToForm = React.useCallback(async (zip5) => {
    const country = (formDataRef.current?.country || "").trim();
    if (country !== "United States") return;
    try {
      const token =
        sessionStorage.getItem("token") || localStorage.getItem("token");
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/load/zipcode/${zip5}/samples`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      const samples = Array.isArray(res?.data?.data?.sampleAddresses)
        ? res.data.data.sampleAddresses
        : [];
      const item = samples[0];
      if (!item) return;
      const stateName = resolveUsStateNameForZip(item.state, item.stateCode);
      const cityName = (item.city || "").trim();
      if (!stateName) return;
      const ctry = "United States";
      const key = `${ctry}|${stateName}`;
      let list = citiesCacheRef.current[key];
      if (!list) {
        list = await fetchCitiesAPI(ctry, stateName);
        citiesCacheRef.current[key] = list;
      }
      setCityOptions(list);
      setFormData((prev) => ({
        ...prev,
        state: stateName,
        city: cityName || prev.city,
      }));
      setErrors((prev) => {
        const n = { ...prev };
        delete n.state;
        delete n.city;
        return n;
      });
    } catch (e) {
      console.warn("ZIP lookup failed:", e?.response?.data || e.message);
    }
  }, []);

  const scheduleZipLookupFromInput = (zipFieldValue) => {
    clearTimeout(zipLookupTimerRef.current);
    const c = (formDataRef.current?.country || "").trim();
    if (c !== "United States") return;
    const digits = zipFieldValue.replace(/\D/g, "");
    if (digits.length === 6 && !zipFieldValue.includes("-")) return;
    const zip5 = digits.slice(0, 5);
    if (!/^\d{5}$/.test(zip5)) return;
    zipLookupTimerRef.current = setTimeout(() => {
      applyZipSampleToForm(zip5);
    }, 450);
  };

  // ---------- Handlers ----------
  const handleChange = (e) => {
    const { name, value } = e.target;

    let newValue = value;

    if (name === "phoneNo") {
      // Only digits; no spaces
      newValue = value.replace(/\D+/g, "").slice(0, 10);
    }
    if (name === "secondaryPhoneNo") {
      // Only digits; no spaces
      newValue = value.replace(/\D+/g, "").slice(0, 10);
    }
    if (name === "zipcode") {
      newValue = value.replace(/[^\d-]/g, "").slice(0, 10);
    }

    setFormData((prev) => ({ ...prev, [name]: newValue }));

    // live-validate this field
    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, newValue) || undefined,
    }));

    if (name === "zipcode") {
      scheduleZipLookupFromInput(newValue);
    }
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    const file = files?.[0] || null;

    setFormData((prev) => ({ ...prev, [name]: file }));
    setUploadStatus((prev) => ({ ...prev, [name]: !!file }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errs = validateAll();
    if (Object.keys(errs).length > 0) {
      // Scroll to first error
      const firstErrField = Object.keys(errs)[0];
      const el = document.querySelector(`[name="${firstErrField}"]`);
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);

    const truckerData = new FormData();
    // Basic info
    truckerData.append("compName", formData.compName.trim());
    truckerData.append("mc_dot_no", formData.mc_dot_no.trim());
    truckerData.append("carrierType", formData.carrierType.trim());
    truckerData.append(
      "fleetsize",
      Number.isFinite(parseInt(formData.fleetsize, 10))
        ? parseInt(formData.fleetsize, 10)
        : 0
    );
    const insAmt = parseFloat(String(formData.insuranceAmount ?? "").trim());
    if (Number.isFinite(insAmt) && insAmt >= 0) {
      truckerData.append("insuranceAmount", String(insAmt));
    }
    truckerData.append("compAdd", formData.compAdd.trim());
    truckerData.append("country", formData.country.trim());
    truckerData.append("state", formData.state.trim());
    truckerData.append("city", formData.city.trim());
    truckerData.append("zipcode", formData.zipcode.trim());
    truckerData.append("phoneNo", formData.phoneNo.trim());
    truckerData.append("secondaryPhoneNo", formData.secondaryPhoneNo?.trim() || "");
    truckerData.append("assignedCompany", formData.onboardCompany?.trim() || "");
    truckerData.append("loadRef", formData.loadRef?.trim() || "");
    truckerData.append("email", formData.email.trim());
    truckerData.append("password", formData.password);
    // Banking Details
    truckerData.append("paymentType", formData.paymentType?.trim() || "");
    if (formData.paymentType === 'Factoring' && formData.factoringName?.trim()) {
      truckerData.append("factoringName", formData.factoringName.trim());
    }
    if (formData.paymentType && (formData.bankName?.trim() || formData.accountNumber?.trim())) {
      const bankDetails = {
        bankName: formData.bankName?.trim() || "",
        accountNumber: formData.accountNumber?.trim() || "",
        routingNumber: formData.routingNumber?.trim() || "",
        accountHolderName: formData.accountHolderName?.trim() || "",
        accountType: formData.accountType?.trim() || "",
        address: formData.bankAddress?.trim() || "",
        city: formData.bankCity?.trim() || "",
        state: formData.bankState?.trim() || "",
        zipcode: formData.bankZipcode?.trim() || ""
      };
      truckerData.append("bankDetails", JSON.stringify(bankDetails));
    }

    // Working Address (optional - send as JSON string, attachments separately)
    if (formData.workingAddress && formData.workingAddress.length > 0) {
      const validAddresses = formData.workingAddress.filter(addr => 
        addr.state?.trim() || addr.city?.trim()
      );
      
      if (validAddresses.length > 0) {
        // Send workingAddress as JSON string (without attachments)
        const workingAddressJson = validAddresses.map(addr => ({
          state: addr.state?.trim() || "",
          city: addr.city?.trim() || ""
        }));
        truckerData.append("workingAddress", JSON.stringify(workingAddressJson));
        
        // Send attachments separately as workingAddressAttachments (multiple files)
        validAddresses.forEach((addr) => {
          if (addr.attachment) {
            truckerData.append("workingAddressAttachments", addr.attachment);
          }
        });
      }
    }

    // Documents
    documentFields.forEach((doc) => {
      const f = formData[doc.key];
      if (f) truckerData.append(doc.key, f);
    });

    try {
      const res = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/cmt/add-trucker`,
        truckerData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        }
      );

      if (res.status === 200 || res.data?.success) {
        alertify.success("Trucker created successfully!.");
        // reset form
        setFormData({
          compName: "",
          compAdd: "",
          country: "",
          state: "",
          city: "",
          zipcode: "",
          phoneNo: "",
          secondaryPhoneNo: "",
          onboardCompany: "",
          loadRef: "",
          paymentType: "",
          factoringName: "",
          bankName: "",
          accountNumber: "",
          routingNumber: "",
          accountHolderName: "",
          accountType: "",
          bankAddress: "",
          bankCity: "",
          bankState: "",
          bankZipcode: "",
          mc_dot_no: "",
          carrierType: "",
          fleetsize: "",
          insuranceAmount: "",
          email: "",
          password: "",
          confirmPassword: "",
          workingAddress: [],
          brokeragePacket: null,
          carrierPartnerAgreement: null,
          w9Form: null,
          mcAuthority: null,
          safetyLetter: null,
          bankingInfo: null,
          inspectionLetter: null,
          insurance: null,
        });
        setUploadStatus({
          brokeragePacket: false,
          carrierPartnerAgreement: false,
          w9Form: false,
          mcAuthority: false,
          safetyLetter: false,
          bankingInfo: false,
          inspectionLetter: false,
          insurance: false,
        });
        setErrors({});
        onSuccess && onSuccess();
      } else {
        alertify.error("❌ Failed to add trucker.");
      }
    } catch (error) {
      console.error("❌ Submission error:", error.response?.data || error.message);
      alertify.error(`❌ Error: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUploadIcon = (fieldName) =>
    uploadStatus[fieldName] ? (
      <CheckCircle size={20} />
    ) : (
      <Upload size={20} />
    );

  const renderError = (name) =>
    errors[name] ? (
      <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
        <XCircle size={14} /> {errors[name]}
      </p>
    ) : null;

  const fieldClass = (name) =>
    `w-full px-4 py-3 border rounded-lg focus:outline-none ${
      errors[name]
        ? "border-red-500 bg-red-50 focus:ring-2 focus:ring-red-200"
        : "border-gray-300 focus:ring-2 focus:ring-blue-500"
    }`;

  const fileFieldClass = (name) =>
    `${fieldClass(name)} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100`;

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full p-6 space-y-6">
        {/* Company (same palette as view popup) */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Building className="text-blue-600 shrink-0" size={20} />
            Company
          </h3>
          <div className="w-full flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="compName"
                placeholder="Company Name"
                value={formData.compName}
                onChange={handleChange}
                className={fieldClass("compName")}
              />
              {renderError("compName")}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Company Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="compAdd"
                placeholder="Company Address"
                value={formData.compAdd}
                onChange={handleChange}
                className={fieldClass("compAdd")}
              />
              {renderError("compAdd")}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="phoneNo"
                  placeholder="Phone"
                  value={formData.phoneNo}
                  onChange={handleChange}
                  className={fieldClass("phoneNo")}
                  inputMode="numeric"
                />
                {renderError("phoneNo")}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Secondary Phone Number
                </label>
                <input
                  type="text"
                  name="secondaryPhoneNo"
                  placeholder="Secondary Phone Number (Optional)"
                  value={formData.secondaryPhoneNo}
                  onChange={handleChange}
                  className={fieldClass("secondaryPhoneNo")}
                  inputMode="numeric"
                />
                {renderError("secondaryPhoneNo")}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Onboard Company
                </label>
                <SearchableSelect
                  label=""
                  name="onboardCompany"
                  value={formData.onboardCompany}
                  onChange={(value) => {
                    setFormData(prev => ({ ...prev, onboardCompany: value }));
                    setErrors(prev => {
                      const copy = { ...prev };
                      delete copy.onboardCompany;
                      return copy;
                    });
                  }}
                  options={[
                    { label: 'V Power Logistics', value: 'V Power Logistics' },
                    { label: 'Quick Logistics', value: 'Quick Logistics' }
                  ]}
                  placeholder="Select Company..."
                  disabled={isSubmitting}
                />
                {renderError("onboardCompany")}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Load Reference
                </label>
                <input
                  type="text"
                  name="loadRef"
                  placeholder="Load Reference"
                  value={formData.loadRef}
                  onChange={handleChange}
                  className={fieldClass("loadRef")}
                />
                {renderError("loadRef")}
              </div>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <MapPin className="text-purple-600 shrink-0" size={20} />
            Address
          </h3>
          <div className="w-full flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Country <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  required
                  name="country"
                  value={formData.country || ""}
                  onChange={(val) => {
                    setFormData(p => ({ ...p, country: val, state: "", city: "" }));
                  }}
                  options={countryOptions}
                  placeholder="Search country…"
                  loading={geoLoading.countries}
                  error={errors.country}
                />
                {renderError("country")}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  State <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  required
                  name="state"
                  value={formData.state || ""}
                  onChange={(val) => setFormData(p => ({ ...p, state: val, city: "" }))}
                  options={stateOptions}
                  placeholder={formData.country ? "Search state…" : "Select country first"}
                  disabled={!formData.country}
                  loading={geoLoading.states}
                  error={errors.state}
                />
                {renderError("state")}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  City <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  required
                  name="city"
                  value={formData.city || ""}
                  onChange={(val) => setFormData(p => ({ ...p, city: val }))}
                  options={cityOptions}
                  placeholder={formData.state ? "Search city…" : "Select state first"}
                  allowCustom
                  disabled={!formData.state}
                  loading={geoLoading.cities}
                  error={errors.city}
                />
                {renderError("city")}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Zip Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="zipcode"
                  placeholder="Zip Code"
                  value={formData.zipcode}
                  onChange={handleChange}
                  className={fieldClass("zipcode")}
                />
                {renderError("zipcode")}
              </div>
            </div>
          </div>
        </div>

        {/* Banking Details */}
        <div className="bg-gradient-to-br from-cyan-50 to-sky-50 rounded-2xl p-6 border border-cyan-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Wallet className="text-cyan-700 shrink-0" size={20} />
            Banking Details
          </h3>
          <div className="w-full flex flex-col gap-4">
            {/* Payment Type */}
            <div>
              <label className="text-sm font-medium text-gray-700">Payment Type</label>
              <select
                name="paymentType"
                value={formData.paymentType}
                onChange={handleChange}
                className={fieldClass("paymentType")}
              >
                <option value="">Select Payment Type...</option>
                <option value="ACH">ACH</option>
                <option value="Factoring">Factoring</option>
              </select>
              {renderError("paymentType")}
            </div>

            {/* Conditional Fields for Factoring */}
            {formData.paymentType === 'Factoring' && (
              <>
                {/* Factoring Name */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Factoring Name</label>
                  <input
                    type="text"
                    name="factoringName"
                    placeholder="Factoring Name"
                    value={formData.factoringName}
                    onChange={handleChange}
                    className={fieldClass("factoringName")}
                  />
                  {renderError("factoringName")}
                </div>

                {/* Bank Details Grid */}
                <div className="grid grid-cols-2 gap-4 mt-2">
                  {/* Bank Name */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Bank Name</label>
                    <input
                      type="text"
                      name="bankName"
                      placeholder="Bank Name"
                      value={formData.bankName}
                      onChange={handleChange}
                      className={fieldClass("bankName")}
                    />
                    {renderError("bankName")}
                  </div>

                  {/* Account Number */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Account Number</label>
                    <input
                      type="text"
                      name="accountNumber"
                      placeholder="Account Number"
                      value={formData.accountNumber}
                      onChange={handleChange}
                      className={fieldClass("accountNumber")}
                    />
                    {renderError("accountNumber")}
                  </div>

                  {/* Routing Number */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Routing Number</label>
                    <input
                      type="text"
                      name="routingNumber"
                      placeholder="Routing Number"
                      value={formData.routingNumber}
                      onChange={handleChange}
                      className={fieldClass("routingNumber")}
                    />
                    {renderError("routingNumber")}
                  </div>

                  {/* Account Holder Name */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Account Holder Name</label>
                    <input
                      type="text"
                      name="accountHolderName"
                      placeholder="Account Holder Name"
                      value={formData.accountHolderName}
                      onChange={handleChange}
                      className={fieldClass("accountHolderName")}
                    />
                    {renderError("accountHolderName")}
                  </div>

                  {/* Account Type */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Account Type</label>
                    <select
                      name="accountType"
                      value={formData.accountType}
                      onChange={handleChange}
                      className={fieldClass("accountType")}
                    >
                      <option value="">Select Account Type...</option>
                      <option value="Checking">Checking</option>
                      <option value="Savings">Savings</option>
                    </select>
                    {renderError("accountType")}
                  </div>

                  {/* Bank Address */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Address</label>
                    <input
                      type="text"
                      name="bankAddress"
                      placeholder="Bank Address"
                      value={formData.bankAddress}
                      onChange={handleChange}
                      className={fieldClass("bankAddress")}
                    />
                    {renderError("bankAddress")}
                  </div>

                  {/* Bank City */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">City</label>
                    <input
                      type="text"
                      name="bankCity"
                      placeholder="City"
                      value={formData.bankCity}
                      onChange={handleChange}
                      className={fieldClass("bankCity")}
                    />
                    {renderError("bankCity")}
                  </div>

                  {/* Bank State */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">State</label>
                    <input
                      type="text"
                      name="bankState"
                      placeholder="State"
                      value={formData.bankState}
                      onChange={handleChange}
                      className={fieldClass("bankState")}
                    />
                    {renderError("bankState")}
                  </div>

                  {/* Bank Zipcode */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Zipcode</label>
                    <input
                      type="text"
                      name="bankZipcode"
                      placeholder="Zipcode"
                      value={formData.bankZipcode}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9-]/g, '').slice(0, 10);
                        setFormData(prev => ({ ...prev, bankZipcode: v }));
                      }}
                      className={fieldClass("bankZipcode")}
                    />
                    {renderError("bankZipcode")}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Working Address */}
        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6 border border-amber-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <MapPin className="text-orange-600 shrink-0" size={20} />
              Working Address (Optional)
            </h3>
            <button
              type="button"
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  workingAddress: [...(prev.workingAddress || []), { state: "", city: "", attachment: null }]
                }));
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <PlusCircle size={18} /> Add More
            </button>
          </div>
          <div className="w-full flex flex-col gap-4">
            {formData.workingAddress && formData.workingAddress.length > 0 ? (
              formData.workingAddress.map((addr, idx) => (
                <div key={idx} className="bg-white rounded-xl p-4 border border-orange-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-lg font-semibold text-gray-700">Working Address #{idx + 1}</h5>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          workingAddress: prev.workingAddress.filter((_, i) => i !== idx)
                        }));
                      }}
                      className="text-red-600 hover:text-red-700 font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">State</label>
                      <SearchableSelect
                        name={`workingAddress_${idx}_state`}
                        value={addr.state || ""}
                        onChange={async (val) => {
                          const updated = [...formData.workingAddress];
                          updated[idx] = { ...updated[idx], state: val, city: "" }; // Clear city when state changes
                          setFormData(prev => ({ ...prev, workingAddress: updated }));
                          
                          // Load cities for the selected state and cache them
                          if (val && formData.country) {
                            const key = `${formData.country}|${val}`;
                            console.log('Loading cities for working address:', key, 'Cached?', !!citiesCacheRef.current[key]);
                            if (!citiesCacheRef.current[key]) {
                              try {
                                setGeoLoading(p => ({ ...p, cities: true }));
                                const cities = await fetchCitiesAPI(formData.country, val);
                                console.log('Loaded cities:', cities.length, cities);
                                citiesCacheRef.current[key] = cities;
                                // Force re-render to update city dropdown
                                setWorkingAddressRefresh(prev => prev + 1);
                              } catch (e) {
                                console.error("Failed to load cities for working address", e);
                              } finally {
                                setGeoLoading(p => ({ ...p, cities: false }));
                              }
                            } else {
                              console.log('Using cached cities:', citiesCacheRef.current[key].length);
                              // Even if cached, force re-render to show cities
                              setWorkingAddressRefresh(prev => prev + 1);
                            }
                          } else {
                            console.warn('Cannot load cities - missing state or country:', { state: val, country: formData.country });
                          }
                        }}
                        options={stateOptions}
                        placeholder="Search state…"
                        loading={geoLoading.states}
                        error={errors[`workingAddress_${idx}_state`]}
                      />
                      {errors[`workingAddress_${idx}_state`] && (
                        <p className="text-xs text-red-600 mt-1">{errors[`workingAddress_${idx}_state`]}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">City</label>
                      <SearchableSelect
                        name={`workingAddress_${idx}_city`}
                        value={addr.city || ""}
                        onChange={(val) => {
                          const updated = [...formData.workingAddress];
                          updated[idx] = { ...updated[idx], city: val };
                          setFormData(prev => ({ ...prev, workingAddress: updated }));
                        }}
                        options={(() => {
                          // Force re-computation when refresh state changes (use refresh state to trigger)
                          const _ = workingAddressRefresh; // Depend on refresh state
                          if (!addr.state) return [];
                          const key = `${formData.country}|${addr.state}`;
                          return citiesCacheRef.current[key] || [];
                        })()}
                        placeholder={addr.state ? "Search city…" : "Select state first"}
                        allowCustom
                        disabled={!addr.state}
                        loading={geoLoading.cities}
                        error={errors[`workingAddress_${idx}_city`]}
                      />
                      {errors[`workingAddress_${idx}_city`] && (
                        <p className="text-xs text-red-600 mt-1">{errors[`workingAddress_${idx}_city`]}</p>
                      )}
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
                          const updated = [...formData.workingAddress];
                          updated[idx] = { ...updated[idx], attachment: file };
                          setFormData(prev => ({ ...prev, workingAddress: updated }));
                        }}
                        className={fileFieldClass("_workingAttachment")}
                        accept=".pdf,.doc,.docx"
                      />
                      {addr.attachment && (
                        <div className="mt-2 text-sm text-green-600 flex items-center gap-2">
                          <CheckCircle size={16} />
                          {addr.attachment.name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No working addresses added. Click "Add More" to add one.</p>
              </div>
            )}
          </div>
        </div>

        {/* Fleet Details */}
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-6 border border-violet-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Truck className="text-violet-600 shrink-0" size={20} />
            Fleet Details
          </h3>
          <div className="w-full grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                MC/DOT No <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="mc_dot_no"
                placeholder="MC/DOT No"
                value={formData.mc_dot_no}
                onChange={handleChange}
                className={fieldClass("mc_dot_no")}
              />
              {renderError("mc_dot_no")}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Carrier Type <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="carrierType"
                placeholder="Carrier Type"
                value={formData.carrierType}
                onChange={handleChange}
                className={fieldClass("carrierType")}
              />
              {renderError("carrierType")}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Fleet Size <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                name="fleetsize"
                placeholder="Fleet Size"
                value={formData.fleetsize}
                onChange={handleChange}
                className={fieldClass("fleetsize")}
              />
              {renderError("fleetsize")}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Insurance amount (USD) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                name="insuranceAmount"
                placeholder="e.g. 1000000"
                value={formData.insuranceAmount}
                onChange={handleChange}
                className={fieldClass("insuranceAmount")}
              />
              {renderError("insuranceAmount")}
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="text-green-600 shrink-0" size={20} />
            Documents
          </h3>
          <div className="w-full grid grid-cols-2 gap-4">
            {documentFields.map((doc) => (
              <div key={doc.key} className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <FileText size={16} />
                  {doc.label}
                </label>
                <div className="relative">
                  <input
                    type="file"
                    name={doc.key}
                    onChange={handleFileChange}
                    className={fileFieldClass(doc.key)}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    {getUploadIcon(doc.key)}
                  </div>
                </div>
                {renderError(doc.key)}
              </div>
            ))}
          </div>
        </div>

        {/* Create Account */}
        <div className="bg-gradient-to-br from-sky-50 to-indigo-50 rounded-2xl p-6 border border-indigo-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <KeyRound className="text-indigo-600 shrink-0" size={20} />
            Create Account
          </h3>

          <div className="w-full flex flex-col gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                placeholder="Enter E-mail"
                value={formData.email}
                onChange={handleChange}
                className={fieldClass("email")}
              />
              {renderError("email")}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="text-sm font-medium text-gray-700">
                  Create Password <span className="text-red-500">*</span>
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Create Password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`${fieldClass("password")} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 bottom-2.5"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                {renderError("password")}
              </div>

              <div className="relative">
                <label className="text-sm font-medium text-gray-700">
                  Re-enter Password <span className="text-red-500">*</span>
                </label>
                <input
                  type={showConfirm ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Re-enter Password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`${fieldClass("confirmPassword")} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute right-3 bottom-2.5"
                  aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                {renderError("confirmPassword")}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:from-blue-600 hover:to-blue-700"
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Adding Trucker...
              </>
            ) : (
              "Add Trucker"
            )}
          </button>
        </div>
    </form>
  );
}
