// Components/AddTruckerForm.jsx
import React, { useState } from "react";
import axios from "axios";
import alertify from "alertifyjs";
import "alertifyjs/build/css/alertify.css";
import {
  FileText,
  Upload,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
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
        className={`w-full text-left border px-4 py-2 rounded-lg bg-white ${error ? "border-red-500" : "border-gray-400"} ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
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

const isAllowedDocType = (file) => {
  if (!file) return false;
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".pdf") || name.endsWith(".doc") || name.endsWith(".docx")
  );
};

const isUnder10MB = (file) => file && file.size <= 10 * 1024 * 1024;

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
    mc_dot_no: "",
    carrierType: "",
    fleetsize: "",
    email: "",
    password: "",
    confirmPassword: "",
    // Secondary Address
    secondaryCompAdd: "",
    secondaryCountry: "",
    secondaryState: "",
    secondaryCity: "",
    secondaryZipcode: "",
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

// Secondary Address GEO state
const [secondaryStateOptions, setSecondaryStateOptions] = React.useState([]);
const [secondaryCityOptions, setSecondaryCityOptions] = React.useState([]);
const [secondaryGeoLoading, setSecondaryGeoLoading] = React.useState({ states: false, cities: false });

const statesCacheRef = React.useRef({});  // { [country]: [{label,value}] }
const citiesCacheRef = React.useRef({});  // { [`${country}|${state}`]: [{label,value}] }

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

// Secondary Address - States when country changes
React.useEffect(() => {
  const c = formData.secondaryCountry?.trim();
  if (!c) { setSecondaryStateOptions([]); setSecondaryCityOptions([]); return; }

  if (statesCacheRef.current[c]) {
    setSecondaryStateOptions(statesCacheRef.current[c]);
    return;
  }

  let mounted = true;
  (async () => {
    try {
      setSecondaryGeoLoading(p => ({ ...p, states: true }));
      const list = await fetchStatesAPI(c);
      if (mounted) {
        setSecondaryStateOptions(list);
        statesCacheRef.current[c] = list;
      }
    } catch (e) {
      console.error("Secondary States load failed", e);
      if (mounted) setSecondaryStateOptions([]);
    } finally {
      if (mounted) setSecondaryGeoLoading(p => ({ ...p, states: false }));
    }
  })();

  return () => { mounted = false; };
}, [formData.secondaryCountry]);

// Secondary Address - Cities when state changes
React.useEffect(() => {
  const c = formData.secondaryCountry?.trim();
  const s = formData.secondaryState?.trim();
  if (!c || !s) { setSecondaryCityOptions([]); return; }

  const key = `${c}|${s}`;
  if (citiesCacheRef.current[key]) {
    setSecondaryCityOptions(citiesCacheRef.current[key]);
    return;
  }

  let mounted = true;
  (async () => {
    try {
      setSecondaryGeoLoading(p => ({ ...p, cities: true }));
      const list = await fetchCitiesAPI(c, s);
      if (mounted) {
        setSecondaryCityOptions(list);
        citiesCacheRef.current[key] = list;
      }
    } catch (e) {
      console.error("Secondary Cities load failed", e);
      if (mounted) setSecondaryCityOptions([]);
    } finally {
      if (mounted) setSecondaryGeoLoading(p => ({ ...p, cities: false }));
    }
  })();

  return () => { mounted = false; };
}, [formData.secondaryCountry, formData.secondaryState]);

  const documentFields = [
    { key: "brokeragePacket", label: "Brokerage Packet", required: true },
    { key: "carrierPartnerAgreement", label: "Carrier Partner Agreement" },
    { key: "w9Form", label: "W9 Form", required: true },
    { key: "mcAuthority", label: "MC Authority", required: true },
    { key: "safetyLetter", label: "Safety Letter", required: false },
    { key: "bankingInfo", label: "Banking Information", required: true },
    { key: "inspectionLetter", label: "Inspection Letter", required: false },
    { key: "insurance", label: "Insurance", required: true },
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
      // Secondary Address validations (optional - only validate format if provided)
      case "secondaryZipcode":
        // Only validate format if value is provided
        if (value?.trim() && !ZIP_RE.test(value.trim()))
          return "Please enter the valid secondary zip code.";
        break;
      case "phoneNo": {
        if (!value?.trim()) return "Please enter the mobile number.";
        if (/\s/.test(value)) return "Please enter the valid mobile number.";
        // if (!IN_PHONE_RE.test(value))
        //   return "Please enter the valid mobile number.";
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
    ["mc_dot_no", "carrierType", "fleetsize"].forEach((f) => {
      const msg = validateField(f, formData[f]);
      if (msg) newErrors[f] = msg;
    });

    // Account
    ["email", "password", "confirmPassword"].forEach((f) => {
      const msg = validateField(f, formData[f]);
      if (msg) newErrors[f] = msg;
    });

    // Secondary Address (optional - only validate format if any field is filled)
    const hasSecondaryAddress = 
      formData.secondaryCompAdd?.trim() || 
      formData.secondaryCountry?.trim() || 
      formData.secondaryState?.trim() || 
      formData.secondaryCity?.trim() || 
      formData.secondaryZipcode?.trim();
    
    if (hasSecondaryAddress) {
      // If any secondary field is filled, validate zipcode format if provided
      const zipMsg = validateField("secondaryZipcode", formData.secondaryZipcode);
      if (zipMsg) newErrors.secondaryZipcode = zipMsg;
    }

    // Documents
    documentFields.forEach((doc) => {
      const file = formData[doc.key];
      const key = doc.key;

      // Required missing
      if (doc.required && !file) {
        const msg = `Please choose the ${doc.label} file.`;
        newErrors[key] = msg;
        return;
      }

      if (file) {
        if (!isAllowedDocType(file)) {
          newErrors[key] =
            "Please select the .pdf , .doc and .docx file only.";
        } else if (!isUnder10MB(file)) {
          newErrors[key] = "Please choose the file less than 10 MB.";
        }
      }
    });

    setErrors(newErrors);
    return newErrors;
  };

  // ---------- Handlers ----------
  const handleChange = (e) => {
    const { name, value } = e.target;

    let newValue = value;

    if (name === "phoneNo") {
      // Only digits; no spaces
      newValue = value.replace(/\D+/g, "").slice(0, 10);
    }

    setFormData((prev) => ({ ...prev, [name]: newValue }));

    // live-validate this field
    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, newValue) || undefined,
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    const file = files?.[0] || null;

    setFormData((prev) => ({ ...prev, [name]: file }));
    setUploadStatus((prev) => ({ ...prev, [name]: !!file }));

    // validate the file
    let err;
    if (!file) {
      // If required, message will be set on submit; clear now.
      err = undefined;
    } else if (!isAllowedDocType(file)) {
      err = "Please select the .pdf , .doc and .docx file only.";
    } else if (!isUnder10MB(file)) {
      err = "Please choose the file less than 10 MB.";
    } else {
      err = undefined;
    }

    setErrors((prev) => ({ ...prev, [name]: err }));
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
    truckerData.append("compAdd", formData.compAdd.trim());
    truckerData.append("country", formData.country.trim());
    truckerData.append("state", formData.state.trim());
    truckerData.append("city", formData.city.trim());
    truckerData.append("zipcode", formData.zipcode.trim());
    truckerData.append("phoneNo", formData.phoneNo.trim());
    truckerData.append("email", formData.email.trim());
    truckerData.append("password", formData.password);

    // Secondary Address (optional - send as nested FormData fields using bracket notation)
    // Backend will automatically parse these as secondaryAddress.compAdd, secondaryAddress.country, etc.
    if (formData.secondaryCompAdd?.trim() || 
        formData.secondaryCountry?.trim() || 
        formData.secondaryState?.trim() || 
        formData.secondaryCity?.trim() || 
        formData.secondaryZipcode?.trim()) {
      truckerData.append("secondaryAddress[compAdd]", formData.secondaryCompAdd?.trim() || "");
      truckerData.append("secondaryAddress[country]", formData.secondaryCountry?.trim() || "");
      truckerData.append("secondaryAddress[state]", formData.secondaryState?.trim() || "");
      truckerData.append("secondaryAddress[city]", formData.secondaryCity?.trim() || "");
      truckerData.append("secondaryAddress[zipcode]", formData.secondaryZipcode?.trim() || "");
    }

    // Documents
    documentFields.forEach((doc) => {
      const f = formData[doc.key];
      if (f) truckerData.append(doc.key, f);
    });

    try {
      const res = await axios.post(
        "https://vpl-liveproject-1.onrender.com/api/v1/shipper_driver/cmt/add-trucker",
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
          mc_dot_no: "",
          carrierType: "",
          fleetsize: "",
          email: "",
          password: "",
          confirmPassword: "",
          secondaryCompAdd: "",
          secondaryCountry: "",
          secondaryState: "",
          secondaryCity: "",
          secondaryZipcode: "",
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

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-transparent py-8 px-2">
      <form onSubmit={handleSubmit} noValidate  className="w-full max-w-2xl flex flex-col gap-4">
        {/* Basic Details */}
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl mb-1 p-8">
          <h4 className="text-2xl font-bold mb-4 text-center">Basic Details</h4>
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
                className="w-full border border-gray-400 px-4 py-2 rounded-lg"
              />
              {renderError("compName")}
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                  className="border border-gray-400 px-4 py-2 rounded-lg w-full"
                />
                {renderError("compAdd")}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Country <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
  required
  name="country"
  value={formData.country || ""}
  onChange={(val) => {
    // agar aap country ko US par lock rakhna chahte ho:
    // const US = "United States"; val = US;
    setFormData(p => ({ ...p, country: val, state: "", city: "" }));
  }}
  options={countryOptions}
  placeholder="Search country…"
  loading={geoLoading.countries}
  error={errors.country}
/>

                {renderError("country")}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                  className="border border-gray-400 px-4 py-2 rounded-lg w-full"
                />
                {renderError("zipcode")}
              </div>
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
                  className="border border-gray-400 px-4 py-2 rounded-lg w-full"
                  inputMode="numeric"
                />
                {renderError("phoneNo")}
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Address */}
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl mb-1 p-8">
          <h4 className="text-2xl font-bold mb-4 text-center">Secondary Address (Optional)</h4>
          <div className="w-full flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Company Address
              </label>
              <input
                type="text"
                name="secondaryCompAdd"
                placeholder="Secondary Company Address"
                value={formData.secondaryCompAdd}
                onChange={handleChange}
                className="w-full border border-gray-400 px-4 py-2 rounded-lg"
              />
              {renderError("secondaryCompAdd")}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Country
                </label>
                <SearchableSelect
                  name="secondaryCountry"
                  value={formData.secondaryCountry || ""}
                  onChange={(val) => {
                    setFormData(p => ({ ...p, secondaryCountry: val, secondaryState: "", secondaryCity: "" }));
                  }}
                  options={countryOptions}
                  placeholder="Search country…"
                  loading={geoLoading.countries}
                  error={errors.secondaryCountry}
                />
                {renderError("secondaryCountry")}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  State
                </label>
                <SearchableSelect
                  name="secondaryState"
                  value={formData.secondaryState || ""}
                  onChange={(val) => setFormData(p => ({ ...p, secondaryState: val, secondaryCity: "" }))}
                  options={secondaryStateOptions}
                  placeholder={formData.secondaryCountry ? "Search state…" : "Select country first"}
                  disabled={!formData.secondaryCountry}
                  loading={secondaryGeoLoading.states}
                  error={errors.secondaryState}
                />
                {renderError("secondaryState")}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  City
                </label>
                <SearchableSelect
                  name="secondaryCity"
                  value={formData.secondaryCity || ""}
                  onChange={(val) => setFormData(p => ({ ...p, secondaryCity: val }))}
                  options={secondaryCityOptions}
                  placeholder={formData.secondaryState ? "Search city…" : "Select state first"}
                  allowCustom
                  disabled={!formData.secondaryState}
                  loading={secondaryGeoLoading.cities}
                  error={errors.secondaryCity}
                />
                {renderError("secondaryCity")}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Zip Code
                </label>
                <input
                  type="text"
                  name="secondaryZipcode"
                  placeholder="Secondary Zip Code"
                  value={formData.secondaryZipcode}
                  onChange={handleChange}
                  className="border border-gray-400 px-4 py-2 rounded-lg w-full"
                />
                {renderError("secondaryZipcode")}
              </div>
            </div>
          </div>
        </div>

        {/* Fleet Details */}
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl mb-1 p-8">
          <h4 className="text-2xl font-bold mb-4 text-center">Fleet Details</h4>
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
                className="border border-gray-400 px-4 py-2 rounded-lg w-full"
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
                className="border border-gray-400 px-4 py-2 rounded-lg w-full"
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
                className="border border-gray-400 px-4 py-2 rounded-lg w-full"
              />
              {renderError("fleetsize")}
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl mb-1 p-8">
          <h4 className="text-2xl font-bold mb-4 text-center">Required Documents</h4>
          <div className="w-full grid grid-cols-2 gap-4">
            {documentFields.map((doc) => (
              <div key={doc.key} className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <FileText size={16} />
                  {doc.label} {doc.required && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    type="file"
                    name={doc.key}
                    onChange={handleFileChange}
                    className="w-full border border-gray-400 px-4 py-2 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    accept=".pdf,.doc,.docx"
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
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl mb-1 p-8">
          <h4 className="text-2xl font-bold mb-4 text-center">Create Account</h4>

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
                className="w-full border border-gray-400 px-4 py-2 rounded-lg"
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
                  className="border border-gray-400 px-4 py-2 rounded-lg w-full pr-10"
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
                  className="border border-gray-400 px-4 py-2 rounded-lg w-full pr-10"
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

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 rounded-full text-lg font-bold transition flex items-center justify-center gap-2 ${
              isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-black text-white hover:opacity-90"
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Adding Trucker...
              </>
            ) : (
              "Add Trucker"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
