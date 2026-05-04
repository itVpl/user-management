import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import alertify from "alertifyjs";
import "alertifyjs/build/css/alertify.css";
import API_CONFIG from "../../config/api.js";
import { fetchSalesDayList } from "../../services/salesDayAgentService.js";
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
  FileText,
  Paperclip,
  ChevronDown,
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
const CONTAINER_TYPE_OPTIONS = [
  { value: "S20", label: "20FT Standard", image: containerS20 },
  { value: "S40", label: "40FT Standard", image: containerS40 },
  { value: "HC40", label: "40FT High Cube", image: containerHc40 },
  { value: "HC45", label: "45FT High Cube", image: containerHc45 },
];

/** PATCH /:id/extra-details — shipment / customs fields (locations as objects, pickupTime ISO) */
const EXTRA_DETAILS_LABELS = {
  productName: "Product name",
  cargoHazardous: "Cargo hazardous",
  totalCmb: "Total CBM",
  palletizedCargo: "Palletized cargo",
  exactPickupLocation: "Exact pickup location",
  exactDeliveryLocation: "Exact delivery location",
  cargoReadyDate: "Cargo ready date",
  commercialInvoiceValue: "Commercial invoice value",
  hsCode: "HS code",
  customsClearanceOriginRequired: "Customs clearance origin required",
  deliveryLocationType: "Delivery location type",
  targetRateOrTimeline: "Target rate or timeline",
  pickupTime: "Pickup time",
  deliveryTimeAppointment: "Delivery time / appointment",
  specialEquipmentRequired: "Special equipment required",
};

const EXTRA_DETAILS_DISPLAY_KEYS = [
  "productName",
  "cargoHazardous",
  "totalCmb",
  "palletizedCargo",
  "exactPickupLocation",
  "exactDeliveryLocation",
  "cargoReadyDate",
  "commercialInvoiceValue",
  "hsCode",
  "customsClearanceOriginRequired",
  "deliveryLocationType",
  "targetRateOrTimeline",
  "pickupTime",
  "deliveryTimeAppointment",
  "specialEquipmentRequired",
];

function defaultEmptyLocation() {
  return { address: "", city: "", pincode: "" };
}

function cloneDefaultExtraDetailsForm() {
  return {
    productName: "",
    cargoHazardous: "",
    totalCmb: "",
    palletizedCargo: "",
    exactPickupLocation: defaultEmptyLocation(),
    exactDeliveryLocation: defaultEmptyLocation(),
    cargoReadyDate: "",
    commercialInvoiceValue: "",
    hsCode: "",
    customsClearanceOriginRequired: "",
    deliveryLocationType: "",
    targetRateOrTimeline: "",
    pickupTime: "",
    deliveryTimeAppointment: "",
    specialEquipmentRequired: "",
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

function locationHasAnyValue(loc) {
  if (loc == null) return false;
  if (typeof loc === "string") return loc.trim() !== "";
  if (typeof loc === "object") {
    return ["address", "city", "pincode"].some((k) => String(loc[k] ?? "").trim() !== "");
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

function formatLocationForView(loc) {
  if (loc == null) return null;
  if (typeof loc === "string" && loc.trim()) return loc.trim();
  if (typeof loc === "object") {
    const address = (loc.address || "").trim();
    const city = (loc.city || "").trim();
    const pincode = (loc.pincode || "").trim();
    if (!address && !city && !pincode) return null;
    const line2 = [city, pincode].filter(Boolean).join(" ");
    const parts = [address, line2].filter(Boolean);
    return parts.join("\n");
  }
  return null;
}

function hasExtraDetails(detail) {
  if (!detail || typeof detail !== "object") return false;
  if (locationHasAnyValue(detail.exactPickupLocation)) return true;
  if (locationHasAnyValue(detail.exactDeliveryLocation)) return true;
  return EXTRA_DETAILS_DISPLAY_KEYS.some((key) => {
    if (key === "exactPickupLocation" || key === "exactDeliveryLocation") return false;
    const v = detail[key];
    if (v === undefined || v === null) return false;
    if (typeof v === "number" && !Number.isNaN(v)) return true;
    return String(v).trim() !== "";
  });
}

function formatExtraDetailDisplay(key, detail) {
  if (key === "exactPickupLocation") return formatLocationForView(detail.exactPickupLocation);
  if (key === "exactDeliveryLocation") return formatLocationForView(detail.exactDeliveryLocation);

  if (key === "hsCode") {
    const hc = detail.hsCode;
    if (hc === undefined || hc === null || String(hc).trim() === "") return null;
    const key6 = normalizeHsDigits(hc);
    const opt = HS_CODE_OPTIONS.find((o) => o.value === key6);
    return opt ? opt.label : String(hc).trim();
  }

  const raw = detail[key];
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "number" && Number.isNaN(raw)) return null;
  if (typeof raw !== "number" && typeof raw !== "boolean" && String(raw).trim() === "") return null;

  if (key === "cargoReadyDate" || key === "pickupTime") return formatDateTime(raw);

  if (key === "cargoHazardous" || key === "palletizedCargo" || key === "customsClearanceOriginRequired") {
    const s = String(raw).toLowerCase();
    if (s === "yes") return "Yes";
    if (s === "no") return "No";
    return String(raw);
  }
  if (key === "commercialInvoiceValue" || key === "totalCmb") {
    return typeof raw === "number" ? String(raw) : String(raw).trim();
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

  f.exactPickupLocation = normalizeLocationFromApi(detail.exactPickupLocation);
  f.exactDeliveryLocation = normalizeLocationFromApi(detail.exactDeliveryLocation);

  const scalarKeys = [
    "productName",
    "cargoHazardous",
    "totalCmb",
    "palletizedCargo",
    "cargoReadyDate",
    "commercialInvoiceValue",
    "hsCode",
    "customsClearanceOriginRequired",
    "deliveryLocationType",
    "targetRateOrTimeline",
    "pickupTime",
    "deliveryTimeAppointment",
    "specialEquipmentRequired",
  ];

  for (const key of scalarKeys) {
    const v = detail[key];
    if (v === undefined || v === null || v === "") continue;
    if (key === "hsCode") {
      const resolved = resolveHsCodeFormValue(v);
      if (resolved) f.hsCode = resolved;
      continue;
    }
    if (key === "cargoReadyDate" || key === "pickupTime") {
      f[key] = isoToDatetimeLocal(v);
    } else if (key === "totalCmb" || key === "commercialInvoiceValue") {
      f[key] = String(v);
    } else {
      f[key] = String(v);
    }
  }
  return f;
}

function buildExtraDetailsPayload(form) {
  const out = {};

  if (form.productName?.trim()) out.productName = form.productName.trim();
  if (form.cargoHazardous) out.cargoHazardous = form.cargoHazardous;
  if (form.palletizedCargo) out.palletizedCargo = form.palletizedCargo;

  const totalCmb = Number(String(form.totalCmb || "").replace(/,/g, ""));
  if (form.totalCmb !== "" && !Number.isNaN(totalCmb)) out.totalCmb = totalCmb;

  const pickupLoc = buildLocationPayload(form.exactPickupLocation);
  if (pickupLoc) out.exactPickupLocation = pickupLoc;

  const deliveryLoc = buildLocationPayload(form.exactDeliveryLocation);
  if (deliveryLoc) out.exactDeliveryLocation = deliveryLoc;

  if (form.cargoReadyDate) {
    const d = new Date(form.cargoReadyDate);
    if (!Number.isNaN(d.getTime())) out.cargoReadyDate = d.toISOString();
  }

  const inv = Number(String(form.commercialInvoiceValue || "").replace(/,/g, ""));
  if (form.commercialInvoiceValue !== "" && !Number.isNaN(inv)) out.commercialInvoiceValue = inv;

  if (form.hsCode?.trim()) out.hsCode = form.hsCode.trim();
  if (form.customsClearanceOriginRequired) out.customsClearanceOriginRequired = form.customsClearanceOriginRequired;
  if (form.deliveryLocationType?.trim()) out.deliveryLocationType = form.deliveryLocationType.trim();
  if (form.targetRateOrTimeline?.trim()) out.targetRateOrTimeline = form.targetRateOrTimeline.trim();

  if (form.pickupTime) {
    const d = new Date(form.pickupTime);
    if (!Number.isNaN(d.getTime())) out.pickupTime = d.toISOString();
  }

  if (form.deliveryTimeAppointment?.trim()) out.deliveryTimeAppointment = form.deliveryTimeAppointment.trim();
  if (form.specialEquipmentRequired?.trim()) out.specialEquipmentRequired = form.specialEquipmentRequired.trim();

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
  originPort: "",
  destinationPort: "",
  cargoType: "",
  containerType: "",
  weightOrVolume: "",
  expectedDispatchDate: "",
  incoterm: "",
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
  const [extraDetailsRequestId, setExtraDetailsRequestId] = useState("");
  const [extraDetailsForm, setExtraDetailsForm] = useState(() => cloneDefaultExtraDetailsForm());
  const [extraDetailsLoading, setExtraDetailsLoading] = useState(false);
  const [extraDetailsSubmitting, setExtraDetailsSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [attachmentPreviews, setAttachmentPreviews] = useState([]);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: "",
    source: "",
  });

  const authHeaders = useMemo(() => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const canCreateRateRequest = useMemo(() => {
    const user = getUserFromStorage();
    return isSalesDepartment(user) && isEmployeeActiveForHandoff(user) && isSalesDayShiftTiming(user);
  }, []);

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

  useEffect(() => {
    fetchList();
  }, [filters.page, filters.limit, filters.source]);

  useEffect(() => {
    if (showCreate) loadAgents();
  }, [showCreate]);

  useEffect(() => {
    if (selectedId) fetchDetail(selectedId);
  }, [selectedId]);

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
    setFilters((prev) => ({ ...prev, page: 1, search: prev.search }));
    fetchList();
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
    if (!createForm.containerType) {
      alertify.error("Please select a container type");
      return;
    }
    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append("source", createForm.source);
      payload.append("exporterCompany", createForm.exporterCompany.trim());
      payload.append("contactPerson", createForm.contactPerson);
      payload.append("originPort", createForm.originPort);
      payload.append("destinationPort", createForm.destinationPort);
      payload.append("cargoType", createForm.cargoType);
      payload.append("containerType", createForm.containerType);
      if (createForm.expectedDispatchDate) payload.append("expectedDispatchDate", createForm.expectedDispatchDate);
      if (createForm.contactEmail?.trim()) payload.append("contactEmail", createForm.contactEmail.trim());
      if (createForm.contactPhone?.trim()) payload.append("contactPhone", createForm.contactPhone.trim());
      if (createForm.weightOrVolume) payload.append("weightOrVolume", createForm.weightOrVolume);
      if (createForm.incoterm) payload.append("incoterm", createForm.incoterm);
      if (createForm.channelMessageText) payload.append("channelMessageText", createForm.channelMessageText);
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

  const handleViewRequest = async (id) => {
    setSelectedId(id);
    await fetchDetail(id);
    setShowDetailModal(true);
  };

  const openExtraDetailsModal = async (requestId) => {
    setExtraDetailsRequestId(requestId);
    setShowExtraDetailsModal(true);
    setExtraDetailsLoading(true);
    setExtraDetailsForm(cloneDefaultExtraDetailsForm());
    try {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/exporter-rate-requst/${requestId}`, {
        headers: authHeaders,
      });
      const d = res.data?.data;
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
        `${API_CONFIG.BASE_URL}/api/v1/exporter-rate-requst/${extraDetailsRequestId}/extra-details`,
        payload,
        { headers: { ...authHeaders, "Content-Type": "application/json" } },
      );
      alertify.success("Customs details saved");
      setShowExtraDetailsModal(false);
      fetchList();
    } catch (err) {
      alertify.error(err.response?.data?.message || "Failed to save customs details");
    } finally {
      setExtraDetailsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-stretch gap-3">
          <StatCard label="Total" value={totalCount} compact />

          <div className="relative flex-1 min-w-[180px] max-w-lg h-14 min-h-14">
            <input
              type="text"
              placeholder="Search request ID / exporter / route"
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              className="h-full w-full min-h-0 box-border pl-3 pr-9 text-sm leading-none bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 ml-auto shrink-0 min-h-14">
            <SearchableSelect
              value={filters.source}
              onChange={(value) => setFilters((p) => ({ ...p, page: 1, source: value }))}
              options={meta.sources.map((s) => ({ value: s, label: formatStatusLabel(s) }))}
              placeholder="All Source"
              className="min-w-[140px] w-[160px] sm:w-[180px]"
              compact
            />
            <button
              type="button"
              title={
                canCreateRateRequest
                  ? ""
                  : "Only active Sales users on day shift can create rate requests"
              }
              disabled={!canCreateRateRequest}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                canCreateRateRequest
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
              onClick={() => {
                if (!canCreateRateRequest) {
                  alertify.error("Only active day-shift Sales users can create rate requests");
                  return;
                }
                setShowCreate(true);
              }}
            >
              <Plus className="w-4 h-4 shrink-0 opacity-95" />
              Create Rate Request
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Sales Rate Request Inbox</h2>
        {loadingList ? (
          <p className="p-4 text-sm text-gray-500">Loading requests...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border-spacing-0">
              <thead>
                <tr className="bg-[#F1F4F9]">
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base rounded-l-2xl">Request ID</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Exporter</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Route</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Quote Due</th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base rounded-r-2xl">Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((item) => (
                    <tr key={item._id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4 text-sm font-medium text-gray-700">{item.requestId || item._id}</td>
                      <td className="py-4 px-4">
                        <p className="text-sm font-medium text-gray-900">{formatExporterCompany(item.exporterCompany)}</p>
                        <p className="text-xs text-gray-500">{item.contactPerson || "N/A"}</p>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-700">{item.originPort || "-"} to {item.destinationPort || "-"}</td>
                      <td className="py-4 px-4 text-sm text-gray-700">{formatDateTime(item.quoteDueAt)}</td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewRequest(item._id)}
                            className="px-3 py-1 border border-blue-500 text-blue-500 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors inline-flex items-center gap-1"
                          >
                            <Eye size={12} /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => openExtraDetailsModal(item._id)}
                            className="px-3 py-1 border border-violet-500 text-violet-600 rounded-md text-sm font-medium hover:bg-violet-50 transition-colors inline-flex items-center gap-1"
                          >
                            <ClipboardList size={12} /> Customs Details
                          </button>
                        </div>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loadingList && requests.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No requests found</p>
            <p className="text-gray-400 text-sm">Try changing filters or create a new request</p>
          </div>
        )}
      </div>

      {showDetailModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4" onClick={() => setShowDetailModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col border border-gray-200 overflow-auto" onClick={(e) => e.stopPropagation()}>
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
                <button className="text-white/80 hover:text-white text-xl font-bold" onClick={() => setShowDetailModal(false)}>X</button>
              </div>
            </div>

            <div className="p-6 space-y-5 bg-gray-50">
              {loadingDetail ? (
                <p className="text-sm text-gray-500">Loading detail...</p>
              ) : !selectedDetail ? (
                <p className="text-sm text-red-600">Failed to load detail.</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Request ID</p>
                      <p className="mt-1 font-mono text-lg font-bold text-slate-900 break-all">
                        {selectedDetail.requestId || selectedDetail._id || "N/A"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/80 p-5 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Expected dispatch</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {formatDateOnly(selectedDetail.expectedDispatchDate) ?? "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                      Source: <strong className="ml-1">{formatStatusLabel(selectedDetail.source)}</strong>
                    </span>
                  </div>

                  <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-5">
                    <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-blue-900">
                      <FileText size={18} className="text-blue-600" />
                      Exporter details
                    </h4>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <DetailField label="Exporter company" value={formatExporterCompany(selectedDetail.exporterCompany)} />
                      <DetailField label="Contact person" value={selectedDetail.contactPerson} />
                      <DetailField label="Contact email" value={selectedDetail.contactEmail} />
                      <DetailField label="Contact phone" value={selectedDetail.contactPhone} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-5">
                    <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-emerald-900">
                      <Ship size={18} className="text-emerald-600" />
                      Shipment details
                    </h4>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <DetailField label="Origin port" value={selectedDetail.originPort} />
                      <DetailField label="Destination port" value={selectedDetail.destinationPort} />
                      <DetailField label="Cargo type" value={selectedDetail.cargoType} />
                      <DetailField label="Weight / volume" value={selectedDetail.weightOrVolume} />
                      <DetailField label="Incoterm" value={selectedDetail.incoterm} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/80 p-5">
                    <h4 className="mb-4 text-sm font-semibold text-indigo-900">Container type</h4>
                    <ContainerTypeDisplay value={selectedDetail.containerType} />
                  </div>

                  {hasExtraDetails(selectedDetail) && (
                    <div className="rounded-2xl border border-violet-100 bg-violet-50/80 p-5">
                      <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-violet-900">
                        <ClipboardList size={18} className="text-violet-600" />
                        Customs & shipment extras
                      </h4>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {EXTRA_DETAILS_DISPLAY_KEYS.map((key) => {
                          const text = formatExtraDetailDisplay(key, selectedDetail);
                          if (!text) return null;
                          return (
                            <DetailField
                              key={key}
                              label={EXTRA_DETAILS_LABELS[key]}
                              value={text}
                              multiline={
                                key === "targetRateOrTimeline" ||
                                key === "specialEquipmentRequired" ||
                                key === "exactPickupLocation" ||
                                key === "exactDeliveryLocation"
                              }
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {Array.isArray(selectedDetail.internalNotes) && selectedDetail.internalNotes.length > 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <FileText size={18} className="text-slate-600" />
                        Internal notes
                      </h4>
                      <ul className="space-y-3 max-h-56 overflow-y-auto text-sm text-slate-700">
                        {selectedDetail.internalNotes.map((entry, idx) => {
                          const text =
                            entry && typeof entry === "object"
                              ? entry.note ?? entry.text ?? ""
                              : String(entry ?? "");
                          const when =
                            entry && typeof entry === "object" && entry.createdAt
                              ? formatDateTime(entry.createdAt)
                              : null;
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
                    <AttachmentSection attachments={selectedDetail.attachments} flat />
                  </div>
                </>
              )}
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
                <h4 className="text-sm font-semibold text-emerald-800 mb-4">Shipment Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FieldLabel label="Origin Port" required>
                    <InputReq placeholder="Enter origin port" value={createForm.originPort} onChange={(v) => setCreateForm((p) => ({ ...p, originPort: v }))} />
                  </FieldLabel>
                  <FieldLabel label="Destination Port" required>
                    <InputReq placeholder="Enter destination port" value={createForm.destinationPort} onChange={(v) => setCreateForm((p) => ({ ...p, destinationPort: v }))} />
                  </FieldLabel>
                  <FieldLabel label="Cargo type" required>
                    <InputReq placeholder="e.g. FCL" value={createForm.cargoType} onChange={(v) => setCreateForm((p) => ({ ...p, cargoType: v }))} />
                  </FieldLabel>
                  <FieldLabel label="Weight / Volume">
                    <input className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" placeholder="Enter weight or volume" value={createForm.weightOrVolume} onChange={(e) => setCreateForm((p) => ({ ...p, weightOrVolume: e.target.value }))} />
                  </FieldLabel>
                  <FieldLabel label="Incoterm">
                    <SearchableSelect
                      value={createForm.incoterm}
                      onChange={(value) => setCreateForm((p) => ({ ...p, incoterm: value }))}
                      options={INCOTERM_OPTIONS.map((term) => ({ value: term, label: term }))}
                      placeholder="Select Incoterm"
                    />
                  </FieldLabel>
                  <FieldLabel label="Channel Message Text" className="md:col-span-2">
                    <textarea className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" rows={3} placeholder="Enter channel message text" value={createForm.channelMessageText} onChange={(e) => setCreateForm((p) => ({ ...p, channelMessageText: e.target.value }))} />
                  </FieldLabel>
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
                <h4 className="text-sm font-semibold text-indigo-800 mb-4">Container Type</h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {CONTAINER_TYPE_OPTIONS.map((container) => (
                      <button
                        key={container.value}
                        type="button"
                        onClick={() => setCreateForm((p) => ({ ...p, containerType: container.value }))}
                        className={`rounded-xl border overflow-hidden text-left transition-all bg-white ${
                          createForm.containerType === container.value
                            ? "border-blue-500 ring-2 ring-blue-200 shadow-sm"
                            : "border-gray-200 hover:border-blue-300"
                        }`}
                      >
                        <img src={container.image} alt={container.label} className="w-full h-24 object-cover bg-slate-50" />
                        <div className="px-3 py-2">
                          <p className="text-sm font-semibold text-gray-800">{container.label}</p>
                          <p className="text-xs text-gray-500">{container.value}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {!createForm.containerType && (
                    <p className="text-xs text-red-500">Please select a container type.</p>
                  )}
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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col border border-gray-200"
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
                    PATCH extra-details · Request ID optional — fill any fields you have
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
                      <FieldLabel label="Product name">
                        <input
                          className={extraInputClass}
                          value={extraDetailsForm.productName}
                          onChange={(e) => setExtraDetailsForm((p) => ({ ...p, productName: e.target.value }))}
                          placeholder="e.g. Ceramic tiles"
                        />
                      </FieldLabel>
                      <FieldLabel label="Cargo hazardous">
                        <SearchableSelect
                          value={extraDetailsForm.cargoHazardous}
                          onChange={(value) => setExtraDetailsForm((p) => ({ ...p, cargoHazardous: value }))}
                          options={YES_NO_SEARCH_OPTIONS}
                          placeholder="Select…"
                          className="w-full"
                          compact
                        />
                      </FieldLabel>
                      <FieldLabel label="Total CBM">
                        <input
                          type="number"
                          step="any"
                          className={extraInputClass}
                          value={extraDetailsForm.totalCmb}
                          onChange={(e) => setExtraDetailsForm((p) => ({ ...p, totalCmb: e.target.value }))}
                          placeholder="e.g. 42.5"
                        />
                      </FieldLabel>
                      <FieldLabel label="Palletized cargo">
                        <SearchableSelect
                          value={extraDetailsForm.palletizedCargo}
                          onChange={(value) => setExtraDetailsForm((p) => ({ ...p, palletizedCargo: value }))}
                          options={YES_NO_SEARCH_OPTIONS}
                          placeholder="Select…"
                          className="w-full"
                          compact
                        />
                      </FieldLabel>
                    </div>
                  </ExtraSection>

                  <ExtraSection tone="sky" icon={MapPin} title="Pickup location (origin)">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <FieldLabel label="Address" className="md:col-span-3">
                        <input
                          className={extraInputClass}
                          value={extraDetailsForm.exactPickupLocation.address}
                          onChange={(e) =>
                            setExtraDetailsForm((p) => ({
                              ...p,
                              exactPickupLocation: { ...p.exactPickupLocation, address: e.target.value },
                            }))
                          }
                          placeholder="e.g. Plot 12, Mundra road"
                        />
                      </FieldLabel>
                      <FieldLabel label="City">
                        <input
                          className={extraInputClass}
                          value={extraDetailsForm.exactPickupLocation.city}
                          onChange={(e) =>
                            setExtraDetailsForm((p) => ({
                              ...p,
                              exactPickupLocation: { ...p.exactPickupLocation, city: e.target.value },
                            }))
                          }
                          placeholder="e.g. Mundra"
                        />
                      </FieldLabel>
                      <FieldLabel label="Pincode">
                        <input
                          className={extraInputClass}
                          value={extraDetailsForm.exactPickupLocation.pincode}
                          onChange={(e) =>
                            setExtraDetailsForm((p) => ({
                              ...p,
                              exactPickupLocation: { ...p.exactPickupLocation, pincode: e.target.value },
                            }))
                          }
                          placeholder="e.g. 370421"
                        />
                      </FieldLabel>
                    </div>
                  </ExtraSection>

                  <ExtraSection tone="emerald" icon={MapPinned} title="Delivery location (destination)">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <FieldLabel label="Address" className="md:col-span-3">
                        <input
                          className={extraInputClass}
                          value={extraDetailsForm.exactDeliveryLocation.address}
                          onChange={(e) =>
                            setExtraDetailsForm((p) => ({
                              ...p,
                              exactDeliveryLocation: { ...p.exactDeliveryLocation, address: e.target.value },
                            }))
                          }
                          placeholder="e.g. Warehouse gate 3"
                        />
                      </FieldLabel>
                      <FieldLabel label="City">
                        <input
                          className={extraInputClass}
                          value={extraDetailsForm.exactDeliveryLocation.city}
                          onChange={(e) =>
                            setExtraDetailsForm((p) => ({
                              ...p,
                              exactDeliveryLocation: { ...p.exactDeliveryLocation, city: e.target.value },
                            }))
                          }
                          placeholder="e.g. Los Angeles"
                        />
                      </FieldLabel>
                      <FieldLabel label="Pincode">
                        <input
                          className={extraInputClass}
                          value={extraDetailsForm.exactDeliveryLocation.pincode}
                          onChange={(e) =>
                            setExtraDetailsForm((p) => ({
                              ...p,
                              exactDeliveryLocation: { ...p.exactDeliveryLocation, pincode: e.target.value },
                            }))
                          }
                          placeholder="e.g. 90001"
                        />
                      </FieldLabel>
                    </div>
                  </ExtraSection>

                  <ExtraSection tone="amber" icon={Clock3} title="Schedule & timing">
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
                  </ExtraSection>

                  <ExtraSection tone="rose" icon={Receipt} title="Commercial & customs">
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
                  </ExtraSection>

                  <ExtraSection tone="slate" icon={Truck} title="Quotes & equipment">
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
                  </ExtraSection>
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
                {extraDetailsSubmitting ? "Saving…" : "Save customs details"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, danger, success, compact }) {
  return (
    <div
      className={`bg-white border border-gray-200 ${
        compact
          ? "rounded-lg px-3 min-w-[88px] h-14 min-h-14 flex flex-col justify-center shrink-0"
          : "rounded-xl p-3"
      }`}
    >
      <p className={`text-gray-500 ${compact ? "text-[10px] leading-tight" : "text-xs"}`}>{label}</p>
      <p
        className={`font-semibold leading-tight ${compact ? "text-lg mt-0.5" : "text-2xl"} ${
          danger ? "text-red-600" : success ? "text-emerald-600" : "text-gray-800"
        }`}
      >
        {value}
      </p>
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
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter((option) => {
      const lab = String(option.label ?? "").toLowerCase();
      const val = String(option.value ?? "").toLowerCase();
      return lab.includes(q) || val.includes(q);
    });
  }, [options, search]);

  const selected = options.find((option) => option.value === value);
  const displaySelected = selected?.label || (value ? String(value) : "");

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        className={`w-full bg-white border border-gray-300 rounded-lg text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          compact ? "px-2.5 py-1.5 text-sm" : "px-3 py-2"
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        onClick={() => !disabled && setOpen((prev) => !prev)}
      >
        <span
          className={`truncate min-w-0 ${displaySelected ? "text-gray-800" : "text-gray-500"} ${compact ? "text-sm" : ""}`}
        >
          {displaySelected || placeholder}
        </span>
        <ChevronDown
          size={compact ? 14 : 16}
          className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {required && <input tabIndex={-1} autoComplete="off" value={value} readOnly required className="absolute opacity-0 pointer-events-none h-0 w-0" />}

      {open && !disabled && (
        <div
          className={`absolute z-[70] mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden ${
            largeList ? "max-h-[min(70vh,28rem)]" : "max-h-60"
          }`}
        >
          <div className="p-2 border-b border-gray-100 shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={largeList ? "Search code or description…" : "Search..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className={`overflow-auto ${largeList ? "max-h-[min(55vh,22rem)]" : "max-h-44"}`}>
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-500">No option found</p>
            ) : (
              filtered.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${option.value === value ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"}`}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
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
