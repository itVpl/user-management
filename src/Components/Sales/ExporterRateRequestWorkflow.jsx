import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import alertify from "alertifyjs";
import "alertifyjs/build/css/alertify.css";
import API_CONFIG from "../../config/api.js";
import { fetchSalesDayList } from "../../services/salesDayAgentService.js";
import CountryFlagImg from "../common/CountryFlagImg.jsx";
import {
  FALLBACK_COUNTRIES,
  listShipmentCountries,
  listShipmentPorts,
  shipmentCountriesToSelectOptions,
  shipmentPortsToSelectOptions,
} from "../../services/shipmentLookupService.js";
import BlinkingUnreadDot from "../common/BlinkingUnreadDot.jsx";
import {
  getUserFromStorage,
  isEmployeeActiveForHandoff,
  isSalesDayShiftTiming,
  isSalesDepartment,
} from "../../utils/salesDayAgentEligibility.js";
import {
  Search,
  Package,
  Eye,
  Plus,
  PlusCircle,
  FileText,
  Paperclip,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Ship,
  ClipboardList,
  MapPin,
  MapPinned,
  Clock3,
  Receipt,
  Truck,
} from "lucide-react";
import containerS20 from "../../assets/containers/s20.svg";
import containerS40 from "../../assets/containers/s40.svg";
import containerHc40 from "../../assets/containers/hc40.svg";
import containerHc45 from "../../assets/containers/hc45.svg";
import { HS_CODE_OPTIONS } from "../../data/hsCodeOptions.js";
import {
  EXPORTER_QUOTE_SUMMARY_EVENT,
  EXPORTER_QUOTE_THREAD_READ_EVENT,
  buildExporterQuoteRequestUnreadMap,
  getExporterQuoteRequestUnreadCount,
  readExporterQuoteBellEntries,
} from "./exporterQuoteNotificationUtils.js";
import RateRequestDocumentsPanel, {
  formatDocumentProgressLabel,
} from "./RateRequestDocumentsPanel.jsx";

/** Matches `GET /meta` — see `exporter-rate-request-frontend-api.md` */
const STATUS_OPTIONS = [
  "new",
  "in_review",
  "pricing_in_progress",
  "quoted",
  "won",
  "lost",
  "closed_no_response",
];

const INCOTERM_OPTIONS = ["DAP", "DPU", "DDP"];
const CREATE_INCOTERM_OPTIONS = [
  "EXW",
  "FCA",
  "FAS",
  "FOB",
  "CFR",
  "CIF",
  "CPT",
  "CIP",
  "DAP",
  "DPU",
  "DDP",
].map((term) => ({ value: term, label: term }));

const CONTAINER_TYPE_OPTIONS = [
  { value: "S20", label: "20FT Standard", image: containerS20 },
  { value: "S40", label: "40FT Standard", image: containerS40 },
  { value: "HC40", label: "40FT High Cube", image: containerHc40 },
  { value: "HC45", label: "45FT High Cube", image: containerHc45 },
];

const CREATE_CONTAINER_OPTIONS = CONTAINER_TYPE_OPTIONS.map((c) => ({
  value: c.value,
  label: c.label,
}));

const CARGO_TYPE_CREATE_OPTIONS = [
  { value: "general", label: "General Cargo" },
  { value: "reefer", label: "Reefer" },
  { value: "hazardous", label: "Hazardous / DG" },
  { value: "project", label: "Project Cargo" },
  { value: "vehicles", label: "Vehicles" },
];

const SERVICE_TYPE_OPTIONS = [
  { value: "port_to_port", label: "Port to Port" },
  { value: "door_to_door", label: "Door to Door" },
  { value: "door_to_port", label: "Door to Port" },
  { value: "port_to_door", label: "Port to Door" },
];

const SHIPMENT_TYPE_OPTIONS = [
  { value: "FCL", label: "FCL (Full Container Load)" },
  { value: "LCL", label: "LCL (Less than Container Load)" },
];

/** PATCH /api/v1/exporter-rate-requst/:id/extra-details — cargo / customs fields */
const EXTRA_DETAILS_LABELS = {
  commodityName: "Commodity name",
  weight: "Gross weight",
  unit: "Unit (KG / LBS)",
  dimensions: "Dimensions (cm)",
  noOfPkgs: "Number of packages",
  stackable: "Stackable",
  pkgType: "Packaging type",
  ispm15Compliance: "ISPM-15 compliance",
  treatmentType: "Treatment type",
  ippcStampVerified: "IPPC stamp verified",
  hsCode: "HS code",
  customsClearanceRequirement: "Customer clearance requirement",
  customsBondRequirement: "Customs bond requirement",
  cargoReadyDate: "Cargo ready date",
  pickupTime: "Pickup time",
  deliveryLocationType: "Delivery location type",
  deliveryTimeAppointment: "Delivery time / appointment",
};

const EXTRA_DETAILS_DISPLAY_KEYS = [
  "commodityName",
  "weight",
  "unit",
  "dimensions",
  "noOfPkgs",
  "stackable",
  "pkgType",
  "ispm15Compliance",
  "treatmentType",
  "ippcStampVerified",
  "hsCode",
  "customsClearanceRequirement",
  "customsBondRequirement",
  "cargoReadyDate",
  "pickupTime",
  "deliveryLocationType",
  "deliveryTimeAppointment",
];

const WEIGHT_UNIT_OPTIONS = [
  { value: "KG", label: "KG" },
  { value: "LBS", label: "LBS" },
];

const STACKABLE_OPTIONS = [
  { value: "stackable", label: "Stackable" },
  { value: "non-stackable", label: "Non-stackable" },
];

const ISPM15_COMPLIANCE_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "pending_confirmation", label: "Pending Confirmation" },
];

const IPPC_STAMP_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

/** API enum values for customsClearanceRequirement */
const CUSTOMS_CLEARANCE_REQUIREMENT_OPTIONS = [
  { value: "export_customs_clearance", label: "Export Customs Clearance" },
  { value: "import_customs_clearance", label: "Import Customs Clearance" },
  { value: "both", label: "Both" },
  { value: "none", label: "None" },
];

/** API enum values for customsBondRequirement */
const CUSTOMS_BOND_REQUIREMENT_OPTIONS = [
  { value: "single_entry_bond", label: "Single Entry Bond" },
  { value: "continuous_bond", label: "Continuous Bond" },
  { value: "none", label: "None" },
];

function normalizeSelectOptionValue(value, options) {
  const s = String(value ?? "").trim();
  if (!s) return "";
  const exact = options.find((o) => o.value === s);
  if (exact) return exact.value;
  const lower = s.toLowerCase();
  const byValue = options.find((o) => o.value.toLowerCase() === lower);
  if (byValue) return byValue.value;
  const byLabel = options.find((o) => o.label.toLowerCase() === lower);
  if (byLabel) return byLabel.value;
  return "";
}

function normalizeCustomsClearanceFromApi(value) {
  const mapped = normalizeSelectOptionValue(value, CUSTOMS_CLEARANCE_REQUIREMENT_OPTIONS);
  if (mapped) return mapped;
  const s = String(value ?? "").trim().toLowerCase();
  if (!s) return "";
  if (s === "export customs clearance") return "export_customs_clearance";
  if (s === "import customs clearance" || s === "import custons clearance") return "import_customs_clearance";
  if (s === "yes" || s === "export") return "export_customs_clearance";
  if (s === "import") return "import_customs_clearance";
  if (s.includes("both")) return "both";
  if (s.includes("none") || s === "no") return "none";
  if (s.includes("export") && s.includes("import")) return "both";
  if (s.includes("export")) return "export_customs_clearance";
  if (s.includes("import")) return "import_customs_clearance";
  return "";
}

function normalizeCustomsBondFromApi(value) {
  const mapped = normalizeSelectOptionValue(value, CUSTOMS_BOND_REQUIREMENT_OPTIONS);
  if (mapped) return mapped;
  const s = String(value ?? "").trim().toLowerCase();
  if (!s) return "";
  if (s === "single entry bond") return "single_entry_bond";
  if (s === "continuous bond") return "continuous_bond";
  if (s.includes("single")) return "single_entry_bond";
  if (s.includes("continuous")) return "continuous_bond";
  if (s.includes("none") || s === "no") return "none";
  return "";
}

function appendSelectField(out, key, formValue, options) {
  const raw = String(formValue ?? "").trim();
  if (!raw) return;
  const normalized = normalizeSelectOptionValue(raw, options);
  out[key] = normalized || raw;
}

function resolveExtraDetailsDetail(response) {
  const d = response?.data?.data;
  if (!d || typeof d !== "object") return null;
  if (d.extraDetails && typeof d.extraDetails === "object" && !Array.isArray(d.extraDetails)) {
    return { ...d, ...d.extraDetails };
  }
  return d;
}

/** Must match backend enum for pkgType */
const PKG_TYPE_OPTIONS = [
  { value: "Carton/Boxes", label: "Carton / Boxes" },
  { value: "Pallet", label: "Pallet" },
  { value: "Crates", label: "Crates" },
  { value: "Wooden Cases", label: "Wooden Cases" },
  { value: "Drums", label: "Drums" },
];

function normalizePkgTypeFromApi(value) {
  const s = String(value ?? "").trim();
  if (!s) return "";
  const exact = PKG_TYPE_OPTIONS.find((o) => o.value === s);
  if (exact) return exact.value;
  const lower = s.toLowerCase();
  if (/carton|box/.test(lower)) return "Carton/Boxes";
  if (/pallet/.test(lower)) return "Pallet";
  if (/crate/.test(lower)) return "Crates";
  if (/wooden\s*case/.test(lower)) return "Wooden Cases";
  if (/drum/.test(lower)) return "Drums";
  return "";
}

const YES_NO_EXTRA_OPTIONS = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
];

const DELIVERY_LOCATION_TYPE_OPTIONS = [
  { value: "Warehouse with dock", label: "Warehouse with dock" },
  { value: "Factory", label: "Factory" },
  { value: "Residential", label: "Residential" },
  { value: "Commercial Hub", label: "Commercial Hub" },
  { value: "Port", label: "Port" },
];

function packagingTypeRequiresWoodCompliance(pkgType) {
  const v = String(pkgType || "").trim();
  return v === "Pallet" || v === "Crates" || v === "Wooden Cases";
}

function defaultEmptyDimensions() {
  return { length: "", width: "", height: "" };
}

function normalizeStackableFromApi(value) {
  const s = String(value ?? "").trim().toLowerCase();
  if (!s) return "";
  if (s === "stackable" || s === "yes" || s === "true") return "stackable";
  if (s === "non-stackable" || s === "non stackable" || s.includes("non")) return "non-stackable";
  if (s.includes("stack")) return "stackable";
  return "";
}

function normalizeYesNoApiValue(value) {
  const s = String(value ?? "").trim().toLowerCase();
  if (s === "yes" || s === "true") return "yes";
  if (s === "no" || s === "false") return "no";
  return "";
}

function normalizeIspm15FromApi(value) {
  const s = String(value ?? "").trim().toLowerCase();
  if (s === "yes" || s === "true") return "yes";
  if (s === "no" || s === "false") return "no";
  if (s.includes("pending")) return "pending_confirmation";
  return "";
}

function applyTreatmentTypeToForm(detail, form) {
  form.treatmentHeatTreated = false;
  form.treatmentMethylBromide = false;
  if (!detail || typeof detail !== "object") return;
  if (detail.treatmentHeatTreated === true) form.treatmentHeatTreated = true;
  if (detail.treatmentMethylBromide === true) form.treatmentMethylBromide = true;
  const tt = detail.treatmentType;
  if (Array.isArray(tt)) {
    form.treatmentHeatTreated =
      form.treatmentHeatTreated || tt.some((t) => /heat|ht/i.test(String(t)));
    form.treatmentMethylBromide =
      form.treatmentMethylBromide || tt.some((t) => /methyl|mb/i.test(String(t)));
  } else if (tt != null && String(tt).trim()) {
    const normalized = normalizeTreatmentTypeFromApi(tt);
    if (normalized === "heat_treated") form.treatmentHeatTreated = true;
    if (normalized === "methyl_bromide") form.treatmentMethylBromide = true;
  }
}

function buildTreatmentTypePayload(form) {
  if (form.treatmentHeatTreated) return "heat_treated";
  if (form.treatmentMethylBromide) return "methyl_bromide";
  return "";
}

function normalizeTreatmentTypeFromApi(value) {
  if (value == null || value === "") return "";
  if (Array.isArray(value)) {
    const joined = value.map((v) => String(v).toLowerCase()).join(" ");
    if (/heat|ht/.test(joined)) return "heat_treated";
    if (/methyl|mb/.test(joined)) return "methyl_bromide";
    return "";
  }
  const s = String(value).trim().toLowerCase();
  if (/heat|ht|heat_treated/.test(s)) return "heat_treated";
  if (/methyl|mb|methyl_bromide/.test(s)) return "methyl_bromide";
  return "";
}

function readDimensionsFromDetail(detail) {
  const dim = detail?.dimensions;
  if (dim && typeof dim === "object" && !Array.isArray(dim)) {
    return {
      length: dim.length != null ? String(dim.length) : "",
      width: dim.width != null ? String(dim.width) : "",
      height: dim.height != null ? String(dim.height) : "",
    };
  }
  if (Array.isArray(dim) && dim[0] && typeof dim[0] === "object") {
    return {
      length: dim[0].length != null ? String(dim[0].length) : "",
      width: dim[0].width != null ? String(dim[0].width) : "",
      height: dim[0].height != null ? String(dim[0].height) : "",
    };
  }
  return {
    length: detail?.dimensionLength != null ? String(detail.dimensionLength) : "",
    width: detail?.dimensionWidth != null ? String(detail.dimensionWidth) : "",
    height: detail?.dimensionHeight != null ? String(detail.dimensionHeight) : "",
  };
}

function buildDimensionsObjectPayload(dimensions) {
  if (!dimensions || typeof dimensions !== "object") return null;
  const length = Number(String(dimensions.length ?? "").replace(/,/g, ""));
  const width = Number(String(dimensions.width ?? "").replace(/,/g, ""));
  const height = Number(String(dimensions.height ?? "").replace(/,/g, ""));
  if ([length, width, height].every((n) => Number.isNaN(n))) return null;
  const out = {};
  if (!Number.isNaN(length)) out.length = length;
  if (!Number.isNaN(width)) out.width = width;
  if (!Number.isNaN(height)) out.height = height;
  return Object.keys(out).length ? out : null;
}

function toSelectLabel(value, options) {
  const match = options.find((o) => o.value === value);
  return match ? match.label : value;
}

function getLocationZipcode(loc) {
  if (!loc || typeof loc !== "object") return "";
  return String(loc.zipcode ?? loc.pincode ?? "").trim();
}

function defaultEmptyLocation() {
  return { address: "", city: "", pincode: "" };
}

function defaultEmptyTruckingLocation() {
  return { address: "", city: "", state: "", zipcode: "" };
}

function cloneDefaultExtraDetailsForm() {
  return {
    commodityName: "",
    weight: "",
    unit: "",
    dimensions: defaultEmptyDimensions(),
    noOfPkgs: "",
    stackable: "",
    pkgType: "",
    ispm15Compliance: "",
    treatmentHeatTreated: false,
    treatmentMethylBromide: false,
    ippcStampVerified: "",
    hsCode: "",
    customsClearanceRequirement: "",
    customsBondRequirement: "",
    cargoReadyDate: "",
    pickupTime: "",
    deliveryLocationType: "",
    deliveryTimeAppointment: "",
    originTruckingRequired: "",
    originTruckingPickupLocation: defaultEmptyTruckingLocation(),
    originTruckingDeliveryLocation: defaultEmptyTruckingLocation(),
    destinationTruckingRequired: "",
    destinationTruckingPickupLocation: defaultEmptyTruckingLocation(),
    destinationTruckingDeliveryLocation: defaultEmptyTruckingLocation(),
  };
}

function normalizeLocationFromApi(v) {
  if (v == null) return defaultEmptyLocation();
  if (typeof v === "string" && v.trim()) {
    return { address: v.trim(), city: "", pincode: "" };
  }
  if (typeof v === "object") {
    return {
      address: v.address != null ? String(v.address) : "",
      city: v.city != null ? String(v.city) : "",
      pincode: v.pincode != null ? String(v.pincode) : "",
    };
  }
  return defaultEmptyLocation();
}

function normalizeTruckingLocationFromApi(v) {
  if (v == null) return defaultEmptyTruckingLocation();
  if (typeof v === "string" && v.trim()) {
    return { address: v.trim(), city: "", state: "", zipcode: "" };
  }
  if (typeof v === "object") {
    return {
      address: v.address != null ? String(v.address) : "",
      city: v.city != null ? String(v.city) : "",
      state: v.state != null ? String(v.state) : "",
      zipcode: getLocationZipcode(v),
    };
  }
  return defaultEmptyTruckingLocation();
}

function locationHasAnyValue(loc) {
  if (loc == null) return false;
  if (typeof loc === "string") return loc.trim() !== "";
  if (typeof loc === "object") {
    return [loc.address, loc.city, loc.state, getLocationZipcode(loc)].some((v) => String(v ?? "").trim() !== "");
  }
  return false;
}

function buildLocationPayload(loc) {
  if (!loc || typeof loc !== "object") return null;
  const address = (loc.address || "").trim();
  const city = (loc.city || "").trim();
  const pincode = (loc.pincode || "").trim();
  if (!address && !city && !pincode) return null;
  return { address, city, pincode };
}

function buildTruckingLocationPayload(loc) {
  if (!loc || typeof loc !== "object") return null;
  const address = (loc.address || "").trim();
  const city = (loc.city || "").trim();
  const state = (loc.state || "").trim();
  const zipcode = getLocationZipcode(loc);
  if (!address && !city && !state && !zipcode) return null;
  return { address, city, state, zipcode };
}

function isTruckingYes(value) {
  return String(value || "").trim().toLowerCase() === "yes";
}

function appendTruckingLocationFormData(payload, fieldPrefix, location) {
  const built = buildTruckingLocationPayload(location);
  if (!built) return;
  payload.append(`${fieldPrefix}[address]`, built.address);
  payload.append(`${fieldPrefix}[city]`, built.city);
  payload.append(`${fieldPrefix}[state]`, built.state);
  payload.append(`${fieldPrefix}[zipcode]`, built.zipcode);
}

function validateTruckingSection(requiredValue, pickupLocation, deliveryLocation, sectionLabel) {
  if (!isTruckingYes(requiredValue)) return null;

  const pickup = buildTruckingLocationPayload(pickupLocation);
  const delivery = buildTruckingLocationPayload(deliveryLocation);

  if (!pickup || !delivery) {
    return `${sectionLabel}: pickup and delivery locations are required when trucking is Yes.`;
  }

  const hasFullPickup = pickup.address && pickup.city && pickup.state && pickup.zipcode;
  const hasFullDelivery = delivery.address && delivery.city && delivery.state && delivery.zipcode;

  if (!hasFullPickup || !hasFullDelivery) {
    return `${sectionLabel}: address, city, state, and zipcode are required for both pickup and delivery.`;
  }

  return null;
}

function formatLocationForView(loc) {
  if (loc == null) return null;
  if (typeof loc === "string" && loc.trim()) return loc.trim();
  if (typeof loc === "object") {
    const address = (loc.address || "").trim();
    const city = (loc.city || "").trim();
    const state = (loc.state || "").trim();
    const zipcode = getLocationZipcode(loc);
    if (!address && !city && !state && !zipcode) return null;
    const cityState = [city, state].filter(Boolean).join(", ");
    const line2 = [cityState, zipcode].filter(Boolean).join(cityState && zipcode ? " " : "");
    const parts = [address, line2].filter(Boolean);
    return parts.join("\n");
  }
  return null;
}

function isYesValue(value) {
  const s = String(value ?? "").trim().toLowerCase();
  return s === "yes" || s === "true";
}

function hasExtraDetails(detail) {
  if (!detail || typeof detail !== "object") return false;
  const legacyKeys = ["productName", "cargoGrossWeight", "packageCount", "packagingType"];
  if (legacyKeys.some((key) => detail[key] != null && String(detail[key]).trim() !== "")) return true;
  if (detail.dimensions && typeof detail.dimensions === "object") return true;
  return EXTRA_DETAILS_DISPLAY_KEYS.some((key) => {
    const v = detail[key];
    if (v === undefined || v === null) return false;
    if (key === "dimensions" && typeof v === "object") return true;
    if (typeof v === "number" && !Number.isNaN(v)) return true;
    if (typeof v === "boolean") return v;
    return String(v).trim() !== "";
  });
}

function formatExtraDetailDisplay(key, detail) {
  if (key === "dimensions") {
    const dim = readDimensionsFromDetail(detail);
    if (!dim.length && !dim.width && !dim.height) return null;
    return `${dim.length} × ${dim.width} × ${dim.height} cm`;
  }

  if (key === "treatmentType") {
    const parts = [];
    if (detail.treatmentHeatTreated) parts.push("Heat Treated (HT)");
    if (detail.treatmentMethylBromide) parts.push("Methyl Bromide (MB)");
    if (parts.length) return parts.join(", ");
    const normalized = normalizeTreatmentTypeFromApi(detail.treatmentType);
    if (normalized === "heat_treated") return "Heat Treated (HT)";
    if (normalized === "methyl_bromide") return "Methyl Bromide (MB)";
    if (detail.treatmentType) return String(detail.treatmentType);
    return null;
  }

  if (key === "hsCode") {
    const hc = detail.hsCode;
    if (hc === undefined || hc === null || String(hc).trim() === "") return null;
    const key6 = normalizeHsDigits(hc);
    const opt = HS_CODE_OPTIONS.find((o) => o.value === key6);
    return opt ? opt.label : String(hc).trim();
  }

  const raw =
    key === "commodityName"
      ? (detail.commodityName ?? detail.productName)
      : key === "weight"
        ? (detail.weight ?? detail.cargoGrossWeight)
        : key === "unit"
          ? (detail.unit ?? detail.cargoGrossWeightUnit)
          : key === "noOfPkgs"
            ? (detail.noOfPkgs ?? detail.packageCount)
            : key === "stackable"
              ? (detail.stackable ?? detail.cargoStackable)
              : key === "pkgType"
                ? (detail.pkgType ?? detail.packagingType)
                : key === "customsClearanceRequirement"
                  ? (detail.customsClearanceRequirement ??
                    detail.customerClearanceRequirement ??
                    detail.customsClearanceOriginRequired)
                  : detail[key];
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "number" && Number.isNaN(raw)) return null;
  if (typeof raw !== "number" && typeof raw !== "boolean" && String(raw).trim() === "") return null;

  if (key === "cargoReadyDate") return formatDateOnly(raw) || formatDateTime(raw);
  if (key === "pickupTime") {
    if (typeof raw === "string" && /^\d{1,2}:\d{2}/.test(raw.trim())) return raw.trim();
    const dt = new Date(raw);
    if (!Number.isNaN(dt.getTime())) {
      const pad = (n) => String(n).padStart(2, "0");
      return `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    }
    return formatDateTime(raw);
  }

  if (key === "ispm15Compliance") {
    const v = normalizeIspm15FromApi(raw) || String(raw).trim();
    const opt = ISPM15_COMPLIANCE_OPTIONS.find((o) => o.value === v);
    return opt ? opt.label : String(raw);
  }
  if (key === "ippcStampVerified") {
    const s = String(raw).toLowerCase();
    if (s === "yes") return "Yes";
    if (s === "no") return "No";
    if (s === "true") return "Yes";
    if (s === "false") return "No";
    return String(raw);
  }
  if (key === "weight" || key === "noOfPkgs") {
    return typeof raw === "number" ? String(raw) : String(raw).trim();
  }
  if (key === "unit") return toSelectLabel(String(raw).trim(), WEIGHT_UNIT_OPTIONS);
  if (key === "stackable") return toSelectLabel(normalizeStackableFromApi(raw), STACKABLE_OPTIONS);
  if (key === "pkgType") return toSelectLabel(normalizePkgTypeFromApi(raw) || String(raw).trim(), PKG_TYPE_OPTIONS);
  if (key === "customsClearanceRequirement") {
    return toSelectLabel(
      normalizeCustomsClearanceFromApi(raw) || String(raw).trim(),
      CUSTOMS_CLEARANCE_REQUIREMENT_OPTIONS,
    );
  }
  if (key === "customsBondRequirement") {
    return toSelectLabel(
      normalizeCustomsBondFromApi(raw) || String(raw).trim(),
      CUSTOMS_BOND_REQUIREMENT_OPTIONS,
    );
  }
  if (key === "deliveryLocationType") {
    return toSelectLabel(String(raw).trim(), DELIVERY_LOCATION_TYPE_OPTIONS);
  }
  return String(raw).trim();
}

/** Yes/No extras — use SearchableSelect (same pattern as filters / Source) */
const YES_NO_SEARCH_OPTIONS = [
  { value: "", label: "—" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

function isoToDatetimeLocal(iso) {
  if (!iso) return "";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function isoToDateInput(iso) {
  if (!iso) return "";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

function isoToTimeInput(iso) {
  if (!iso) return "";
  if (typeof iso === "string" && /^\d{1,2}:\d{2}/.test(iso.trim())) return iso.trim().slice(0, 5);
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

/** Normalize stored HS labels like "6907.21" / "6907 21" to 6-digit keys matching HS_CODE_OPTIONS */
function normalizeHsDigits(raw) {
  if (raw == null || raw === "") return "";
  return String(raw).replace(/[\s.]/g, "").trim();
}

function resolveHsCodeFormValue(stored) {
  const key = normalizeHsDigits(stored);
  if (!key) return "";
  return HS_CODE_OPTIONS.some((o) => o.value === key) ? key : "";
}

function detailToExtraForm(detail) {
  const f = cloneDefaultExtraDetailsForm();
  if (!detail || typeof detail !== "object") return f;

  f.commodityName = String(detail.commodityName ?? detail.productName ?? "").trim();
  f.weight = String(detail.weight ?? detail.cargoGrossWeight ?? "").trim();
  f.unit = String(detail.unit ?? detail.cargoGrossWeightUnit ?? "").trim().toUpperCase();
  f.dimensions = readDimensionsFromDetail(detail);
  f.noOfPkgs = String(detail.noOfPkgs ?? detail.packageCount ?? "").trim();
  f.stackable = normalizeStackableFromApi(detail.stackable ?? detail.cargoStackable);
  f.pkgType = normalizePkgTypeFromApi(detail.pkgType ?? detail.packagingType);
  f.ispm15Compliance = normalizeIspm15FromApi(detail.ispm15Compliance);
  applyTreatmentTypeToForm(detail, f);
  f.ippcStampVerified = normalizeYesNoApiValue(detail.ippcStampVerified);

  f.originTruckingPickupLocation = normalizeTruckingLocationFromApi(detail.originTruckingPickupLocation);
  f.originTruckingDeliveryLocation = normalizeTruckingLocationFromApi(detail.originTruckingDeliveryLocation);
  f.destinationTruckingPickupLocation = normalizeTruckingLocationFromApi(
    detail.destinationTruckingPickupLocation,
  );
  f.destinationTruckingDeliveryLocation = normalizeTruckingLocationFromApi(
    detail.destinationTruckingDeliveryLocation,
  );

  f.customsClearanceRequirement = normalizeCustomsClearanceFromApi(
    detail.customsClearanceRequirement ??
      detail.customerClearanceRequirement ??
      detail.customsClearanceOriginRequired,
  );
  f.customsBondRequirement = normalizeCustomsBondFromApi(detail.customsBondRequirement);

  const otherScalarKeys = [
    "deliveryLocationType",
    "deliveryTimeAppointment",
    "originTruckingRequired",
    "destinationTruckingRequired",
  ];
  for (const key of otherScalarKeys) {
    const v = detail[key];
    if (v === undefined || v === null || v === "") continue;
    f[key] = String(v);
  }

  if (detail.hsCode) {
    const resolved = resolveHsCodeFormValue(detail.hsCode);
    if (resolved) f.hsCode = resolved;
  }
  if (detail.cargoReadyDate) f.cargoReadyDate = isoToDateInput(detail.cargoReadyDate);
  if (detail.pickupTime) f.pickupTime = isoToTimeInput(detail.pickupTime);

  return f;
}

function appendNumericField(out, key, raw) {
  if (raw === "" || raw === undefined || raw === null) return;
  const n = Number(String(raw).replace(/,/g, ""));
  if (!Number.isNaN(n)) out[key] = n;
}

function buildExtraDetailsPayload(form) {
  const out = {};

  if (form.commodityName?.trim()) out.commodityName = form.commodityName.trim();
  appendNumericField(out, "weight", form.weight);
  if (form.unit) out.unit = String(form.unit).trim().toUpperCase();

  const dimensions = buildDimensionsObjectPayload(form.dimensions);
  if (dimensions) out.dimensions = dimensions;

  appendNumericField(out, "noOfPkgs", form.noOfPkgs);
  if (form.stackable) out.stackable = form.stackable;
  const pkgType = normalizePkgTypeFromApi(form.pkgType);
  if (pkgType) out.pkgType = pkgType;

  if (packagingTypeRequiresWoodCompliance(form.pkgType)) {
    if (form.ispm15Compliance) out.ispm15Compliance = form.ispm15Compliance;
    if (form.ippcStampVerified) out.ippcStampVerified = form.ippcStampVerified;
    const treatmentType = buildTreatmentTypePayload(form);
    if (treatmentType) out.treatmentType = treatmentType;
  }

  if (form.hsCode?.trim()) out.hsCode = form.hsCode.trim();
  appendSelectField(out, "customsClearanceRequirement", form.customsClearanceRequirement, CUSTOMS_CLEARANCE_REQUIREMENT_OPTIONS);
  appendSelectField(out, "customsBondRequirement", form.customsBondRequirement, CUSTOMS_BOND_REQUIREMENT_OPTIONS);
  if (form.deliveryLocationType) out.deliveryLocationType = form.deliveryLocationType;

  if (form.cargoReadyDate) {
    const d = new Date(`${form.cargoReadyDate}T00:00:00`);
    if (!Number.isNaN(d.getTime())) out.cargoReadyDate = d.toISOString();
  }

  if (form.pickupTime) {
    const time = String(form.pickupTime).trim();
    if (form.cargoReadyDate && /^\d{1,2}:\d{2}/.test(time)) {
      const d = new Date(`${form.cargoReadyDate}T${time}`);
      if (!Number.isNaN(d.getTime())) out.pickupTime = d.toISOString();
    } else if (/^\d{1,2}:\d{2}/.test(time)) {
      out.pickupTime = time;
    } else {
      const d = new Date(time);
      if (!Number.isNaN(d.getTime())) out.pickupTime = d.toISOString();
    }
  }

  if (form.deliveryTimeAppointment?.trim()) out.deliveryTimeAppointment = form.deliveryTimeAppointment.trim();

  if (form.originTruckingRequired) {
    out.originTruckingRequired = form.originTruckingRequired;
    if (String(form.originTruckingRequired).toLowerCase() !== "no") {
      const originPickup = buildTruckingLocationPayload(form.originTruckingPickupLocation);
      const originDelivery = buildTruckingLocationPayload(form.originTruckingDeliveryLocation);
      if (originPickup) out.originTruckingPickupLocation = originPickup;
      if (originDelivery) out.originTruckingDeliveryLocation = originDelivery;
    }
  }

  if (form.destinationTruckingRequired) {
    out.destinationTruckingRequired = form.destinationTruckingRequired;
    if (String(form.destinationTruckingRequired).toLowerCase() !== "no") {
      const destinationPickup = buildTruckingLocationPayload(form.destinationTruckingPickupLocation);
      const destinationDelivery = buildTruckingLocationPayload(form.destinationTruckingDeliveryLocation);
      if (destinationPickup) out.destinationTruckingPickupLocation = destinationPickup;
      if (destinationDelivery) out.destinationTruckingDeliveryLocation = destinationDelivery;
    }
  }

  return out;
}

const extraInputClass =
  "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

/** Customs modal — section shell with color coding */
function ExtraSection({ tone, icon: Icon, title, children }) {
  const tones = {
    violet: {
      wrap: "border-violet-200/90 bg-gradient-to-br from-violet-50/95 via-white to-violet-50/40 ring-1 ring-violet-100",
      heading: "text-violet-950 border-violet-200/80",
      iconBg: "bg-violet-100 text-violet-700",
    },
    sky: {
      wrap: "border-sky-200/90 bg-gradient-to-br from-sky-50/95 via-white to-sky-50/40 ring-1 ring-sky-100",
      heading: "text-sky-950 border-sky-200/80",
      iconBg: "bg-sky-100 text-sky-700",
    },
    emerald: {
      wrap: "border-emerald-200/90 bg-gradient-to-br from-emerald-50/95 via-white to-emerald-50/40 ring-1 ring-emerald-100",
      heading: "text-emerald-950 border-emerald-200/80",
      iconBg: "bg-emerald-100 text-emerald-700",
    },
    amber: {
      wrap: "border-amber-200/90 bg-gradient-to-br from-amber-50/95 via-white to-amber-50/40 ring-1 ring-amber-100",
      heading: "text-amber-950 border-amber-200/80",
      iconBg: "bg-amber-100 text-amber-700",
    },
    rose: {
      wrap: "border-rose-200/90 bg-gradient-to-br from-rose-50/95 via-white to-rose-50/40 ring-1 ring-rose-100",
      heading: "text-rose-950 border-rose-200/80",
      iconBg: "bg-rose-100 text-rose-700",
    },
    slate: {
      wrap: "border-slate-300/90 bg-gradient-to-br from-slate-50/95 via-white to-slate-100/50 ring-1 ring-slate-200",
      heading: "text-slate-900 border-slate-200/90",
      iconBg: "bg-slate-200/80 text-slate-700",
    },
  };
  const t = tones[tone] || tones.slate;
  return (
    <section className={`rounded-2xl border-2 p-5 shadow-sm ${t.wrap}`}>
      <div className={`mb-4 flex flex-col gap-1 border-b pb-3 ${t.heading}`}>
        <h4 className="flex items-center gap-3 text-sm font-bold">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${t.iconBg}`}>
            <Icon size={18} strokeWidth={2} />
          </span>
          <span>{title}</span>
        </h4>
      </div>
      {children}
    </section>
  );
}

const defaultCreateForm = {
  source: "whatsapp",
  exporterCompany: "",
  contactPerson: "",
  contactEmail: "",
  contactPhone: "",
  originCountry: "IN",
  destinationCountry: "US",
  originPort: "",
  destinationPort: "",
  cargoType: "",
  containerType: "",
  shipmentType: "FCL",
  serviceType: "",
  incoterm: "",
  originTruckingRequired: "",
  originTruckingPickupLocation: defaultEmptyTruckingLocation(),
  originTruckingDeliveryLocation: defaultEmptyTruckingLocation(),
  destinationTruckingRequired: "",
  destinationTruckingPickupLocation: defaultEmptyTruckingLocation(),
  destinationTruckingDeliveryLocation: defaultEmptyTruckingLocation(),
  commercialInvoiceValue: "",
  customsClearanceRequirement: "",
  expectedDispatchDate: "",
  channelMessageText: "",
  attachments: [],
};

const getToken = () =>
  sessionStorage.getItem("authToken") ||
  localStorage.getItem("authToken") ||
  sessionStorage.getItem("token") ||
  localStorage.getItem("token");

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? "N/A" : dt.toLocaleString();
};

/** Date only (no time) — for quote date in View */
const formatDateOnly = (value) => {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const STATUS_LABELS = {
  new: "New",
  in_review: "In Review",
  pricing_in_progress: "Pricing In Progress",
  quoted: "Quoted",
  won: "Won",
  lost: "Lost",
  closed_no_response: "Closed No Response",
};

/** Populated `exporterCompany` from list/detail or raw id */
function formatExporterCompany(exporter) {
  if (exporter == null || exporter === "") return "N/A";
  if (typeof exporter === "object") {
    return exporter.companyName || exporter.customerId || exporter.personName || exporter._id || "N/A";
  }
  return String(exporter);
}

function agentCompanyLabel(row) {
  if (!row || typeof row !== "object") return "—";
  return row.companyName || row.customerId || "—";
}

const formatStatusLabel = (value) => {
  if (!value) return "N/A";
  return STATUS_LABELS[value] || value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const getAttachmentUrl = (attachment) => {
  if (!attachment) return "";
  const raw =
    attachment.url ||
    attachment.fileUrl ||
    attachment.path ||
    attachment.filePath ||
    attachment.location ||
    attachment.secure_url ||
    "";
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${API_CONFIG.BASE_URL}/${String(raw).replace(/^\/+/, "")}`;
};

const isImageAttachment = (attachment) => {
  const url = getAttachmentUrl(attachment);
  const fileName = attachment?.fileName || attachment?.originalName || "";
  const text = `${url} ${fileName}`.toLowerCase();
  return [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"].some((ext) => text.includes(ext));
};

function formatOwnerRef(owner) {
  if (!owner || typeof owner !== "object") return null;
  const name = owner.employeeName || "";
  const id = owner.empId || "";
  if (name && id) return `${name} (${id})`;
  return name || id || owner._id || null;
}

function formatYesNoValue(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s === "yes" || s === "true") return "Yes";
  if (s === "no" || s === "false") return "No";
  return raw;
}

function getExtraDetailsGetUrl(kind, identifier) {
  const safe = encodeURIComponent(identifier);
  if (kind === "agent") {
    return `${API_CONFIG.BASE_URL}/api/v1/agent-customer/rate-requests/${safe}`;
  }
  return `${API_CONFIG.BASE_URL}/api/v1/exporter-rate-requst/${safe}`;
}

function getExtraDetailsPatchUrl(kind, identifier) {
  const safe = encodeURIComponent(identifier);
  if (kind === "agent") {
    return `${API_CONFIG.BASE_URL}/api/v1/agent-customer/rate-requests/${safe}`;
  }
  return `${API_CONFIG.BASE_URL}/api/v1/exporter-rate-requst/${safe}/extra-details`;
}

/** Shared read-only body for exporter + agent rate request detail modals */
function RateRequestDetailBody({ detail }) {
  if (!detail) return null;
  const isAgentStyle = Boolean(detail.submissionChannel || detail.capturedByRef || detail.receivedAt);
  const exporterRef =
    detail.exporterCompany && typeof detail.exporterCompany === "object" ? detail.exporterCompany : null;
  const hasOriginTruckingBlock =
    detail.originTruckingRequired != null ||
    detail.originTruckingPickupLocation != null ||
    detail.originTruckingDeliveryLocation != null;
  const hasDestinationTruckingBlock =
    detail.destinationTruckingRequired != null ||
    detail.destinationTruckingPickupLocation != null ||
    detail.destinationTruckingDeliveryLocation != null;
  const hasModernTruckingBlocks = hasOriginTruckingBlock || hasDestinationTruckingBlock;
  const hasLegacyTruckingBlock =
    !hasModernTruckingBlocks &&
    (detail.truckingRequired != null ||
      detail.truckingPickupLocation != null ||
      detail.truckingDeliveryLocation != null);
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Request ID</p>
          <p className="mt-1 font-mono text-lg font-bold text-slate-900 break-all">
            {detail.requestId || detail._id || "N/A"}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/80 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Expected dispatch</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {formatDateOnly(detail.expectedDispatchDate) ?? "N/A"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {detail.department && (
          <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-indigo-800">
            Dept: <strong className="ml-1">{detail.department}</strong>
          </span>
        )}
        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-slate-700">
          Source: <strong className="ml-1">{formatStatusLabel(detail.source)}</strong>
        </span>
        {detail.status && (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-amber-900">
            Status: <strong className="ml-1">{formatStatusLabel(detail.status)}</strong>
          </span>
        )}
        {detail.submissionChannel && (
          <span className="inline-flex items-center rounded-full bg-cyan-100 px-3 py-1 text-cyan-900">
            Channel: <strong className="ml-1">{formatStatusLabel(detail.submissionChannel)}</strong>
          </span>
        )}
        {detail.shipmentType && (
          <span className="inline-flex items-center rounded-full bg-teal-100 px-3 py-1 text-teal-900">
            Shipment: <strong className="ml-1">{detail.shipmentType}</strong>
          </span>
        )}
        {detail.serviceType && (
          <span className="inline-flex items-center rounded-full bg-violet-100 px-3 py-1 text-violet-900">
            Service: <strong className="ml-1">{detail.serviceType}</strong>
          </span>
        )}
      </div>

      {isAgentStyle && (detail.ownerId || detail.capturedBy || detail.receivedAt || detail.capturedByRef) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="mb-4 text-sm font-semibold text-slate-900">Assignment & intake</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DetailField label="Owner" value={formatOwnerRef(detail.ownerId)} />
            <DetailField label="Captured by (ref)" value={detail.capturedByRef || "N/A"} />
            <DetailField label="Captured by" value={formatExporterCompany(detail.capturedBy)} />
            <DetailField label="Received at" value={formatDateTime(detail.receivedAt)} />
            <DetailField label="Quote due" value={formatDateTime(detail.quoteDueAt)} />
            <DetailField label="Created at" value={formatDateTime(detail.createdAt)} />
            <DetailField label="Updated at" value={formatDateTime(detail.updatedAt)} />
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-5">
        <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-blue-900">
          <FileText size={18} className="text-blue-600" />
          Exporter details
        </h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DetailField label="Exporter company" value={formatExporterCompany(detail.exporterCompany)} />
          <DetailField label="Customer ID" value={exporterRef?.customerId} />
          <DetailField label="Exporter person" value={exporterRef?.personName} />
          <DetailField label="Contact person" value={detail.contactPerson} />
          <DetailField label="Contact email" value={detail.contactEmail} />
          <DetailField label="Contact phone" value={detail.contactPhone} />
          <DetailField label="Exporter email" value={exporterRef?.email} />
          <DetailField label="Exporter phone" value={exporterRef?.contactNumber} />
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-5">
        <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-emerald-900">
          <Ship size={18} className="text-emerald-600" />
          Shipment details
        </h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DetailField label="Origin country" value={detail.originCountry} />
          <DetailField label="Destination country" value={detail.destinationCountry} />
          <DetailField label="Origin port" value={detail.originPort} />
          <DetailField label="Destination port" value={detail.destinationPort} />
          <DetailField label="Cargo type" value={detail.cargoType} />
          <DetailField label="Container type" value={detail.containerType} />
          <DetailField label="Shipment type" value={detail.shipmentType} />
          <DetailField label="Service type" value={detail.serviceType} />
          <DetailField label="Incoterm" value={detail.incoterm} />
          <DetailField
            label="Origin trucking"
            value={formatYesNoValue(detail.originTruckingRequired)}
          />
          <DetailField
            label="Destination trucking"
            value={formatYesNoValue(detail.destinationTruckingRequired)}
          />
          <DetailField label="Commercial invoice value" value={detail.commercialInvoiceValue} />
          <DetailField
            label="Customs clearance"
            value={formatExtraDetailDisplay("customsClearanceRequirement", detail)}
          />
          <DetailField label="Weight / volume" value={detail.weightOrVolume} />
          {detail.commodity ? <DetailField label="Commodity" value={detail.commodity} /> : null}
        </div>
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/80 p-5">
        <h4 className="mb-4 text-sm font-semibold text-indigo-900">Container type</h4>
        <ContainerTypeDisplay value={detail.containerType} />
      </div>

      {hasModernTruckingBlocks && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-5">
          <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-amber-900">
            <Truck size={18} className="text-amber-700" />
            Trucking details
          </h4>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {hasOriginTruckingBlock && (
              <ReadonlyTruckingSectionCard
                title="Origin trucking"
                requiredValue={detail.originTruckingRequired}
                pickupLocation={detail.originTruckingPickupLocation}
                deliveryLocation={detail.originTruckingDeliveryLocation}
              />
            )}
            {hasDestinationTruckingBlock && (
              <ReadonlyTruckingSectionCard
                title="Destination trucking"
                requiredValue={detail.destinationTruckingRequired}
                pickupLocation={detail.destinationTruckingPickupLocation}
                deliveryLocation={detail.destinationTruckingDeliveryLocation}
              />
            )}
          </div>
        </div>
      )}

      {hasLegacyTruckingBlock && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-5">
          <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-amber-900">
            <Truck size={18} className="text-amber-700" />
            Trucking details
          </h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DetailField label="Trucking required" value={formatYesNoValue(detail.truckingRequired) || "N/A"} />
            <DetailField
              label="Pickup location"
              value={formatLocationForView(detail.truckingPickupLocation) || "-"}
              multiline
            />
            <DetailField
              label="Delivery location"
              value={formatLocationForView(detail.truckingDeliveryLocation) || "-"}
              multiline
            />
          </div>
        </div>
      )}

      {hasExtraDetails(detail) && (
        <div className="rounded-2xl border border-violet-100 bg-violet-50/80 p-5">
          <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-violet-900">
            <ClipboardList size={18} className="text-violet-600" />
            Customs & shipment extras
          </h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {EXTRA_DETAILS_DISPLAY_KEYS.map((key) => {
              const text = formatExtraDetailDisplay(key, detail);
              if (!text) return null;
              return (
                <DetailField
                  key={key}
                  label={EXTRA_DETAILS_LABELS[key]}
                  value={text}
                  multiline={key === "deliveryTimeAppointment"}
                />
              );
            })}
          </div>
        </div>
      )}

      {detail.channelMessageText && String(detail.channelMessageText).trim() !== "" && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-5 shadow-sm">
          <h4 className="mb-2 text-sm font-semibold text-sky-900">Channel / notes</h4>
          <p className="text-sm text-slate-800 whitespace-pre-wrap">{detail.channelMessageText}</p>
        </div>
      )}

      {Array.isArray(detail.internalNotes) && detail.internalNotes.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FileText size={18} className="text-slate-600" />
            Internal notes
          </h4>
          <ul className="space-y-3 max-h-56 overflow-y-auto text-sm text-slate-700">
            {detail.internalNotes.map((entry, idx) => {
              const text =
                entry && typeof entry === "object" ? entry.note ?? entry.text ?? "" : String(entry ?? "");
              const when =
                entry && typeof entry === "object" && entry.createdAt ? formatDateTime(entry.createdAt) : null;
              return (
                <li key={idx} className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
                  {when && <p className="text-xs text-slate-500 mb-1">{when}</p>}
                  <p className="whitespace-pre-wrap">{text || "—"}</p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-900">
          <Paperclip size={18} className="text-amber-700" />
          Attachments
        </h4>
        <AttachmentSection attachments={detail.attachments} flat />
      </div>
    </>
  );
}

export default function ExporterRateRequestWorkflow() {
  const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [meta, setMeta] = useState({ statuses: STATUS_OPTIONS, sources: ["whatsapp", "email", "manual"] });
  const [agents, setAgents] = useState([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showExtraDetailsModal, setShowExtraDetailsModal] = useState(false);
  const [extraDetailsMode, setExtraDetailsMode] = useState("rate");
  const [extraDetailsRequestId, setExtraDetailsRequestId] = useState("");
  const [extraDetailsForm, setExtraDetailsForm] = useState(() => cloneDefaultExtraDetailsForm());
  const [extraDetailsLoading, setExtraDetailsLoading] = useState(false);
  const [extraDetailsSubmitting, setExtraDetailsSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [shipmentCountryOptions, setShipmentCountryOptions] = useState(() =>
    shipmentCountriesToSelectOptions(FALLBACK_COUNTRIES),
  );
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [originPortOptions, setOriginPortOptions] = useState([]);
  const [destinationPortOptions, setDestinationPortOptions] = useState([]);
  const [originPortsLoading, setOriginPortsLoading] = useState(false);
  const [destinationPortsLoading, setDestinationPortsLoading] = useState(false);
  const [attachmentPreviews, setAttachmentPreviews] = useState([]);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: "",
    source: "",
  });
  /** `rate` = exporter rate requests (current API); `agent` = sales-day-agent inbox */
  const [mainTab, setMainTab] = useState("rate");
  const [agentRequests, setAgentRequests] = useState([]);
  const [agentLoadingList, setAgentLoadingList] = useState(false);
  const [requestUnreadMap, setRequestUnreadMap] = useState({});
  const [agentSummary, setAgentSummary] = useState({
    ownedAgentCustomerCount: 0,
    totalRateRequests: 0,
  });
  const [agentPagination, setAgentPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
  });
  const [agentFilters, setAgentFilters] = useState({
    page: 1,
    limit: 20,
    search: "",
  });
  const [showAgentDetailModal, setShowAgentDetailModal] = useState(false);
  const [selectedAgentDetail, setSelectedAgentDetail] = useState(null);

  const authHeaders = useMemo(() => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const canCreateRateRequest = useMemo(() => {
    const user = getUserFromStorage();
    return isSalesDepartment(user) && isEmployeeActiveForHandoff(user) && isSalesDayShiftTiming(user);
  }, []);

  const shipmentCountryByCode = useMemo(() => {
    const map = {};
    for (const opt of shipmentCountryOptions) {
      map[opt.value] = opt.label;
    }
    return map;
  }, [shipmentCountryOptions]);

  const shipmentCountryMetaByCode = useMemo(() => {
    const map = {};
    for (const opt of shipmentCountryOptions) {
      if (!opt?.value) continue;
      map[opt.value] = {
        countryId: opt.countryId,
        name: opt.displayLabel || opt.label,
      };
    }
    return map;
  }, [shipmentCountryOptions]);

  const originCountryName =
    shipmentCountryByCode[createForm.originCountry] || createForm.originCountry;
  const destinationCountryName =
    shipmentCountryByCode[createForm.destinationCountry] || createForm.destinationCountry;

  useEffect(() => {
    if (!showCreate) return undefined;
    const controller = new AbortController();
    setCountriesLoading(true);
    listShipmentCountries(getToken(), { fetchAllPages: true, signal: controller.signal })
      .then(({ items }) => {
        setShipmentCountryOptions(shipmentCountriesToSelectOptions(items));
      })
      .catch(() => {
        setShipmentCountryOptions(shipmentCountriesToSelectOptions(FALLBACK_COUNTRIES));
      })
      .finally(() => {
        if (!controller.signal.aborted) setCountriesLoading(false);
      });
    return () => controller.abort();
  }, [showCreate]);

  useEffect(() => {
    if (!showCreate || !createForm.originCountry) {
      setOriginPortOptions([]);
      return undefined;
    }
    const controller = new AbortController();
    setOriginPortsLoading(true);
    const originMeta = shipmentCountryMetaByCode[createForm.originCountry];
    listShipmentPorts(getToken(), {
      countryCode: createForm.originCountry,
      countryId: originMeta?.countryId,
      countryName: originMeta?.name || shipmentCountryByCode[createForm.originCountry],
      limit: 500,
      signal: controller.signal,
    })
      .then(({ items }) => {
        setOriginPortOptions(shipmentPortsToSelectOptions(items));
      })
      .catch(() => {
        setOriginPortOptions([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setOriginPortsLoading(false);
      });
    return () => controller.abort();
  }, [showCreate, createForm.originCountry, shipmentCountryByCode, shipmentCountryMetaByCode]);

  useEffect(() => {
    if (!showCreate || !createForm.destinationCountry) {
      setDestinationPortOptions([]);
      return undefined;
    }
    const controller = new AbortController();
    setDestinationPortsLoading(true);
    const destinationMeta = shipmentCountryMetaByCode[createForm.destinationCountry];
    listShipmentPorts(getToken(), {
      countryCode: createForm.destinationCountry,
      countryId: destinationMeta?.countryId,
      countryName: destinationMeta?.name || shipmentCountryByCode[createForm.destinationCountry],
      limit: 500,
      signal: controller.signal,
    })
      .then(({ items }) => {
        setDestinationPortOptions(shipmentPortsToSelectOptions(items));
      })
      .catch(() => {
        setDestinationPortOptions([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setDestinationPortsLoading(false);
      });
    return () => controller.abort();
  }, [showCreate, createForm.destinationCountry, shipmentCountryByCode, shipmentCountryMetaByCode]);

  const fetchMeta = async () => {
    try {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/exporter-rate-requst/meta`, {
        headers: authHeaders,
      });
      if (res.data?.data) {
        setMeta({
          statuses: res.data.data.statuses || STATUS_OPTIONS,
          sources: res.data.data.sources || ["whatsapp", "email", "manual"],
        });
      }
    } catch {
      // Keep local fallback options.
    }
  };

  const loadAgents = async () => {
    setAgentsLoading(true);
    try {
      const data = await fetchSalesDayList({ page: 1, limit: 100 });
      const list = data?.customers || data?.rows || data?.data || [];
      setAgents(Array.isArray(list) ? list : []);
    } catch {
      setAgents([]);
      alertify.error("Could not load your agent customers for exporter selection");
    } finally {
      setAgentsLoading(false);
    }
  };

  const fetchList = async () => {
    setLoadingList(true);
    try {
      const params = {
        page: filters.page,
        limit: filters.limit,
      };
      if (filters.search.trim()) params.search = filters.search.trim();
      if (filters.source) params.source = filters.source;

      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/exporter-rate-requst`, {
        headers: authHeaders,
        params,
      });

      const raw = res.data?.data;
      const list = Array.isArray(raw?.requests)
        ? raw.requests
        : Array.isArray(raw)
          ? raw
          : Array.isArray(res.data?.requests)
            ? res.data.requests
            : [];
      setRequests(Array.isArray(list) ? list : []);
    } catch (error) {
      alertify.error(error.response?.data?.message || "Failed to fetch rate requests");
      setRequests([]);
    } finally {
      setLoadingList(false);
    }
  };

  const fetchDetail = async (id) => {
    if (!id) return;
    setLoadingDetail(true);
    try {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/exporter-rate-requst/${id}`, {
        headers: authHeaders,
      });
      setSelectedDetail(res.data?.data || null);
    } catch (error) {
      alertify.error(error.response?.data?.message || "Failed to fetch request detail");
      setSelectedDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchMeta();
  }, []);

  const loadAgentRequests = async (override = null) => {
    const page = override?.page ?? agentFilters.page;
    const limit = override?.limit ?? agentFilters.limit;
    const search = override?.search !== undefined ? override.search : agentFilters.search;
    setAgentLoadingList(true);
    try {
      const params = { page, limit };
      if (String(search).trim()) params.search = String(search).trim();
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/sales-day-agent/rate-requests`, {
        headers: authHeaders,
        params,
      });
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setAgentRequests(list);
      if (res.data?.summary) {
        setAgentSummary({
          ownedAgentCustomerCount: res.data.summary.ownedAgentCustomerCount ?? 0,
          totalRateRequests: res.data.summary.totalRateRequests ?? list.length,
        });
      }
      if (res.data?.pagination) {
        setAgentPagination({
          currentPage: res.data.pagination.currentPage ?? page,
          totalPages: res.data.pagination.totalPages ?? 1,
          totalItems: res.data.pagination.totalItems ?? list.length,
          itemsPerPage: res.data.pagination.itemsPerPage ?? limit,
        });
      } else {
        setAgentPagination({
          currentPage: page,
          totalPages: 1,
          totalItems: list.length,
          itemsPerPage: limit,
        });
      }
    } catch (error) {
      alertify.error(error.response?.data?.message || "Failed to fetch agent rate requests");
      setAgentRequests([]);
    } finally {
      setAgentLoadingList(false);
    }
  };

  useEffect(() => {
    if (mainTab !== "agent") return;
    void loadAgentRequests();
  }, [mainTab, agentFilters.page, agentFilters.limit]);

  useEffect(() => {
    if (mainTab !== "rate") return;
    void fetchList();
  }, [mainTab, filters.page, filters.limit, filters.source]);

  useEffect(() => {
    if (showCreate) loadAgents();
  }, [showCreate]);

  useEffect(() => {
    if (selectedId) fetchDetail(selectedId);
  }, [selectedId]);

  useEffect(() => {
    const syncRequestUnreadMap = (entries) => {
      setRequestUnreadMap(buildExporterQuoteRequestUnreadMap(entries));
    };

    syncRequestUnreadMap(readExporterQuoteBellEntries());

    const handleSummaryUpdate = (event) => {
      syncRequestUnreadMap(Array.isArray(event?.detail) ? event.detail : []);
    };

    const handleThreadRead = () => {
      syncRequestUnreadMap(readExporterQuoteBellEntries());
    };

    window.addEventListener(EXPORTER_QUOTE_SUMMARY_EVENT, handleSummaryUpdate);
    window.addEventListener(EXPORTER_QUOTE_THREAD_READ_EVENT, handleThreadRead);

    return () => {
      window.removeEventListener(EXPORTER_QUOTE_SUMMARY_EVENT, handleSummaryUpdate);
      window.removeEventListener(EXPORTER_QUOTE_THREAD_READ_EVENT, handleThreadRead);
    };
  }, []);

  useEffect(() => {
    const nextPreviews = (createForm.attachments || []).map((file) => ({
      name: file.name,
      type: file.type,
      url: file.type?.startsWith("image/") ? URL.createObjectURL(file) : "",
    }));
    setAttachmentPreviews(nextPreviews);

    return () => {
      nextPreviews.forEach((item) => {
        if (item.url) URL.revokeObjectURL(item.url);
      });
    };
  }, [createForm.attachments]);

  const applySearch = () => {
    if (mainTab === "rate") {
      setFilters((prev) => ({ ...prev, page: 1, search: prev.search }));
      fetchList();
    } else {
      const q = agentFilters.search.trim();
      setAgentFilters((prev) => ({ ...prev, page: 1 }));
      void loadAgentRequests({ page: 1, limit: agentFilters.limit, search: q });
    }
  };

  const onCreate = async (e) => {
    e.preventDefault();
    if (!canCreateRateRequest) {
      alertify.error("Only active day-shift Sales users can create rate requests");
      return;
    }
    if (!createForm.exporterCompany?.trim()) {
      alertify.error("Select an exporter (agent customer)");
      return;
    }
    if (!createForm.contactEmail?.trim() && !createForm.contactPhone?.trim()) {
      alertify.error("Provide at least one of contact email or contact phone");
      return;
    }
    if (!createForm.originCountry?.trim()) {
      alertify.error("Select origin country");
      return;
    }
    if (!createForm.destinationCountry?.trim()) {
      alertify.error("Select destination country");
      return;
    }
    if (!createForm.originPort?.trim()) {
      alertify.error("Select origin port / city / ICD");
      return;
    }
    if (!createForm.destinationPort?.trim()) {
      alertify.error("Select destination port / city / ICD");
      return;
    }
    if (!createForm.cargoType) {
      alertify.error("Select cargo type");
      return;
    }
    if (!createForm.containerType) {
      alertify.error("Please select a container type");
      return;
    }
    if (!createForm.shipmentType) {
      alertify.error("Select shipment type (FCL or LCL)");
      return;
    }
    if (!createForm.serviceType) {
      alertify.error("Select service type");
      return;
    }
    if (!createForm.incoterm) {
      alertify.error("Select incoterm");
      return;
    }
    const originTruckingError = validateTruckingSection(
      createForm.originTruckingRequired,
      createForm.originTruckingPickupLocation,
      createForm.originTruckingDeliveryLocation,
      "Origin trucking",
    );
    if (originTruckingError) {
      alertify.error(originTruckingError);
      return;
    }
    const destinationTruckingError = validateTruckingSection(
      createForm.destinationTruckingRequired,
      createForm.destinationTruckingPickupLocation,
      createForm.destinationTruckingDeliveryLocation,
      "Destination trucking",
    );
    if (destinationTruckingError) {
      alertify.error(destinationTruckingError);
      return;
    }
    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append("source", createForm.source);
      payload.append("exporterCompany", createForm.exporterCompany.trim());
      payload.append("contactPerson", createForm.contactPerson);
      payload.append("originCountry", originCountryName);
      payload.append("originCountryCode", createForm.originCountry.trim());
      payload.append("destinationCountry", destinationCountryName);
      payload.append("destinationCountryCode", createForm.destinationCountry.trim());
      payload.append("originPort", createForm.originPort.trim());
      payload.append("destinationPort", createForm.destinationPort.trim());
      payload.append("cargoType", createForm.cargoType);
      payload.append("containerType", createForm.containerType);
      payload.append("shipmentType", createForm.shipmentType);
      payload.append("serviceType", createForm.serviceType);
      payload.append("incoterm", createForm.incoterm);
      if (createForm.originTruckingRequired)
        payload.append("originTruckingRequired", createForm.originTruckingRequired);
      if (isTruckingYes(createForm.originTruckingRequired)) {
        appendTruckingLocationFormData(
          payload,
          "originTruckingPickupLocation",
          createForm.originTruckingPickupLocation,
        );
        appendTruckingLocationFormData(
          payload,
          "originTruckingDeliveryLocation",
          createForm.originTruckingDeliveryLocation,
        );
      }
      if (createForm.destinationTruckingRequired)
        payload.append("destinationTruckingRequired", createForm.destinationTruckingRequired);
      if (isTruckingYes(createForm.destinationTruckingRequired)) {
        appendTruckingLocationFormData(
          payload,
          "destinationTruckingPickupLocation",
          createForm.destinationTruckingPickupLocation,
        );
        appendTruckingLocationFormData(
          payload,
          "destinationTruckingDeliveryLocation",
          createForm.destinationTruckingDeliveryLocation,
        );
      }
      if (createForm.commercialInvoiceValue?.trim())
        payload.append("commercialInvoiceValue", createForm.commercialInvoiceValue.trim());
      if (createForm.customsClearanceRequirement)
        payload.append("customsClearanceRequirement", createForm.customsClearanceRequirement);
      if (createForm.expectedDispatchDate) payload.append("expectedDispatchDate", createForm.expectedDispatchDate);
      if (createForm.contactEmail?.trim()) payload.append("contactEmail", createForm.contactEmail.trim());
      if (createForm.contactPhone?.trim()) payload.append("contactPhone", createForm.contactPhone.trim());
      if (createForm.channelMessageText?.trim())
        payload.append("channelMessageText", createForm.channelMessageText.trim());
      (createForm.attachments || []).forEach((file) => payload.append("attachments", file));

      const res = await axios.post(`${API_CONFIG.BASE_URL}/api/v1/exporter-rate-requst`, payload, {
        headers: { ...authHeaders, "Content-Type": "multipart/form-data" },
      });
      const newId = res.data?.data?._id;
      alertify.success("Rate request created");
      setShowCreate(false);
      setCreateForm(defaultCreateForm);
      await fetchList();
      if (newId) setSelectedId(newId);
    } catch (error) {
      alertify.error(error.response?.data?.message || "Failed to create request");
    } finally {
      setSubmitting(false);
    }
  };

  const agentOptions = useMemo(
    () => agents.map((a) => ({ value: a._id, label: agentCompanyLabel(a) })),
    [agents],
  );

  const totalCount = requests.length;

  const todayRequestCount = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return requests.filter((r) => {
      const raw = r.createdAt ?? r.created_at ?? r.quoteDueAt;
      if (raw == null) return false;
      const s = typeof raw === "string" ? raw.slice(0, 10) : "";
      return s === today;
    }).length;
  }, [requests]);

  const canGoNextPage = requests.length >= filters.limit;
  const canGoNextAgentPage = agentFilters.page < (agentPagination.totalPages || 1);

  const handleViewRequest = async (id) => {
    setSelectedId(id);
    await fetchDetail(id);
    setShowDetailModal(true);
  };

  const openExtraDetailsModal = async (requestId, mode = "rate") => {
    setExtraDetailsMode(mode);
    setExtraDetailsRequestId(requestId);
    setShowExtraDetailsModal(true);
    setExtraDetailsLoading(true);
    setExtraDetailsForm(cloneDefaultExtraDetailsForm());
    try {
      const res = await axios.get(getExtraDetailsGetUrl(mode, requestId), {
        headers: authHeaders,
      });
      const d = resolveExtraDetailsDetail(res);
      if (d) setExtraDetailsForm(detailToExtraForm(d));
    } catch (e) {
      alertify.error(e.response?.data?.message || "Could not load request for customs details");
    } finally {
      setExtraDetailsLoading(false);
    }
  };

  const submitExtraDetails = async (e) => {
    e.preventDefault();

    const payload = buildExtraDetailsPayload(extraDetailsForm);
    if (Object.keys(payload).length === 0) {
      alertify.error("Enter at least one field to save.");
      return;
    }
    setExtraDetailsSubmitting(true);
    try {
      await axios.patch(
        getExtraDetailsPatchUrl(extraDetailsMode, extraDetailsRequestId),
        payload,
        { headers: { ...authHeaders, "Content-Type": "application/json" } },
      );
      try {
        const refresh = await axios.get(getExtraDetailsGetUrl(extraDetailsMode, extraDetailsRequestId), {
          headers: authHeaders,
        });
        const d = resolveExtraDetailsDetail(refresh);
        if (d) setExtraDetailsForm(detailToExtraForm(d));
      } catch {
        // Save succeeded; refresh is best-effort.
      }
      alertify.success(extraDetailsMode === "agent" ? "Rate request updated successfully." : "Customs details saved");
      setShowExtraDetailsModal(false);
      if (extraDetailsMode === "agent") {
        await loadAgentRequests();
      } else {
        await fetchList();
      }
    } catch (err) {
      alertify.error(err.response?.data?.message || "Failed to save customs details");
    } finally {
      setExtraDetailsSubmitting(false);
    }
  };

  const handleRatePageChange = (nextPage) => {
    if (nextPage < 1) return;
    if (nextPage > filters.page && !canGoNextPage) return;
    setFilters((p) => ({ ...p, page: nextPage }));
  };

  const handleAgentPageChange = (nextPage) => {
    if (nextPage < 1) return;
    if (nextPage > agentFilters.page && !canGoNextAgentPage) return;
    setAgentFilters((p) => ({ ...p, page: nextPage }));
  };

  const openAgentDetail = (row) => {
    setSelectedAgentDetail(row);
    setShowAgentDetailModal(true);
  };

  const handleAgentDocumentProgress = useCallback((progress) => {
    setSelectedAgentDetail((prev) => {
      if (!prev) return prev;
      const id = prev.requestId || prev._id;
      setAgentRequests((rows) =>
        rows.map((row) =>
          (row.requestId || row._id) === id ? { ...row, documentProgress: progress } : row,
        ),
      );
      return { ...prev, documentProgress: progress };
    });
  }, []);

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="flex flex-col gap-6 mb-6 border border-gray-200 rounded-xl p-6 bg-white">
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center relative">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-gray-700 font-bold text-2xl">
                {mainTab === "agent"
                  ? agentPagination.totalItems ?? agentRequests.length
                  : totalCount}
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold pointer-events-none text-center px-2">
                {mainTab === "agent" ? "Agent requests (total)" : "Total requests"}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center relative">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-gray-700 font-bold text-2xl">
                {mainTab === "agent" ? agentSummary.ownedAgentCustomerCount ?? "—" : todayRequestCount}
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold pointer-events-none text-center px-2">
                {mainTab === "agent" ? "Owned customers" : "Today"}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1 w-full xl:w-[350px]">
            <button
              type="button"
              title={
                canCreateRateRequest ? "" : "Only active Sales users on day shift can create rate requests"
              }
              disabled={!canCreateRateRequest}
              onClick={() => {
                if (!canCreateRateRequest) {
                  alertify.error("Only active day-shift Sales users can create rate requests");
                  return;
                }
                setShowCreate(true);
              }}
              className={`flex items-center justify-between gap-4 px-6 h-[40px] rounded-lg text-white font-semibold transition w-full ${
                canCreateRateRequest ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              <span>Create Rate Request</span>
              <PlusCircle size={20} />
            </button>
            {mainTab === "rate" && (
              <div className="relative w-full h-[45px]">
                <SearchableSelect
                  value={filters.source}
                  onChange={(value) => setFilters((p) => ({ ...p, page: 1, source: value }))}
                  options={meta.sources.map((s) => ({ value: s, label: formatStatusLabel(s) }))}
                  placeholder="All sources"
                  className="h-full [&>button]:h-full [&>button]:rounded-lg [&>button]:border-gray-200"
                  compact
                />
              </div>
            )}
          </div>
        </div>

        <div className="relative w-full">
          <input
            type="text"
            placeholder={
              mainTab === "agent"
                ? "Search agent requests (press Enter)"
                : "Search request ID / exporter / route (press Enter)"
            }
            value={mainTab === "agent" ? agentFilters.search : filters.search}
            onChange={(e) =>
              mainTab === "agent"
                ? setAgentFilters((p) => ({ ...p, search: e.target.value }))
                : setFilters((p) => ({ ...p, search: e.target.value }))
            }
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            className="w-full pl-6 pr-12 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-colors text-gray-600 placeholder-gray-400"
          />
          <Search className="absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-400" size={24} />
        </div>
      </div>

      <div className="relative z-20 flex gap-2 mb-4 p-1 bg-gray-100 rounded-xl border border-gray-200 w-full sm:w-auto sm:inline-flex">
        <button
          type="button"
          onClick={() => setMainTab("rate")}
          className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            mainTab === "rate"
              ? "bg-white text-gray-900 shadow-sm border border-gray-200"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Rate Request
        </button>
        <button
          type="button"
          onClick={() => {
            setMainTab("agent");
          }}
          className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            mainTab === "agent"
              ? "bg-white text-gray-900 shadow-sm border border-gray-200"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Agent Rate Request
        </button>
      </div>

      {mainTab === "rate" && loadingList && (
        <div className="flex justify-center items-center h-64 bg-white rounded-2xl border border-gray-200">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading rate requests...</p>
          </div>
        </div>
      )}

      {mainTab === "rate" && !loadingList && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Request ID</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Exporter</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Route</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Quote Due</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((item) => {
                  const requestUnreadCount = getExporterQuoteRequestUnreadCount(requestUnreadMap, item);
                  return (
                  <tr key={item._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600 font-medium">{item.requestId || item._id}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-medium text-gray-800 block">
                        {formatExporterCompany(item.exporterCompany)}
                      </span>
                      <span className="text-xs text-gray-500">{item.contactPerson || "N/A"}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-medium text-gray-800">
                        {item.originPort || "-"} to {item.destinationPort || "-"}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-medium text-gray-800">{formatDateTime(item.quoteDueAt)}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => handleViewRequest(item._id)}
                          className="px-4 py-1 rounded border border-green-500 text-green-500 text-sm font-medium hover:bg-green-50 transition-colors min-w-[70px] inline-flex items-center justify-center gap-1"
                          title={requestUnreadCount > 0 ? `${requestUnreadCount} unread message${requestUnreadCount === 1 ? "" : "s"} in this request` : "View"}
                        >
                          <Eye size={14} /> View
                          <BlinkingUnreadDot count={requestUnreadCount} className="ml-1" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openExtraDetailsModal(item._id, "rate")}
                          className="px-4 py-1 rounded border border-purple-500 text-purple-500 text-sm font-medium hover:bg-purple-50 transition-colors min-w-[70px] inline-flex items-center justify-center gap-1"
                        >
                          <ClipboardList size={14} /> Customs
                        </button>
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
          {requests.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {filters.search.trim() ? "No requests found matching your search" : "No rate requests found"}
              </p>
              <p className="text-gray-400 text-sm">
                {filters.search.trim()
                  ? "Try adjusting your search terms"
                  : "Create a new rate request or change filters"}
              </p>
            </div>
          )}
        </div>
      )}

      {mainTab === "rate" && !loadingList && requests.length > 0 && (filters.page > 1 || canGoNextPage) && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl border border-gray-200 p-4">
          <div className="text-sm text-gray-600">
            Page {filters.page}
            {filters.search.trim() ? ` · search: "${filters.search.trim()}"` : ""}
          </div>
          <div className="flex gap-1 items-center">
            <button
              type="button"
              onClick={() => handleRatePageChange(filters.page - 1)}
              disabled={filters.page <= 1}
              className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <ChevronLeft size={18} />
              <span>Previous</span>
            </button>
            <button
              type="button"
              onClick={() => handleRatePageChange(filters.page + 1)}
              disabled={!canGoNextPage}
              className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <span>Next</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {mainTab === "agent" && agentLoadingList && (
        <div className="flex justify-center items-center h-64 bg-white rounded-2xl border border-gray-200">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading agent rate requests...</p>
          </div>
        </div>
      )}

      {mainTab === "agent" && !agentLoadingList && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Request ID</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Exporter</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Route</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Status</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Quote Due</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Documents</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Action</th>
                </tr>
              </thead>
              <tbody>
                {agentRequests.map((item) => {
                  const requestUnreadCount = getExporterQuoteRequestUnreadCount(requestUnreadMap, item);
                  const documentProgressLabel = formatDocumentProgressLabel(item.documentProgress);
                  return (
                    <tr key={item._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-600 font-medium">{item.requestId || item._id}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-medium text-gray-800 block">
                          {formatExporterCompany(item.exporterCompany)}
                        </span>
                        <span className="text-xs text-gray-500">{item.contactPerson || "N/A"}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-medium text-gray-800">
                          {item.originPort || "-"} to {item.destinationPort || "-"}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-medium text-gray-800">{formatStatusLabel(item.status)}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-medium text-gray-800">{formatDateTime(item.quoteDueAt)}</span>
                      </td>
                      <td className="py-4 px-4">
                        {documentProgressLabel ? (
                          <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-800">
                            {documentProgressLabel}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => openAgentDetail(item)}
                            className="px-4 py-1 rounded border border-green-500 text-green-500 text-sm font-medium hover:bg-green-50 transition-colors min-w-[70px] inline-flex items-center justify-center gap-1"
                            title={requestUnreadCount > 0 ? `${requestUnreadCount} unread message${requestUnreadCount === 1 ? "" : "s"} in this request` : "View"}
                          >
                            <Eye size={14} /> View
                            <BlinkingUnreadDot count={requestUnreadCount} className="ml-1" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openExtraDetailsModal(item.requestId || item._id, "agent")}
                            className="px-4 py-1 rounded border border-purple-500 text-purple-500 text-sm font-medium hover:bg-purple-50 transition-colors min-w-[70px] inline-flex items-center justify-center gap-1"
                          >
                            <ClipboardList size={14} /> Customs
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {agentRequests.length === 0 && (
            <div className="text-center py-12">
              <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {agentFilters.search.trim()
                  ? "No agent requests match your search"
                  : "No agent rate requests yet"}
              </p>
              <p className="text-gray-400 text-sm">
                Submissions from the agent portal appear here for your owned customers.
              </p>
            </div>
          )}
        </div>
      )}

      {mainTab === "agent" && !agentLoadingList && agentRequests.length > 0 && (agentFilters.page > 1 || canGoNextAgentPage) && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl border border-gray-200 p-4">
          <div className="text-sm text-gray-600">
            Page {agentFilters.page} of {agentPagination.totalPages}
            {agentPagination.totalItems != null && ` · ${agentPagination.totalItems} total`}
            {agentFilters.search.trim() ? ` · search: "${agentFilters.search.trim()}"` : ""}
          </div>
          <div className="flex gap-1 items-center">
            <button
              type="button"
              onClick={() => handleAgentPageChange(agentFilters.page - 1)}
              disabled={agentFilters.page <= 1}
              className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <ChevronLeft size={18} />
              <span>Previous</span>
            </button>
            <button
              type="button"
              onClick={() => handleAgentPageChange(agentFilters.page + 1)}
              disabled={!canGoNextAgentPage}
              className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <span>Next</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {showDetailModal && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4"
          onClick={() => {
            setShowDetailModal(false);
            setSelectedId("");
          }}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col border border-gray-200 overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-5 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Eye size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Request Detail</h3>
                    <p className="text-blue-100 text-sm">Exporter rate request — shipment and quote details</p>
                  </div>
                </div>
                <button
                  className="text-white/80 hover:text-white text-xl font-bold"
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedId("");
                  }}
                >
                  X
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 bg-gray-50">
              {loadingDetail ? (
                <p className="text-sm text-gray-500">Loading detail...</p>
              ) : !selectedDetail ? (
                <p className="text-sm text-red-600">Failed to load detail.</p>
              ) : (
                <>
                  <RateRequestDetailBody detail={selectedDetail} />
                  <RateRequestDocumentsPanel
                    requestIdentifier={selectedDetail.requestId || selectedDetail._id}
                    authHeaders={authHeaders}
                    readOnly
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showAgentDetailModal && selectedAgentDetail && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4"
          onClick={() => {
            setShowAgentDetailModal(false);
            setSelectedAgentDetail(null);
          }}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col border border-gray-200 overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-teal-600 to-cyan-700 text-white px-6 py-5 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Eye size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Agent Rate Request</h3>
                    <p className="text-teal-100 text-sm">Submitted via agent portal — full shipment snapshot</p>
                  </div>
                </div>
                <button
                  className="text-white/80 hover:text-white text-xl font-bold"
                  onClick={() => {
                    setShowAgentDetailModal(false);
                    setSelectedAgentDetail(null);
                  }}
                >
                  X
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 bg-gray-50">
              <RateRequestDetailBody detail={selectedAgentDetail} />
              <RateRequestDocumentsPanel
                requestIdentifier={selectedAgentDetail.requestId || selectedAgentDetail._id}
                authHeaders={authHeaders}
                readOnly
                onProgressChange={handleAgentDocumentProgress}
              />
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex justify-center items-center p-4" onClick={() => setShowCreate(false)}>
          <form
            className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={onCreate}
          >
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Plus className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Create Exporter Rate Request</h2>
                    <p className="text-blue-100">Add a new rate request</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowCreate(false)} className="text-white hover:text-gray-200 text-2xl font-bold">
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <h4 className="text-sm font-semibold text-slate-700 mb-4">Request meta</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FieldLabel label="Source" required>
                    <SearchableSelect
                      value={createForm.source}
                      onChange={(value) => setCreateForm((p) => ({ ...p, source: value }))}
                      options={meta.sources.map((s) => ({ value: s, label: formatStatusLabel(s) }))}
                      placeholder="Select Source"
                      required
                    />
                  </FieldLabel>
                  <FieldLabel label="Expected dispatch date">
                    <input
                      type="datetime-local"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      value={createForm.expectedDispatchDate}
                      onChange={(e) => setCreateForm((p) => ({ ...p, expectedDispatchDate: e.target.value }))}
                    />
                  </FieldLabel>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                <h4 className="text-sm font-semibold text-blue-800 mb-4">Exporter Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FieldLabel label="Exporter (agent customer)" required>
                    <SearchableSelect
                      value={createForm.exporterCompany}
                      onChange={(value) => setCreateForm((p) => ({ ...p, exporterCompany: value }))}
                      options={agentOptions}
                      placeholder={agentsLoading ? "Loading…" : "Select agent customer"}
                      required
                      disabled={agentsLoading || agentOptions.length === 0}
                    />
                  </FieldLabel>
                  <FieldLabel label="Contact Person" required>
                    <InputReq placeholder="Enter contact person" value={createForm.contactPerson} onChange={(v) => setCreateForm((p) => ({ ...p, contactPerson: v }))} />
                  </FieldLabel>
                  <FieldLabel label="Contact Email">
                    <input className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" placeholder="Enter contact email" value={createForm.contactEmail} onChange={(e) => setCreateForm((p) => ({ ...p, contactEmail: e.target.value }))} />
                  </FieldLabel>
                  <FieldLabel label="Contact Phone">
                    <input className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" placeholder="Enter contact phone" value={createForm.contactPhone} onChange={(e) => setCreateForm((p) => ({ ...p, contactPhone: e.target.value }))} />
                  </FieldLabel>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-emerald-800">Shipment Details</h4>
                  <p className="text-xs text-emerald-700/90 mt-1">
                    Please provide the basic details of your shipment.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FieldLabel label="Origin Country" required>
                    <SearchableSelect
                      value={createForm.originCountry}
                      onChange={(value) =>
                        setCreateForm((p) => ({
                          ...p,
                          originCountry: value,
                          originPort: "",
                        }))
                      }
                      options={shipmentCountryOptions}
                      placeholder={countriesLoading ? "Loading countries…" : "Select country"}
                      required
                      disabled={countriesLoading}
                      largeList
                    />
                  </FieldLabel>
                  <FieldLabel label="Destination Country" required>
                    <SearchableSelect
                      value={createForm.destinationCountry}
                      onChange={(value) =>
                        setCreateForm((p) => ({
                          ...p,
                          destinationCountry: value,
                          destinationPort: "",
                        }))
                      }
                      options={shipmentCountryOptions}
                      placeholder={countriesLoading ? "Loading countries…" : "Select country"}
                      required
                      disabled={countriesLoading}
                      largeList
                    />
                  </FieldLabel>
                  <FieldLabel label="Origin Port / City / ICD" required>
                    <SearchableSelect
                      value={createForm.originPort}
                      onChange={(value) => setCreateForm((p) => ({ ...p, originPort: value }))}
                      options={originPortOptions}
                      placeholder={
                        !createForm.originCountry
                          ? "Select origin country first"
                          : originPortsLoading
                            ? "Loading ports & ICDs…"
                            : `Select port or ICD (${originCountryName})`
                      }
                      required
                      disabled={!createForm.originCountry || originPortsLoading}
                      largeList
                    />
                  </FieldLabel>
                  <FieldLabel label="Destination Port / City / ICD" required>
                    <SearchableSelect
                      value={createForm.destinationPort}
                      onChange={(value) => setCreateForm((p) => ({ ...p, destinationPort: value }))}
                      options={destinationPortOptions}
                      placeholder={
                        !createForm.destinationCountry
                          ? "Select destination country first"
                          : destinationPortsLoading
                            ? "Loading ports & ICDs…"
                            : `Select port or ICD (${destinationCountryName})`
                      }
                      required
                      disabled={!createForm.destinationCountry || destinationPortsLoading}
                      largeList
                    />
                  </FieldLabel>
                  <FieldLabel label="Cargo Type" required>
                    <SearchableSelect
                      value={createForm.cargoType}
                      onChange={(value) => setCreateForm((p) => ({ ...p, cargoType: value }))}
                      options={CARGO_TYPE_CREATE_OPTIONS}
                      placeholder="Select cargo type"
                      required
                    />
                  </FieldLabel>
                  <FieldLabel label="Container Type" required>
                    <SearchableSelect
                      value={createForm.containerType}
                      onChange={(value) => setCreateForm((p) => ({ ...p, containerType: value }))}
                      options={CREATE_CONTAINER_OPTIONS}
                      placeholder="Select container type"
                      required
                    />
                  </FieldLabel>
                  <FieldLabel label="Shipment Type" required>
                    <div className="rounded-lg border border-gray-200 bg-white p-3 min-h-[46px] flex items-center">
                      <div className="flex flex-col gap-2 w-full">
                        {SHIPMENT_TYPE_OPTIONS.map((opt) => (
                          <label
                            key={opt.value}
                            className="flex items-center gap-2 cursor-pointer text-sm text-gray-800"
                          >
                            <input
                              type="radio"
                              name="createShipmentType"
                              value={opt.value}
                              checked={createForm.shipmentType === opt.value}
                              onChange={() =>
                                setCreateForm((p) => ({ ...p, shipmentType: opt.value }))
                              }
                              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </FieldLabel>
                  <FieldLabel label="Service Type" required>
                    <SearchableSelect
                      value={createForm.serviceType}
                      onChange={(value) => setCreateForm((p) => ({ ...p, serviceType: value }))}
                      options={SERVICE_TYPE_OPTIONS}
                      placeholder="Select service type"
                      required
                    />
                  </FieldLabel>
                  <FieldLabel label="Incoterm" required className="md:col-span-2">
                    <SearchableSelect
                      value={createForm.incoterm}
                      onChange={(value) => setCreateForm((p) => ({ ...p, incoterm: value }))}
                      options={CREATE_INCOTERM_OPTIONS}
                      placeholder="Select incoterm"
                      required
                    />
                  </FieldLabel>
                  <FieldLabel label="Origin Trucking (Yes/No)" required>
                    <SearchableSelect
                      value={createForm.originTruckingRequired}
                      onChange={(value) =>
                        setCreateForm((p) => ({
                          ...p,
                          originTruckingRequired: value,
                          ...(String(value).toLowerCase() === "no"
                            ? {
                                originTruckingPickupLocation: defaultEmptyTruckingLocation(),
                                originTruckingDeliveryLocation: defaultEmptyTruckingLocation(),
                              }
                            : {}),
                        }))
                      }
                      options={YES_NO_SEARCH_OPTIONS}
                      placeholder="Select option"
                      required
                    />
                  </FieldLabel>
                  <FieldLabel label="Destination Trucking (Yes/No)" required>
                    <SearchableSelect
                      value={createForm.destinationTruckingRequired}
                      onChange={(value) =>
                        setCreateForm((p) => ({
                          ...p,
                          destinationTruckingRequired: value,
                          ...(String(value).toLowerCase() === "no"
                            ? {
                                destinationTruckingPickupLocation: defaultEmptyTruckingLocation(),
                                destinationTruckingDeliveryLocation: defaultEmptyTruckingLocation(),
                              }
                            : {}),
                        }))
                      }
                      options={YES_NO_SEARCH_OPTIONS}
                      placeholder="Select option"
                      required
                    />
                  </FieldLabel>

                  {isTruckingYes(createForm.originTruckingRequired) && (
                    <div className="md:col-span-2 space-y-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
                      <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                        <Truck size={16} />
                        Origin trucking locations
                      </p>
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <TruckingLocationCard
                          title="Origin trucking pickup location"
                          borderClass="border-amber-100"
                          headingClass="text-amber-900"
                          location={createForm.originTruckingPickupLocation}
                          showRequired
                          onChange={(field, value) =>
                            setCreateForm((p) => ({
                              ...p,
                              originTruckingPickupLocation: {
                                ...p.originTruckingPickupLocation,
                                [field]: value,
                              },
                            }))
                          }
                          placeholders={{
                            address: "Enter origin trucking pickup address",
                            city: "Enter city",
                            state: "Enter state",
                            zipcode: "Enter zipcode",
                          }}
                        />
                        <TruckingLocationCard
                          title="Origin trucking delivery location"
                          borderClass="border-amber-100"
                          headingClass="text-amber-900"
                          location={createForm.originTruckingDeliveryLocation}
                          showRequired
                          onChange={(field, value) =>
                            setCreateForm((p) => ({
                              ...p,
                              originTruckingDeliveryLocation: {
                                ...p.originTruckingDeliveryLocation,
                                [field]: value,
                              },
                            }))
                          }
                          placeholders={{
                            address: "Enter origin trucking drop address",
                            city: "Enter city",
                            state: "Enter state",
                            zipcode: "Enter zipcode",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {isTruckingYes(createForm.destinationTruckingRequired) && (
                    <div className="md:col-span-2 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                      <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <Truck size={16} />
                        Destination trucking locations
                      </p>
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <TruckingLocationCard
                          title="Destination trucking pickup location"
                          borderClass="border-slate-200"
                          headingClass="text-slate-900"
                          location={createForm.destinationTruckingPickupLocation}
                          showRequired
                          onChange={(field, value) =>
                            setCreateForm((p) => ({
                              ...p,
                              destinationTruckingPickupLocation: {
                                ...p.destinationTruckingPickupLocation,
                                [field]: value,
                              },
                            }))
                          }
                          placeholders={{
                            address: "Enter destination trucking pickup address",
                            city: "Enter city",
                            state: "Enter state",
                            zipcode: "Enter zipcode",
                          }}
                        />
                        <TruckingLocationCard
                          title="Destination trucking delivery location"
                          borderClass="border-slate-200"
                          headingClass="text-slate-900"
                          location={createForm.destinationTruckingDeliveryLocation}
                          showRequired
                          onChange={(field, value) =>
                            setCreateForm((p) => ({
                              ...p,
                              destinationTruckingDeliveryLocation: {
                                ...p.destinationTruckingDeliveryLocation,
                                [field]: value,
                              },
                            }))
                          }
                          placeholders={{
                            address: "Enter destination trucking drop address",
                            city: "Enter city",
                            state: "Enter state",
                            zipcode: "Enter zipcode",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <FieldLabel label="Commercial Invoice Value">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter invoice value"
                      value={createForm.commercialInvoiceValue}
                      onChange={(e) =>
                        setCreateForm((p) => ({ ...p, commercialInvoiceValue: e.target.value }))
                      }
                    />
                  </FieldLabel>
                  <FieldLabel label="Customs clearance">
                    <SearchableSelect
                      value={createForm.customsClearanceRequirement}
                      onChange={(value) =>
                        setCreateForm((p) => ({ ...p, customsClearanceRequirement: value }))
                      }
                      options={CUSTOMS_CLEARANCE_REQUIREMENT_OPTIONS}
                      placeholder="Select operation"
                    />
                  </FieldLabel>
                  <FieldLabel label="Additional Message (Optional)" className="md:col-span-2">
                    <textarea
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                      rows={3}
                      placeholder="Enter your additional message..."
                      value={createForm.channelMessageText}
                      onChange={(e) =>
                        setCreateForm((p) => ({ ...p, channelMessageText: e.target.value }))
                      }
                    />
                  </FieldLabel>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
                <h4 className="text-sm font-semibold text-amber-800 mb-4">Attachments</h4>
                <div className="space-y-3">
                  <input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        attachments: Array.from(e.target.files || []),
                      }))
                    }
                  />
                  {createForm.attachments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {attachmentPreviews.map((file, idx) => (
                        <div key={`${file.name}-${idx}`} className="bg-white border border-amber-200 rounded-lg p-2">
                          {file.type?.startsWith("image/") ? (
                            <img
                              src={file.url}
                              alt={file.name}
                              className="w-full h-24 object-cover rounded border border-amber-100"
                            />
                          ) : (
                            <div className="w-full h-24 rounded border border-amber-100 bg-amber-50 flex items-center justify-center">
                              <Paperclip size={20} className="text-amber-600" />
                            </div>
                          )}
                          <p className="text-xs text-slate-700 mt-2 truncate" title={file.name}>
                            {file.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Upload files/images to send as `attachments` parameter.</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                <button type="button" onClick={() => setShowCreate(false)} disabled={submitting} className={`px-6 py-3 border border-gray-300 rounded-lg transition-colors ${submitting ? "opacity-50 cursor-not-allowed text-gray-400" : "text-gray-700 hover:bg-gray-50"}`}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className={`px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold transition-colors ${submitting ? "opacity-50 cursor-not-allowed" : "hover:from-blue-600 hover:to-blue-700"}`}>
                  {submitting ? "Creating..." : "Create Request"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {showExtraDetailsModal && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-[60] flex justify-center items-center p-4"
          onClick={() => !extraDetailsSubmitting && setShowExtraDetailsModal(false)}
        >
          <form
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-gray-200 overflow-visible"
            onClick={(e) => e.stopPropagation()}
            onSubmit={submitExtraDetails}
          >
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-5 py-4 shrink-0 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                  <ClipboardList size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold truncate">Customs & shipment extras</h3>
                  <p className="text-violet-100 text-xs truncate">
                    {extraDetailsMode === "agent"
                      ? "PATCH agent-customer/rate-requests/:identifier"
                      : "PATCH extra-details · Request ID optional — fill any fields you have"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={extraDetailsSubmitting}
                className="text-white/90 hover:text-white text-xl font-bold shrink-0 disabled:opacity-50"
                onClick={() => setShowExtraDetailsModal(false)}
              >
                ×
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto bg-gradient-to-b from-slate-100/90 via-slate-50 to-white p-6 space-y-6">
              {extraDetailsLoading ? (
                <p className="text-sm text-slate-500 py-12 text-center">Loading current values…</p>
              ) : (
                <>
                  <ExtraSection tone="violet" icon={Package} title="Product & cargo">
                    
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FieldLabel label="Commodity name" required>
                        <input
                          className={extraInputClass}
                          value={extraDetailsForm.commodityName}
                          onChange={(e) => setExtraDetailsForm((p) => ({ ...p, commodityName: e.target.value }))}
                          placeholder="Enter commodity name"
                        />
                      </FieldLabel>
                      <FieldLabel label="Gross weight" required>
                        <input
                          className={extraInputClass}
                          value={extraDetailsForm.weight}
                          onChange={(e) => setExtraDetailsForm((p) => ({ ...p, weight: e.target.value }))}
                          placeholder="Enter gross weight"
                        />
                      </FieldLabel>
                      <FieldLabel label="Unit (KG / LBS)" required>
                        <SearchableSelect
                          value={extraDetailsForm.unit}
                          onChange={(value) => setExtraDetailsForm((p) => ({ ...p, unit: value }))}
                          options={WEIGHT_UNIT_OPTIONS}
                          placeholder="Select unit"
                          className="w-full"
                          compact
                        />
                      </FieldLabel>
                      <div className="md:col-span-2">
                        <p className="text-sm font-semibold text-gray-700">
                          Dimensions — Length × Width × Height{" "}
                          <span className="font-normal text-gray-500">(cm)</span>{" "}
                          <span className="text-red-500">*</span>
                        </p>
                      </div>
                      <FieldLabel label="Length (cm)" required>
                        <input
                          className={extraInputClass}
                          value={extraDetailsForm.dimensions.length}
                          onChange={(e) =>
                            setExtraDetailsForm((p) => ({
                              ...p,
                              dimensions: { ...p.dimensions, length: e.target.value },
                            }))
                          }
                          placeholder="Length"
                        />
                      </FieldLabel>
                      <FieldLabel label="Width (cm)" required>
                        <input
                          className={extraInputClass}
                          value={extraDetailsForm.dimensions.width}
                          onChange={(e) =>
                            setExtraDetailsForm((p) => ({
                              ...p,
                              dimensions: { ...p.dimensions, width: e.target.value },
                            }))
                          }
                          placeholder="Width"
                        />
                      </FieldLabel>
                      <FieldLabel label="Height (cm)" required>
                        <input
                          className={extraInputClass}
                          value={extraDetailsForm.dimensions.height}
                          onChange={(e) =>
                            setExtraDetailsForm((p) => ({
                              ...p,
                              dimensions: { ...p.dimensions, height: e.target.value },
                            }))
                          }
                          placeholder="Height"
                        />
                      </FieldLabel>
                      <FieldLabel label="Number of packages" required>
                        <input
                          className={extraInputClass}
                          value={extraDetailsForm.noOfPkgs}
                          onChange={(e) => setExtraDetailsForm((p) => ({ ...p, noOfPkgs: e.target.value }))}
                          placeholder="Total cartons / pallets / crates"
                        />
                      </FieldLabel>
                      <FieldLabel label="Stackable" required>
                        <SearchableSelect
                          value={extraDetailsForm.stackable}
                          onChange={(value) => setExtraDetailsForm((p) => ({ ...p, stackable: value }))}
                          options={STACKABLE_OPTIONS}
                          placeholder="Stackable or non-stackable"
                          className="w-full"
                          compact
                        />
                      </FieldLabel>
                      <FieldLabel label="Packaging type" required>
                        <SearchableSelect
                          value={extraDetailsForm.pkgType}
                          onChange={(value) => {
                            setExtraDetailsForm((p) => ({
                              ...p,
                              pkgType: value,
                              ...(!packagingTypeRequiresWoodCompliance(value)
                                ? {
                                    ispm15Compliance: "",
                                    treatmentHeatTreated: false,
                                    treatmentMethylBromide: false,
                                    ippcStampVerified: "",
                                  }
                                : {}),
                            }));
                          }}
                          options={PKG_TYPE_OPTIONS}
                          placeholder="Select packaging type"
                          className="w-full"
                          compact
                        />
                      </FieldLabel>
                      {packagingTypeRequiresWoodCompliance(extraDetailsForm.pkgType) ? (
                        <>
                          <div className="md:col-span-2 rounded-xl border border-violet-200 bg-white/80 p-4 space-y-3">
                            <p className="text-sm font-semibold text-gray-700">
                              ISPM-15 compliance <span className="text-red-500">*</span>
                            </p>
                            <div className="flex flex-wrap gap-4">
                              {ISPM15_COMPLIANCE_OPTIONS.map((opt) => (
                                <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700">
                                  <input
                                    type="radio"
                                    name="ispm15Compliance"
                                    checked={extraDetailsForm.ispm15Compliance === opt.value}
                                    onChange={() =>
                                      setExtraDetailsForm((p) => ({ ...p, ispm15Compliance: opt.value }))
                                    }
                                  />
                                  {opt.label}
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="md:col-span-2 rounded-xl border border-violet-200 bg-white/80 p-4 space-y-3">
                            <p className="text-sm font-semibold text-gray-700">
                              Treatment type <span className="text-red-500">*</span>
                            </p>
                            <div className="flex flex-wrap gap-4">
                              <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={extraDetailsForm.treatmentHeatTreated}
                                  onChange={(e) =>
                                    setExtraDetailsForm((p) => ({
                                      ...p,
                                      treatmentHeatTreated: e.target.checked,
                                    }))
                                  }
                                />
                                Heat Treated (HT)
                              </label>
                              <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={extraDetailsForm.treatmentMethylBromide}
                                  onChange={(e) =>
                                    setExtraDetailsForm((p) => ({
                                      ...p,
                                      treatmentMethylBromide: e.target.checked,
                                    }))
                                  }
                                />
                                Methyl Bromide (MB)
                              </label>
                            </div>
                          </div>
                          <div className="md:col-span-2 rounded-xl border border-violet-200 bg-white/80 p-4 space-y-3">
                            <p className="text-sm font-semibold text-gray-700">
                              IPPC stamp verified <span className="text-red-500">*</span>
                            </p>
                            <div className="flex flex-wrap gap-4">
                              {IPPC_STAMP_OPTIONS.map((opt) => (
                                <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700">
                                  <input
                                    type="radio"
                                    name="ippcStampVerified"
                                    checked={extraDetailsForm.ippcStampVerified === opt.value}
                                    onChange={() =>
                                      setExtraDetailsForm((p) => ({ ...p, ippcStampVerified: opt.value }))
                                    }
                                  />
                                  {opt.label}
                                </label>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </ExtraSection>

                  <ExtraSection tone="rose" icon={Receipt} title="Commercial & customs">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FieldLabel label="HS code" required>
                        <SearchableSelect
                          value={extraDetailsForm.hsCode}
                          onChange={(value) => setExtraDetailsForm((p) => ({ ...p, hsCode: value }))}
                          options={HS_CODE_OPTIONS}
                          placeholder="Search HS code"
                          className="w-full"
                          compact
                          largeList
                        />
                      </FieldLabel>
                      <FieldLabel label="Customer clearance requirement">
                        <SearchableSelect
                          value={extraDetailsForm.customsClearanceRequirement}
                          onChange={(value) =>
                            setExtraDetailsForm((p) => ({ ...p, customsClearanceRequirement: value }))
                          }
                          options={CUSTOMS_CLEARANCE_REQUIREMENT_OPTIONS}
                          placeholder="Select clearance requirement"
                          className="w-full"
                          compact
                        />
                      </FieldLabel>
                      <FieldLabel label="Customs bond requirement">
                        <SearchableSelect
                          value={extraDetailsForm.customsBondRequirement}
                          onChange={(value) =>
                            setExtraDetailsForm((p) => ({ ...p, customsBondRequirement: value }))
                          }
                          options={CUSTOMS_BOND_REQUIREMENT_OPTIONS}
                          placeholder="Select bond requirement"
                          className="w-full"
                          compact
                        />
                      </FieldLabel>
                    </div>
                  </ExtraSection>

                  <ExtraSection tone="amber" icon={Clock3} title="Schedule & delivery">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FieldLabel label="Cargo ready date" required>
                        <input
                          type="date"
                          className={extraInputClass}
                          value={extraDetailsForm.cargoReadyDate}
                          onChange={(e) => setExtraDetailsForm((p) => ({ ...p, cargoReadyDate: e.target.value }))}
                        />
                      </FieldLabel>
                      <FieldLabel label="Pickup time" required>
                        <input
                          type="time"
                          className={extraInputClass}
                          value={extraDetailsForm.pickupTime}
                          onChange={(e) => setExtraDetailsForm((p) => ({ ...p, pickupTime: e.target.value }))}
                        />
                      </FieldLabel>
                      <FieldLabel label="Delivery location type" required>
                        <SearchableSelect
                          value={extraDetailsForm.deliveryLocationType}
                          onChange={(value) => setExtraDetailsForm((p) => ({ ...p, deliveryLocationType: value }))}
                          options={DELIVERY_LOCATION_TYPE_OPTIONS}
                          placeholder="Select location type"
                          className="w-full"
                          compact
                        />
                      </FieldLabel>
                      <FieldLabel label="Delivery time / appointment" required className="md:col-span-2">
                        <input
                          className={extraInputClass}
                          value={extraDetailsForm.deliveryTimeAppointment}
                          onChange={(e) =>
                            setExtraDetailsForm((p) => ({ ...p, deliveryTimeAppointment: e.target.value }))
                          }
                          placeholder="e.g. 10 AM–2 PM, call 1 hour before"
                        />
                      </FieldLabel>
                    </div>
                  </ExtraSection>

                  {false && extraDetailsMode === "agent" && (
                    <>
                      <EditableTruckingSection
                        tone="amber"
                        title="Origin trucking"
                        requiredLabel="Origin trucking required"
                        requiredValue={extraDetailsForm.originTruckingRequired}
                        onRequiredChange={(value) =>
                          setExtraDetailsForm((p) => ({
                            ...p,
                            originTruckingRequired: value,
                            ...(String(value).toLowerCase() === "no"
                              ? {
                                  originTruckingPickupLocation: defaultEmptyTruckingLocation(),
                                  originTruckingDeliveryLocation: defaultEmptyTruckingLocation(),
                                }
                              : {}),
                          }))
                        }
                        pickupLocation={extraDetailsForm.originTruckingPickupLocation}
                        deliveryLocation={extraDetailsForm.originTruckingDeliveryLocation}
                        onPickupChange={(field, value) =>
                          setExtraDetailsForm((p) => ({
                            ...p,
                            originTruckingPickupLocation: {
                              ...p.originTruckingPickupLocation,
                              [field]: value,
                            },
                          }))
                        }
                        onDeliveryChange={(field, value) =>
                          setExtraDetailsForm((p) => ({
                            ...p,
                            originTruckingDeliveryLocation: {
                              ...p.originTruckingDeliveryLocation,
                              [field]: value,
                            },
                          }))
                        }
                        disabled={String(extraDetailsForm.originTruckingRequired).toLowerCase() === "no"}
                        pickupPlaceholders={{
                          address: "Updated pickup address",
                          city: "Gurugram",
                          state: "Haryana",
                          zipcode: "122016",
                        }}
                        deliveryPlaceholders={{
                          address: "Updated delivery address",
                          city: "New Delhi",
                          state: "Delhi",
                          zipcode: "110037",
                        }}
                      />

                      <EditableTruckingSection
                        tone="slate"
                        title="Destination trucking"
                        requiredLabel="Destination trucking required"
                        requiredValue={extraDetailsForm.destinationTruckingRequired}
                        onRequiredChange={(value) =>
                          setExtraDetailsForm((p) => ({
                            ...p,
                            destinationTruckingRequired: value,
                            ...(String(value).toLowerCase() === "no"
                              ? {
                                  destinationTruckingPickupLocation: defaultEmptyTruckingLocation(),
                                  destinationTruckingDeliveryLocation: defaultEmptyTruckingLocation(),
                                }
                              : {}),
                          }))
                        }
                        pickupLocation={extraDetailsForm.destinationTruckingPickupLocation}
                        deliveryLocation={extraDetailsForm.destinationTruckingDeliveryLocation}
                        onPickupChange={(field, value) =>
                          setExtraDetailsForm((p) => ({
                            ...p,
                            destinationTruckingPickupLocation: {
                              ...p.destinationTruckingPickupLocation,
                              [field]: value,
                            },
                          }))
                        }
                        onDeliveryChange={(field, value) =>
                          setExtraDetailsForm((p) => ({
                            ...p,
                            destinationTruckingDeliveryLocation: {
                              ...p.destinationTruckingDeliveryLocation,
                              [field]: value,
                            },
                          }))
                        }
                        disabled={String(extraDetailsForm.destinationTruckingRequired).toLowerCase() === "no"}
                        pickupPlaceholders={{
                          address: "Port terminal yard",
                          city: "Los Angeles",
                          state: "California",
                          zipcode: "90731",
                        }}
                        deliveryPlaceholders={{
                          address: "Customer warehouse",
                          city: "Long Beach",
                          state: "California",
                          zipcode: "90802",
                        }}
                      />
                    </>
                  )}

                  {false && <ExtraSection tone="amber" icon={Clock3} title="Schedule & timing">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FieldLabel label="Cargo ready date">
                        <input
                          type="datetime-local"
                          className={extraInputClass}
                          value={extraDetailsForm.cargoReadyDate}
                          onChange={(e) => setExtraDetailsForm((p) => ({ ...p, cargoReadyDate: e.target.value }))}
                        />
                      </FieldLabel>
                      <FieldLabel label="Pickup time">
                        <input
                          type="datetime-local"
                          className={extraInputClass}
                          value={extraDetailsForm.pickupTime}
                          onChange={(e) => setExtraDetailsForm((p) => ({ ...p, pickupTime: e.target.value }))}
                        />
                      </FieldLabel>
                      <FieldLabel label="Delivery time / appointment" className="md:col-span-2">
                        <input
                          className={extraInputClass}
                          value={extraDetailsForm.deliveryTimeAppointment}
                          onChange={(e) =>
                            setExtraDetailsForm((p) => ({ ...p, deliveryTimeAppointment: e.target.value }))
                          }
                          placeholder="e.g. By appointment only"
                        />
                      </FieldLabel>
                    </div>
                  </ExtraSection>}

                  {false && <ExtraSection tone="rose" icon={Receipt} title="Commercial & customs">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FieldLabel label="Commercial invoice value">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          className={extraInputClass}
                          value={extraDetailsForm.commercialInvoiceValue}
                          onChange={(e) =>
                            setExtraDetailsForm((p) => ({ ...p, commercialInvoiceValue: e.target.value }))
                          }
                          placeholder="e.g. 125000"
                        />
                      </FieldLabel>
                      <FieldLabel label="HS code">
                        <SearchableSelect
                          value={extraDetailsForm.hsCode}
                          onChange={(value) => setExtraDetailsForm((p) => ({ ...p, hsCode: value }))}
                          options={HS_CODE_OPTIONS}
                          placeholder="Search code or description…"
                          className="w-full"
                          compact
                          largeList
                        />
                      </FieldLabel>
                      <FieldLabel label="Customs clearance origin required">
                        <SearchableSelect
                          value={extraDetailsForm.customsClearanceOriginRequired}
                          onChange={(value) =>
                            setExtraDetailsForm((p) => ({ ...p, customsClearanceOriginRequired: value }))
                          }
                          options={YES_NO_SEARCH_OPTIONS}
                          placeholder="Select…"
                          className="w-full"
                          compact
                        />
                      </FieldLabel>
                      <FieldLabel label="Delivery location type">
                        <input
                          className={extraInputClass}
                          value={extraDetailsForm.deliveryLocationType}
                          onChange={(e) =>
                            setExtraDetailsForm((p) => ({ ...p, deliveryLocationType: e.target.value }))
                          }
                          placeholder="e.g. commercial warehouse with dock"
                        />
                      </FieldLabel>
                    </div>
                  </ExtraSection>}

                  {false && <ExtraSection tone="slate" icon={Truck} title="Quotes & equipment">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FieldLabel label="Target rate or timeline" className="md:col-span-2">
                        <textarea
                          rows={2}
                          className={extraInputClass}
                          value={extraDetailsForm.targetRateOrTimeline}
                          onChange={(e) =>
                            setExtraDetailsForm((p) => ({ ...p, targetRateOrTimeline: e.target.value }))
                          }
                          placeholder="e.g. Need quote by Friday"
                        />
                      </FieldLabel>
                      <FieldLabel label="Special equipment required" className="md:col-span-2">
                        <textarea
                          rows={2}
                          className={extraInputClass}
                          value={extraDetailsForm.specialEquipmentRequired}
                          onChange={(e) =>
                            setExtraDetailsForm((p) => ({ ...p, specialEquipmentRequired: e.target.value }))
                          }
                          placeholder="e.g. Tail lift if needed"
                        />
                      </FieldLabel>
                    </div>
                  </ExtraSection>}
                </>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 bg-white flex justify-end gap-3 shrink-0">
              <button
                type="button"
                disabled={extraDetailsSubmitting || extraDetailsLoading}
                onClick={() => setShowExtraDetailsModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={extraDetailsSubmitting || extraDetailsLoading}
                className="px-4 py-2 text-sm rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-50"
              >
                {extraDetailsSubmitting
                  ? "Saving…"
                  : extraDetailsMode === "agent"
                    ? "Save request details"
                    : "Save customs details"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function DetailField({ label, value, multiline }) {
  const display =
    value === undefined || value === null || String(value).trim() === "" ? "N/A" : String(value);
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p
        className={`mt-0.5 text-sm font-semibold text-gray-900 ${multiline ? "whitespace-pre-wrap" : ""}`}
      >
        {display}
      </p>
    </div>
  );
}

function ReadonlyTruckingSectionCard({ title, requiredValue, pickupLocation, deliveryLocation }) {
  const normalizedRequired = formatYesNoValue(requiredValue) || "No";
  const shouldShowLocations =
    normalizedRequired === "Yes" ||
    formatLocationForView(pickupLocation) ||
    formatLocationForView(deliveryLocation);

  return (
    <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
      <h5 className="mb-3 text-sm font-semibold text-amber-900">{title}</h5>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <DetailField label="Trucking required" value={normalizedRequired} />
        {shouldShowLocations && (
          <div className="md:col-span-2 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ReadonlyTruckingLocationBlock title="Pickup location" location={pickupLocation} />
            <ReadonlyTruckingLocationBlock title="Delivery location" location={deliveryLocation} />
          </div>
        )}
      </div>
    </div>
  );
}

function ReadonlyTruckingLocationBlock({ title, location }) {
  const normalizedLocation =
    location && typeof location === "object"
      ? {
          address: String(location.address ?? "").trim(),
          city: String(location.city ?? "").trim(),
          state: String(location.state ?? "").trim(),
          zipcode: getLocationZipcode(location),
        }
      : {
          address: typeof location === "string" ? location.trim() : "",
          city: "",
          state: "",
          zipcode: "",
        };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <h6 className="mb-3 text-sm font-semibold text-slate-900">{title}</h6>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <DetailField label="Address" value={normalizedLocation.address || "N/A"} />
        <DetailField label="City" value={normalizedLocation.city || "N/A"} />
        <DetailField label="State" value={normalizedLocation.state || "N/A"} />
        <DetailField label="Zipcode" value={normalizedLocation.zipcode || "N/A"} />
      </div>
    </div>
  );
}

function ContainerTypeDisplay({ value }) {
  if (!value) return <p className="text-sm text-gray-600">N/A</p>;
  const opt = CONTAINER_TYPE_OPTIONS.find(
    (c) => c.value === value || c.label === value || String(c.value).toUpperCase() === String(value).toUpperCase(),
  );
  if (!opt) return <p className="text-sm font-semibold text-gray-900">{value}</p>;
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white bg-white p-4 shadow-sm">
      <img src={opt.image} alt={opt.label} className="h-24 w-36 shrink-0 rounded-lg border border-indigo-100 bg-slate-50 object-cover" />
      <div>
        <p className="font-semibold text-gray-900">{opt.label}</p>
        <p className="text-xs text-gray-500">{opt.value}</p>
      </div>
    </div>
  );
}

function AttachmentSection({ attachments, flat }) {
  const list = Array.isArray(attachments) ? attachments : [];
  const body =
    list.length === 0 ? (
      <p className="text-xs text-gray-500">No attachments</p>
    ) : (
      <div className={`space-y-2 overflow-auto ${flat ? "max-h-64" : "max-h-52"}`}>
        {list.map((attachment, idx) => {
          const url = getAttachmentUrl(attachment);
          const title =
            attachment?.fileName ||
            attachment?.originalName ||
            attachment?.name ||
            `Attachment ${idx + 1}`;
          return (
            <div
              key={`${title}-${idx}`}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-gray-700 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-medium">{title}</p>
                {url && (
                  <a href={url} target="_blank" rel="noreferrer" className="whitespace-nowrap text-blue-600 hover:underline">
                    Open
                  </a>
                )}
              </div>
              {url && isImageAttachment(attachment) && (
                <img src={url} alt={title} className="mt-2 h-28 w-full rounded border border-slate-100 object-cover" />
              )}
            </div>
          );
        })}
      </div>
    );

  if (flat) return body;

  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-gray-50 p-3">
      <p className="mb-2 flex items-center gap-2 font-semibold text-gray-800">
        <Paperclip size={14} className="text-slate-600" />
        Attachments
      </p>
      {body}
    </div>
  );
}

function renderSelectOptionContent(option) {
  if (!option) return null;
  if (option.flagUrl) {
    return (
      <span className="flex min-w-0 items-center gap-2">
        <CountryFlagImg countryCode={option.value} />
        <span className="truncate">{option.displayLabel ?? option.label}</span>
      </span>
    );
  }
  return <span className="truncate">{option.displayLabel ?? option.label}</span>;
}

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  className = "",
  required = false,
  disabled = false,
  compact = false,
  largeList = false,
}) {
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [menuBox, setMenuBox] = useState(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter((option) => {
      const lab = String(option.searchText ?? option.displayLabel ?? option.label ?? "").toLowerCase();
      const val = String(option.value ?? "").toLowerCase();
      return lab.includes(q) || val.includes(q);
    });
  }, [options, search]);

  const selected = options.find((option) => option.value === value);
  const hasSelectedDisplay = Boolean(selected || value);

  const updateMenuBox = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 4;
    const spaceBelow = window.innerHeight - r.bottom - gap - 8;
    const cap = largeList ? Math.min(window.innerHeight * 0.65, 448) : 240;
    const maxH = Math.max(120, Math.min(cap, spaceBelow));
    setMenuBox({
      top: r.bottom + gap,
      left: r.left,
      width: r.width,
      maxH,
    });
  }, [largeList]);

  useLayoutEffect(() => {
    if (!open || disabled) {
      setMenuBox(null);
      return;
    }
    updateMenuBox();
    const onResize = () => updateMenuBox();
    const onScroll = () => updateMenuBox();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, disabled, updateMenuBox]);

  useEffect(() => {
    if (!open || disabled) return;
    const onDocMouseDown = (e) => {
      const t = e.target;
      if (rootRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
      setSearch("");
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open, disabled]);

  const dropdown =
    open && !disabled && menuBox ? (
      <div
        ref={menuRef}
        className="flex flex-col rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden"
        style={{
          position: "fixed",
          top: menuBox.top,
          left: menuBox.left,
          width: menuBox.width,
          maxHeight: menuBox.maxH,
          zIndex: 10050,
        }}
      >
        <div className="shrink-0 border-b border-gray-100 p-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input
              className="w-full rounded-md border border-gray-200 py-2 pl-8 pr-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={largeList ? "Search code or description…" : "Search..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-500">No option found</p>
          ) : (
            filtered.map((option, index) => (
              <button
                type="button"
                key={`${option.locationKind || "port"}-${option.value}-${index}`}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${option.value === value ? "bg-blue-50 font-medium text-blue-700" : "text-gray-700"}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  setSearch("");
                }}
              >
                {renderSelectOptionContent(option)}
              </button>
            ))
          )}
        </div>
      </div>
    ) : null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        className={`flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white text-left focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          compact ? "px-2.5 py-1.5 text-sm" : "px-3 py-2"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        onMouseDown={(e) => {
          if (disabled) return;
          e.preventDefault();
        }}
        onClick={() => !disabled && setOpen((prev) => !prev)}
      >
        <span
          className={`min-w-0 flex-1 ${hasSelectedDisplay ? "text-gray-800" : "text-gray-500"} ${compact ? "text-sm" : ""}`}
        >
          {selected
            ? renderSelectOptionContent(selected)
            : value
              ? <span className="truncate">{String(value)}</span>
              : placeholder}
        </span>
        <ChevronDown
          size={compact ? 14 : 16}
          className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {required && <input tabIndex={-1} autoComplete="off" value={value} readOnly required className="pointer-events-none absolute h-0 w-0 opacity-0" />}

      {typeof document !== "undefined" && dropdown ? createPortal(dropdown, document.body) : null}
    </div>
  );
}

function FieldLabel({ label, required = false, className = "", hint, children }) {
  return (
    <div className={className}>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {hint ? <p className="text-xs text-slate-500 mb-2">{hint}</p> : null}
      {children}
    </div>
  );
}

function EditableTruckingSection({
  tone,
  title,
  requiredLabel,
  requiredValue,
  onRequiredChange,
  pickupLocation,
  deliveryLocation,
  onPickupChange,
  onDeliveryChange,
  disabled,
  pickupPlaceholders,
  deliveryPlaceholders,
}) {
  const toneMap = {
    amber: {
      cardBorder: "border-amber-100",
      cardHeading: "text-amber-900",
    },
    slate: {
      cardBorder: "border-slate-200",
      cardHeading: "text-slate-900",
    },
  };
  const currentTone = toneMap[tone] || toneMap.slate;

  return (
    <ExtraSection tone={tone} icon={Truck} title={title}>
      <div className="grid grid-cols-1 gap-4">
        <FieldLabel label={requiredLabel}>
          <SearchableSelect
            value={requiredValue}
            onChange={onRequiredChange}
            options={YES_NO_SEARCH_OPTIONS}
            placeholder="Select..."
            className="w-full"
            compact
          />
        </FieldLabel>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TruckingLocationCard
            title="Pickup location"
            borderClass={currentTone.cardBorder}
            headingClass={currentTone.cardHeading}
            location={pickupLocation}
            disabled={disabled}
            onChange={onPickupChange}
            placeholders={pickupPlaceholders}
          />
          <TruckingLocationCard
            title="Delivery location"
            borderClass={currentTone.cardBorder}
            headingClass={currentTone.cardHeading}
            location={deliveryLocation}
            disabled={disabled}
            onChange={onDeliveryChange}
            placeholders={deliveryPlaceholders}
          />
        </div>
      </div>
    </ExtraSection>
  );
}

function TruckingLocationCard({
  title,
  borderClass,
  headingClass,
  location,
  disabled = false,
  onChange,
  placeholders = {},
  showRequired = false,
  inputClassName = extraInputClass,
}) {
  return (
    <div className={`rounded-xl border bg-white p-4 ${borderClass}`}>
      <h5 className={`mb-3 text-sm font-semibold ${headingClass}`}>{title}</h5>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FieldLabel label="Address" required={showRequired} className="md:col-span-2">
          <input
            className={inputClassName}
            value={location.address}
            disabled={disabled}
            required={showRequired}
            onChange={(e) => onChange("address", e.target.value)}
            placeholder={placeholders.address || "Enter address"}
          />
        </FieldLabel>
        <FieldLabel label="City" required={showRequired}>
          <input
            className={inputClassName}
            value={location.city}
            disabled={disabled}
            required={showRequired}
            onChange={(e) => onChange("city", e.target.value)}
            placeholder={placeholders.city || "Enter city"}
          />
        </FieldLabel>
        <FieldLabel label="State" required={showRequired}>
          <input
            className={inputClassName}
            value={location.state}
            disabled={disabled}
            required={showRequired}
            onChange={(e) => onChange("state", e.target.value)}
            placeholder={placeholders.state || "Enter state"}
          />
        </FieldLabel>
        <FieldLabel label="Zipcode" required={showRequired}>
          <input
            className={inputClassName}
            value={location.zipcode}
            disabled={disabled}
            required={showRequired}
            onChange={(e) => onChange("zipcode", e.target.value)}
            placeholder={placeholders.zipcode || "Enter zipcode"}
          />
        </FieldLabel>
      </div>
    </div>
  );
}

function InputReq({ placeholder, value, onChange }) {
  return (
    <input
      required
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
      placeholder={`${placeholder} *`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
