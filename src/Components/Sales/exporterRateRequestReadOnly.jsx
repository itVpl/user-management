/**
 * Read-only rate request detail UI + formatters shared by ExporterRateRequestWorkflow and AllExporterRR.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import alertify from "alertifyjs";
import "alertifyjs/build/css/alertify.css";
import {
  FileText,
  Paperclip,
  Ship,
  ClipboardList,
  Plus,
  Trash2,
  Banknote,
  Truck,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Scale,
  MapPin,
  Package,
  Calendar,
  Clock,
  Building2,
  X,
  Shield,
  MessageSquare,
  History,
  SendHorizontal,
} from "lucide-react";
import API_CONFIG from "../../config/api.js";
import { getUserFromStorage, isSalesDayShiftTiming } from "../../utils/salesDayAgentEligibility.js";
import { HS_CODE_OPTIONS } from "../../data/hsCodeOptions.js";
import SearchableSelect from "../Dashboard/SearchableSelect.jsx";
import { fetchShippingLineMaster } from "../../services/shippingLineMasterService.js";
import containerS20 from "../../assets/containers/s20.svg";
import containerS40 from "../../assets/containers/s40.svg";
import containerHc40 from "../../assets/containers/hc40.svg";
import containerHc45 from "../../assets/containers/hc45.svg";

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

function getLocationZipcode(loc) {
  if (!loc || typeof loc !== "object") return "";
  return String(loc.zipcode ?? loc.pincode ?? "").trim();
}

function locationHasAnyValue(loc) {
  if (loc == null) return false;
  if (typeof loc === "string") return loc.trim() !== "";
  if (typeof loc === "object") {
    return [loc.address, loc.city, loc.state, getLocationZipcode(loc)].some((v) => String(v ?? "").trim() !== "");
  }
  return false;
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

export function hasExtraDetails(detail) {
  if (!detail || typeof detail !== "object") return false;
  if (locationHasAnyValue(detail.exactPickupLocation)) return true;
  if (locationHasAnyValue(detail.exactDeliveryLocation)) return true;
  return EXTRA_DETAILS_DISPLAY_KEYS.some((key) => {
    if (key === "exactPickupLocation" || key === "exactDeliveryLocation") {
      return false;
    }
    const v = detail[key];
    if (v === undefined || v === null) return false;
    if (typeof v === "number" && !Number.isNaN(v)) return true;
    return String(v).trim() !== "";
  });
}

function normalizeHsDigits(raw) {
  if (raw == null || raw === "") return "";
  return String(raw).replace(/[\s.]/g, "").trim();
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

  if (
    key === "cargoHazardous" ||
    key === "palletizedCargo" ||
    key === "customsClearanceOriginRequired"
  ) {
    const s = String(raw).toLowerCase();
    if (s === "yes") return "Yes";
    if (s === "no") return "No";
    if (s === "true") return "Yes";
    if (s === "false") return "No";
    return String(raw);
  }
  if (key === "commercialInvoiceValue" || key === "totalCmb") {
    return typeof raw === "number" ? String(raw) : String(raw).trim();
  }
  return String(raw).trim();
}

export const formatDateTime = (value) => {
  if (!value) return "N/A";
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? "N/A" : dt.toLocaleString();
};

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

export function formatExporterCompany(exporter) {
  if (exporter == null || exporter === "") return "N/A";
  if (typeof exporter === "object") {
    return exporter.companyName || exporter.customerId || exporter.personName || exporter._id || "N/A";
  }
  return String(exporter);
}

export const formatStatusLabel = (value) => {
  if (!value) return "N/A";
  return STATUS_LABELS[value] || value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

function normalizeQuoteDecisionStatus(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw || raw === "pending") return "offered";
  if (raw.includes("accept") || raw === "approved") return "accepted";
  if (raw.includes("reject") || raw === "declined") return "rejected";
  if (raw.includes("negotiat") || raw.includes("counter")) return "negotiating";
  if (raw.includes("offer")) return "offered";
  return raw;
}

function getQuoteDecisionMeta(value) {
  const normalized = normalizeQuoteDecisionStatus(value);
  if (normalized === "accepted") {
    return {
      value: normalized,
      label: "Accepted",
      badgeClass: "border-green-200 bg-green-50 text-green-700",
    };
  }
  if (normalized === "rejected") {
    return {
      value: normalized,
      label: "Rejected",
      badgeClass: "border-red-200 bg-red-50 text-red-700",
    };
  }
  if (normalized === "negotiating") {
    return {
      value: normalized,
      label: "Negotiating",
      badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }
  if (normalized === "offered") {
    return {
      value: normalized,
      label: "Offered",
      badgeClass: "border-slate-200 bg-slate-50 text-slate-700",
    };
  }
  return {
    value: normalized,
    label: formatStatusLabel(normalized),
    badgeClass: "border-slate-200 bg-slate-50 text-slate-700",
  };
}

function getTimeValue(value) {
  const ms = new Date(value || 0).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function sortQuotesByCreatedAt(list) {
  return [...list].sort((a, b) => getTimeValue(b?.createdAt) - getTimeValue(a?.createdAt));
}

export function getAttachmentUrl(attachment) {
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
}

function isImageAttachment(attachment) {
  const url = getAttachmentUrl(attachment);
  const fileName = attachment?.fileName || attachment?.originalName || attachment?.name || "";
  const text = `${url} ${fileName}`.toLowerCase();
  return [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"].some((ext) => text.includes(ext));
}

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

function hasAnyTruckingRequest(detail) {
  if (!detail || typeof detail !== "object") return false;
  return (
    isYesValue(detail.truckingRequired) ||
    isYesValue(detail.originTruckingRequired) ||
    isYesValue(detail.destinationTruckingRequired)
  );
}

const CONTAINER_TYPE_OPTIONS = [
  { value: "S20", label: "20FT Standard", image: containerS20 },
  { value: "S40", label: "40FT Standard", image: containerS40 },
  { value: "HC40", label: "40FT High Cube", image: containerHc40 },
  { value: "HC45", label: "45FT High Cube", image: containerHc45 },
];

function DetailField({ label, value, multiline }) {
  const display =
    value === undefined || value === null || String(value).trim() === "" ? "N/A" : String(value);
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold text-gray-900 ${multiline ? "whitespace-pre-wrap" : ""}`}>
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
        
        {shouldShowLocations && (
          <div className="grid grid-cols-1 gap-4 md:col-span-2 lg:grid-cols-2">
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

function getAuthTokenFromStorage() {
  return (
    sessionStorage.getItem("authToken") ||
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("token") ||
    ""
  );
}

function buildAuthHeadersFromStorage() {
  const token = getAuthTokenFromStorage();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Fresh employee JWT + cookies on every request (avoid stale empty headers on POST). */
function buildAuthRequestConfig(extraHeaders = {}) {
  const token = getAuthTokenFromStorage();
  return {
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
  };
}

/** GET operation SSL rates for a rate request (detail view), or render embedded quotes from day-shift detail API. */
function OperationSslRatesSection({
  requestId,
  requestData,
  allowEdit = true,
  initialNegotiationQuoteId = null,
  embeddedQuotes = null,
  emptyMessage = null,
}) {
  const useEmbeddedQuotes = embeddedQuotes != null;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(!useEmbeddedQuotes);
  const [err, setErr] = useState(null);
  const [unreadSummaryByQuoteId, setUnreadSummaryByQuoteId] = useState({});
  const [editingQuote, setEditingQuote] = useState(null);
  const [negotiatingQuote, setNegotiatingQuote] = useState(null);
  const autoOpenedThreadRef = useRef("");
  const getAuthConfig = useCallback(() => buildAuthRequestConfig(), []);
  const summaryRequestId = requestData?.requestId || requestId || "";

  const loadRows = useCallback(async () => {
    if (useEmbeddedQuotes) {
      const list = Array.isArray(embeddedQuotes) ? embeddedQuotes : [];
      const sorted = sortQuotesByCreatedAt(list);
      setRows(sorted);
      setErr(null);
      setLoading(false);
      return sorted;
    }
    if (!requestId) {
      setRows([]);
      setLoading(false);
      return [];
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/exporter-rate-requst/${requestId}/operation-ssl-rates`,
        { ...getAuthConfig() },
      );
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      const sorted = sortQuotesByCreatedAt(list);
      setRows(sorted);
      return sorted;
    } catch (e) {
      setErr(e.response?.data?.message || e.message || "Could not load SSL rates");
      setRows([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [embeddedQuotes, getAuthConfig, requestId, useEmbeddedQuotes]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const loadUnreadSummary = useCallback(
    async ({ silent = false } = {}) => {
      if (!summaryRequestId) {
        setUnreadSummaryByQuoteId({});
        return {};
      }
      try {
        const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/exporter-rate-requst/quote-thread-unread-summary`, {
          ...getAuthConfig(),
          params: { requestId: summaryRequestId },
        });
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        const next = list.reduce((acc, entry) => {
          const quoteId = String(entry?.sslQuote || "").trim();
          if (!quoteId) return acc;
          acc[quoteId] = entry;
          return acc;
        }, {});
        setUnreadSummaryByQuoteId(next);
        return next;
      } catch (e) {
        if (!silent) {
          alertify.error(e.response?.data?.message || e.message || "Could not load unread quote messages");
        }
        return {};
      }
    },
    [getAuthConfig, summaryRequestId],
  );

  useEffect(() => {
    void loadUnreadSummary({ silent: true });
  }, [loadUnreadSummary]);

  useEffect(() => {
    if (!summaryRequestId || negotiatingQuote?._id) return undefined;
    const intervalId = setInterval(() => {
      void loadUnreadSummary({ silent: true });
    }, 12000);
    return () => clearInterval(intervalId);
  }, [summaryRequestId, negotiatingQuote?._id, loadUnreadSummary]);

  const fmtAddedBy = (ab) => {
    if (!ab || typeof ab !== "object") return "N/A";
    const name = ab.employeeName || "";
    const id = ab.empId || "";
    const email = ab.email || "";
    const parts = [name && id ? `${name} (${id})` : name || id, email].filter(Boolean);
    return parts.length ? parts.join(" · ") : "N/A";
  };

  const handleQuoteUpdated = useCallback((updatedQuote) => {
    if (!updatedQuote?._id) return;
    setRows((prev) => {
      const next = prev.some((row) => row._id === updatedQuote._id)
        ? prev.map((row) => (row._id === updatedQuote._id ? { ...row, ...updatedQuote } : row))
        : [updatedQuote, ...prev];
      return sortQuotesByCreatedAt(next);
    });
    setNegotiatingQuote((prev) => (prev?._id === updatedQuote._id ? { ...prev, ...updatedQuote } : prev));
  }, []);

  useEffect(() => {
    const targetQuoteId = String(initialNegotiationQuoteId || "").trim();
    if (!targetQuoteId) {
      autoOpenedThreadRef.current = "";
      return;
    }
    const autoOpenKey = `${requestId || ""}:${targetQuoteId}`;
    if (autoOpenedThreadRef.current === autoOpenKey) return;
    const matchedQuote = rows.find((row) => String(row?._id || "").trim() === targetQuoteId);
    if (!matchedQuote) return;
    const unreadSummary = unreadSummaryByQuoteId[matchedQuote._id] || null;
    const mergedQuote = unreadSummary
      ? { ...matchedQuote, ...unreadSummary, decisionStatus: unreadSummary.decisionStatus ?? matchedQuote.decisionStatus }
      : matchedQuote;
    autoOpenedThreadRef.current = autoOpenKey;
    setNegotiatingQuote(mergedQuote);
  }, [initialNegotiationQuoteId, requestId, rows, unreadSummaryByQuoteId]);

  return (
    <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50/90 via-white to-cyan-50/40 p-5 shadow-sm">
      <div className="mb-4">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-teal-950">
          <Banknote size={18} className="text-teal-600" />
          Shipping line rates
        </h4>
        <p className="mt-1 text-xs text-slate-600">
          Each card is one carrier quote. The large amount is the total price; &quot;Initial quote&quot; means operation&apos;s
          first price (not negotiated yet). &quot;Negotiating&quot; means a counter-offer is in progress.
        </p>
      </div>
      {loading && <p className="text-sm text-slate-600">Loading SSL rates…</p>}
      {!loading && err && <p className="text-sm text-red-600">{err}</p>}
      {!loading && !err && rows.length === 0 && (
        <p className="text-sm text-slate-600">
          {emptyMessage || "No SSL rates have been submitted for this request yet."}
        </p>
      )}
      {!loading && !err && rows.length > 0 && (
        <div className="space-y-4">
          {rows.map((r) => {
            const unreadSummary = unreadSummaryByQuoteId[r._id] || null;
            const mergedQuote = unreadSummary ? { ...r, ...unreadSummary, decisionStatus: unreadSummary.decisionStatus ?? r.decisionStatus } : r;
            return (
              <SslQuoteRateCard
                key={r._id}
                quote={mergedQuote}
                allowEdit={allowEdit}
                fmtAddedBy={fmtAddedBy}
                onReview={() => setNegotiatingQuote(mergedQuote)}
                onEdit={() => setEditingQuote(r)}
              />
            );
          })}
        </div>
      )}
      {allowEdit && (
        <GiveRateModal
          open={Boolean(editingQuote)}
          requestId={requestId || ""}
          requestData={requestData}
          authHeaders={buildAuthHeadersFromStorage()}
          initialQuote={editingQuote}
          onClose={() => setEditingQuote(null)}
          onSuccess={async () => {
            await loadRows();
          }}
        />
      )}
      <QuoteDecisionModal
        open={Boolean(negotiatingQuote)}
        requestId={requestId || ""}
        requestData={requestData}
        quote={negotiatingQuote}
        onClose={() => setNegotiatingQuote(null)}
        onQuoteUpdated={handleQuoteUpdated}
      />
    </div>
  );
}

function formatQuoteMoney(currency, amount) {
  if (amount == null || Number.isNaN(Number(amount))) return "N/A";
  return `${currency || ""} ${Number(amount).toLocaleString()}`.trim();
}

/** User-friendly labels for SSL quote cards (avoids confusing "Offered" / "Decision status"). */
function getSslQuoteRatePresentation(quote) {
  const decisionMeta = getQuoteDecisionMeta(quote?.decisionStatus);
  const currency = quote?.currency || "USD";
  const operationQuote = formatQuoteMoney(currency, quote?.totalAmount);
  const pendingCounter = quote?.pendingCounterOffer;
  const counterAmount =
    pendingCounter?.amount != null ? formatQuoteMoney(currency, pendingCounter.amount) : null;

  if (decisionMeta.value === "accepted") {
    return {
      headline: "Agreed rate",
      primaryAmount: operationQuote,
      primaryHint: "Final total accepted for this shipping line",
      statusLabel: "Confirmed",
      statusHint: "This quote is locked in.",
      badgeClass: decisionMeta.badgeClass,
    };
  }
  if (decisionMeta.value === "rejected") {
    return {
      headline: "Declined quote",
      primaryAmount: operationQuote,
      primaryHint: "Last total quoted before this line was declined",
      statusLabel: "Declined",
      statusHint: "This shipping line quote was rejected.",
      badgeClass: decisionMeta.badgeClass,
    };
  }
  if (decisionMeta.value === "negotiating") {
    return {
      headline: counterAmount ? "Counter-offer (in review)" : "Under negotiation",
      primaryAmount: counterAmount || operationQuote,
      primaryHint: counterAmount
        ? `Operation first quoted ${operationQuote} — customer/agent proposed a new price`
        : `Operation quoted ${operationQuote} — negotiation is open`,
      secondaryAmount: counterAmount ? operationQuote : null,
      secondaryLabel: counterAmount ? "Original operation quote" : null,
      statusLabel: "Negotiating",
      statusHint: "Open Review rate to accept, reject, or see counter-offer history.",
      badgeClass: decisionMeta.badgeClass,
    };
  }
  return {
    headline: "Operation quote",
    primaryAmount: operationQuote,
    primaryHint: "First price from operation team — not negotiated yet",
    statusLabel: "Initial quote",
    statusHint: "No counter-offer on this line yet.",
    badgeClass: decisionMeta.badgeClass,
  };
}

function SslQuoteRateCard({ quote, allowEdit, onReview, onEdit, fmtAddedBy }) {
  const presentation = getSslQuoteRatePresentation(quote);
  const decisionMeta = getQuoteDecisionMeta(quote.decisionStatus);
  const isDecisionLocked = decisionMeta.value === "accepted" || decisionMeta.value === "rejected";

  return (
    <div className="overflow-hidden rounded-xl border border-teal-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-teal-50/40 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Shipping line</p>
            <p className="mt-0.5 text-lg font-bold text-slate-900">{quote.sslName || "—"}</p>
            {(quote.sslCode || quote.sslId) && (
              <p className="mt-1 text-xs text-slate-500">
                {[quote.sslCode && `Code: ${quote.sslCode}`, quote.sslId && `ID: ${quote.sslId}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            <p className="mt-2 text-xs text-slate-500">
              Added {formatDateTime(quote.createdAt)}
              {quote.addedBy ? ` · ${fmtAddedBy(quote.addedBy)}` : ""}
            </p>
          </div>
          <div className="shrink-0 rounded-2xl border-2 border-teal-200 bg-white px-4 py-3 text-center shadow-sm sm:min-w-[200px]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-800">{presentation.headline}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-teal-900 sm:text-3xl">
              {presentation.primaryAmount}
            </p>
            <p className="mt-1 text-xs leading-snug text-slate-600">{presentation.primaryHint}</p>
            {presentation.secondaryAmount && (
              <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
                <span className="font-medium text-slate-600">{presentation.secondaryLabel}: </span>
                {presentation.secondaryAmount}
              </p>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${presentation.badgeClass}`}
          >
            {presentation.statusLabel}
          </span>
          <span className="text-xs text-slate-600">{presentation.statusHint}</span>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
          {allowEdit && (
            <>
              <button
                type="button"
                onClick={onReview}
                className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isDecisionLocked
                    ? "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                }`}
              >
                {isDecisionLocked ? "View decision" : "Review rate"}
              </button>
              <button
                type="button"
                onClick={onEdit}
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
              >
                Edit quote
              </button>
            </>
          )}
        </div>
        <div className="mb-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <DetailField label="Valid until" value={formatDateOnly(quote.validityDate) ?? formatDateTime(quote.validityDate)} />
          <DetailField label="Transit time" value={quote.transitDays != null ? `${quote.transitDays} days` : "N/A"} />
          <DetailField label="Remarks" value={quote.remarks} multiline />
        </div>
        <div className="space-y-3">
          <ReadOnlyChargeTable
            title="Freight & fees breakdown"
            rows={quote.lineItems}
            totalAmount={
              quote.baseTotalAmount ??
              calculateLineItemsTotal(Array.isArray(quote.lineItems) ? quote.lineItems : [])
            }
            currency={quote.currency}
          />
          {Array.isArray(quote.truckingLineItems) && quote.truckingLineItems.length > 0 && (
            <ReadOnlyChargeTable
              title="Trucking breakdown"
              rows={quote.truckingLineItems}
              totalAmount={quote.truckingTotalAmount}
              currency={quote.currency}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function getCounterOfferHistoryStatusMeta(status) {
  const key = String(status || "").trim().toLowerCase();
  if (key === "accepted") {
    return { label: "Accepted", badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-800" };
  }
  if (key === "rejected") {
    return { label: "Rejected", badgeClass: "border-red-200 bg-red-50 text-red-800" };
  }
  if (key === "pending") {
    return { label: "Pending", badgeClass: "border-amber-200 bg-amber-50 text-amber-800" };
  }
  return {
    label: key ? formatStatusLabel(key) : "Unknown",
    badgeClass: "border-slate-200 bg-slate-50 text-slate-700",
  };
}

function sortCounterOfferHistory(entries) {
  if (!Array.isArray(entries)) return [];
  return [...entries].sort((a, b) => {
    const ta = new Date(a?.respondedAt || a?.proposedAt || 0).getTime();
    const tb = new Date(b?.respondedAt || b?.proposedAt || 0).getTime();
    return tb - ta;
  });
}

function CounterOfferHistorySection({ entries, currency, loading }) {
  const history = sortCounterOfferHistory(entries);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <History size={18} className="text-indigo-600" />
          <h4 className="text-sm font-semibold text-slate-900">Counter-offer history</h4>
        </div>
        {!loading && history.length > 0 && (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
            {history.length} {history.length === 1 ? "entry" : "entries"}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading history…</p>
      ) : history.length === 0 ? (
        <p className="text-sm text-slate-500">No counter-offers have been recorded yet.</p>
      ) : (
        <ul className="space-y-0">
          {history.map((entry, index) => {
            const statusMeta = getCounterOfferHistoryStatusMeta(entry?.status);
            const amountLabel = formatQuoteMoney(currency, entry?.amount);
            const proposedLabel = entry?.proposedAt ? formatDateTime(entry.proposedAt) : null;
            const respondedLabel = entry?.respondedAt ? formatDateTime(entry.respondedAt) : null;
            const entryKey = entry?._id || `${entry?.proposedAt || "row"}-${index}`;

            return (
              <li key={entryKey} className="relative flex gap-4 pb-5 last:pb-0">
                {index < history.length - 1 && (
                  <span
                    className="absolute left-[11px] top-6 bottom-0 w-px bg-slate-200"
                    aria-hidden
                  />
                )}
                <span
                  className={`relative z-[1] mt-1 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 bg-white ${
                    entry?.status === "accepted"
                      ? "border-emerald-400"
                      : entry?.status === "rejected"
                        ? "border-red-400"
                        : "border-amber-400"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      entry?.status === "accepted"
                        ? "bg-emerald-500"
                        : entry?.status === "rejected"
                          ? "bg-red-500"
                          : "bg-amber-500"
                    }`}
                  />
                </span>
                <div className="min-w-0 flex-1 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-lg font-bold tracking-tight text-slate-900">{amountLabel}</p>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusMeta.badgeClass}`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>
                  <dl className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                    {proposedLabel && (
                      <div>
                        <dt className="font-medium uppercase tracking-wide text-slate-400">Proposed</dt>
                        <dd className="mt-0.5 font-medium text-slate-700">{proposedLabel}</dd>
                      </div>
                    )}
                    {respondedLabel && (
                      <div>
                        <dt className="font-medium uppercase tracking-wide text-slate-400">Responded</dt>
                        <dd className="mt-0.5 font-medium text-slate-700">{respondedLabel}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function QuoteDecisionModal({ open, onClose, requestId, requestData, quote, onQuoteUpdated }) {
  const [refreshing, setRefreshing] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState("");
  const [counterOffer, setCounterOffer] = useState(null);
  const [counterOfferLoading, setCounterOfferLoading] = useState(false);
  const [counterOfferErr, setCounterOfferErr] = useState(null);
  const getAuthConfig = useCallback(() => buildAuthRequestConfig(), []);
  const quoteId = quote?._id || "";

  const loadCounterOffer = useCallback(
    async ({ silent = false } = {}) => {
      if (!requestId || !quoteId) {
        setCounterOffer(null);
        return null;
      }
      if (!silent) setCounterOfferLoading(true);
      setCounterOfferErr(null);
      try {
        const res = await axios.get(
          `${API_CONFIG.BASE_URL}/api/v1/exporter-rate-requst/${requestId}/operation-ssl-rates/${quoteId}/counter-offer`,
          getAuthConfig(),
        );
        const data = res.data?.data ?? null;
        setCounterOffer(data);
        return data;
      } catch (err) {
        const message = err.response?.data?.message || "Failed to load counter-offer details";
        setCounterOfferErr(message);
        if (!silent) alertify.error(message);
        return null;
      } finally {
        if (!silent) setCounterOfferLoading(false);
      }
    },
    [getAuthConfig, requestId, quoteId],
  );

  useEffect(() => {
    if (!open || !quoteId) {
      setCounterOffer(null);
      setCounterOfferErr(null);
      setCounterOfferLoading(false);
      return;
    }
    void loadCounterOffer();
  }, [open, quoteId, requestId, loadCounterOffer]);

  const refreshQuote = useCallback(
    async ({ silent = false } = {}) => {
      if (!requestId || !quote?._id) return null;
      if (!silent) setRefreshing(true);
      try {
        const res = await axios.get(
          `${API_CONFIG.BASE_URL}/api/v1/exporter-rate-requst/${requestId}/operation-ssl-rates`,
          getAuthConfig(),
        );
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        const updatedQuote = list.find((item) => item?._id === quote._id) || null;
        if (updatedQuote) {
          onQuoteUpdated?.(updatedQuote);
        }
        return updatedQuote;
      } catch (err) {
        if (!silent) {
          alertify.error(err.response?.data?.message || "Failed to refresh quote");
        }
        return null;
      } finally {
        if (!silent) setRefreshing(false);
      }
    },
    [getAuthConfig, onQuoteUpdated, quote?._id, requestId],
  );

  const handleRefreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadCounterOffer({ silent: true }), refreshQuote({ silent: true })]);
    } finally {
      setRefreshing(false);
    }
  }, [loadCounterOffer, refreshQuote]);

  const handleCounterOfferDecision = useCallback(
    async (decision) => {
      const nextDecision = decision === "rejected" ? "rejected" : "accepted";
      if (!requestId || !quoteId) {
        alertify.error("Missing quote details");
        return;
      }
      const token = getAuthTokenFromStorage();
      if (!token) {
        alertify.error("Employee authentication required. Please log in again.");
        return;
      }
      setSubmittingDecision(nextDecision);
      try {
        const res = await axios.post(
          `${API_CONFIG.BASE_URL}/api/v1/exporter-rate-requst/${requestId}/operation-ssl-rates/${quoteId}/counter-offer/${nextDecision === "accepted" ? "accept" : "reject"}`,
          {},
          getAuthConfig(),
        );
        const updated = res.data?.data;
        if (updated) {
          onQuoteUpdated?.({ ...quote, ...updated });
        }
        alertify.success(
          res.data?.message ||
            (nextDecision === "accepted" ? "Counter-offer accepted" : "Counter-offer rejected"),
        );
        await loadCounterOffer({ silent: true });
        await refreshQuote({ silent: true });
      } catch (err) {
        alertify.error(err.response?.data?.message || "Failed to update counter-offer");
      } finally {
        setSubmittingDecision("");
      }
    },
    [getAuthConfig, loadCounterOffer, onQuoteUpdated, quote, quoteId, refreshQuote, requestId],
  );

  if (!open || !quote) return null;

  const displayCurrency = counterOffer?.currency || quote.currency || "";
  const sslQuotedAmount = counterOffer?.totalAmount ?? quote.totalAmount;
  const pendingCounter = counterOffer?.pendingCounterOffer;
  const pendingCounterActive = Boolean(counterOffer?.pendingCounterOfferActive && pendingCounter?.amount != null);
  const canRespondToCounterOffer = Boolean(counterOffer?.canRespondToCounterOffer);
  const decisionStatus = counterOffer?.decisionStatus ?? quote.decisionStatus;
  const decisionMeta = getQuoteDecisionMeta(decisionStatus);
  const quoteAmount = formatQuoteMoney(displayCurrency, sslQuotedAmount);
  const counterOfferAmount =
    pendingCounter?.amount != null ? formatQuoteMoney(displayCurrency, pendingCounter.amount) : null;
  const primaryAmountLabel = pendingCounterActive ? "Customer counter offer" : "Offered amount";
  const primaryAmount = pendingCounterActive ? counterOfferAmount : quoteAmount;
  const showCounterOfferActions = canRespondToCounterOffer && !counterOfferLoading;
  const hasPendingAction = Boolean(submittingDecision) || counterOfferLoading;
  const snapshotAmount = pendingCounterActive ? counterOfferAmount : quoteAmount;
  const shipmentLabel = requestData?.shipmentType || requestData?.cargoType || "Shipment";
  const validityLabel = formatDateOnly(quote.validityDate) ?? "N/A";
  const transitLabel = quote.transitDays != null ? `${quote.transitDays} days` : "N/A";
  const addedByLabel = (() => {
    const ab = quote.addedBy;
    if (!ab || typeof ab !== "object") return null;
    const name = ab.employeeName || "";
    const id = ab.empId || "";
    if (name && id) return `${name} (${id})`;
    return name || id || null;
  })();
  const lastUpdatedLabel =
    formatDateTime(pendingCounter?.proposedAt || counterOffer?.updatedAt || quote.updatedAt || quote.createdAt) ||
    "N/A";
  const counterOfferStatusLabel =
    counterOffer?.counterOfferStatus != null
      ? formatStatusLabel(String(counterOffer.counterOfferStatus))
      : null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/55 p-3 backdrop-blur-[2px] sm:p-4"
      onClick={() => !hasPendingAction && onClose()}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_24px_80px_-12px_rgba(15,23,42,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 bg-[#1e293b] px-5 py-4 text-white sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                  <Scale size={22} className="text-indigo-200" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Rate review</p>
                  <h3 className="mt-0.5 truncate text-lg font-semibold tracking-tight sm:text-xl">Review offered rate</h3>
                  <p className="mt-1 truncate text-sm text-slate-300">
                    {quote.sslName || "Shipping line"} · {requestData?.requestId || requestId}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => void handleRefreshAll()}
                disabled={refreshing || Boolean(submittingDecision)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                title="Refresh quote"
              >
                <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={hasPendingAction}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Close"
              >
                <X size={18} />
              </button>
              </div>
            </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-[#f8fafc] p-4 sm:p-5">
            <div className="space-y-5">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{primaryAmountLabel}</p>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                      {counterOfferStatusLabel && pendingCounterActive && (
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                          {counterOfferStatusLabel}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${decisionMeta.badgeClass}`}
                      >
                        {decisionMeta.label}
                      </span>
                    </div>
                  </div>
                  {counterOfferLoading ? (
                    <p className="mt-3 text-sm text-slate-500">Loading counter-offer details…</p>
                  ) : counterOfferErr && !counterOffer ? (
                    <p className="mt-3 text-sm text-red-600">{counterOfferErr}</p>
                  ) : (
                    <>
                      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{primaryAmount}</p>
                      {pendingCounterActive && quoteAmount !== "N/A" && (
                        <p className="mt-2 text-sm text-slate-600">
                          SSL quoted: <span className="font-semibold text-slate-900">{quoteAmount}</span>
                        </p>
                      )}
                      <p className="mt-1 text-sm text-slate-500">
                        {pendingCounterActive
                          ? "Customer has proposed this amount for your review"
                          : "Total quoted by the shipping line for this request"}
                      </p>
                      {pendingCounterActive && pendingCounter?.proposedAt && (
                        <p className="mt-1 text-xs text-slate-400">
                          Proposed {formatDateTime(pendingCounter.proposedAt)}
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-px bg-slate-100 sm:grid-cols-3">
                  <div className="flex items-start gap-3 bg-white px-4 py-3.5 sm:px-5">
                    <Calendar size={16} className="mt-0.5 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Valid until</p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-900">{validityLabel}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-white px-4 py-3.5 sm:px-5">
                    <Clock size={16} className="mt-0.5 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Transit</p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-900">{transitLabel}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-white px-4 py-3.5 sm:px-5">
                    <Building2 size={16} className="mt-0.5 shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Provider</p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{quote.sslName || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {showCounterOfferActions ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-col gap-1 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-base font-semibold text-slate-900">Your decision</h4>
                      <p className="mt-1 text-sm text-slate-500">
                        Accept the customer counter-offer, or reject to allow a new amount.
                      </p>
                    </div>
                    {pendingCounterActive && (
                      <span className="mt-2 inline-flex w-fit items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 sm:mt-0">
                        Counter-offer pending
                      </span>
                    )}
                  </div>
                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={Boolean(submittingDecision)}
                      onClick={() => void handleCounterOfferDecision("accepted")}
                      className="flex items-center gap-3 rounded-xl border-2 border-emerald-400 bg-white px-4 py-4 text-left transition-colors hover:bg-emerald-50/40 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submittingDecision === "accepted" ? (
                        <RefreshCw size={22} className="shrink-0 animate-spin text-emerald-600" />
                      ) : (
                        <CheckCircle2 size={22} className="shrink-0 text-emerald-600" />
                      )}
                      <div>
                        <span className="block text-sm font-semibold text-emerald-700">
                          {submittingDecision === "accepted" ? "Accepting..." : "Accept"}
                        </span>
                        <span className="mt-0.5 block text-xs text-emerald-600/80">
                          Accept counter-offer and update quote total
                        </span>
                      </div>
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(submittingDecision)}
                      onClick={() => void handleCounterOfferDecision("rejected")}
                      className="flex items-center gap-3 rounded-xl border-2 border-red-400 bg-white px-4 py-4 text-left transition-colors hover:bg-red-50/40 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submittingDecision === "rejected" ? (
                        <RefreshCw size={22} className="shrink-0 animate-spin text-red-600" />
                      ) : (
                        <XCircle size={22} className="shrink-0 text-red-600" />
                      )}
                      <div>
                        <span className="block text-sm font-semibold text-red-700">
                          {submittingDecision === "rejected" ? "Rejecting..." : "Reject"}
                        </span>
                        <span className="mt-0.5 block text-xs text-red-600/80">
                          Reject counter-offer; agent may submit a new amount
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                !counterOfferLoading &&
                counterOffer && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                    No counter-offer is pending your response.
                  </div>
                )
              )}

              <CounterOfferHistorySection
                entries={counterOffer?.counterOfferHistory}
                currency={displayCurrency}
                loading={counterOfferLoading}
              />

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Banknote size={18} className="text-indigo-600" />
                  <h4 className="text-sm font-semibold text-slate-900">Charge breakdown</h4>
                </div>
                <div className="space-y-4">
                <ReadOnlyChargeTable
                  variant="modal"
                  title="SSL charges"
                  rows={quote.lineItems}
                  totalAmount={quote.baseTotalAmount ?? calculateLineItemsTotal(Array.isArray(quote.lineItems) ? quote.lineItems : [])}
                  currency={quote.currency}
                />
                <ReadOnlyChargeTable
                  variant="modal"
                  title="Trucking charges"
                  rows={quote.truckingLineItems}
                  totalAmount={quote.truckingTotalAmount}
                  currency={quote.currency}
                />
                </div>
              </div>

              {quote.remarks && String(quote.remarks).trim() !== "" && (
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-slate-500" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Remarks</p>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{quote.remarks}</p>
                </div>
              )}
            </div>
          </div>

        <aside className="w-full shrink-0 border-t border-slate-200 bg-[#f8fafc] lg:w-[300px] lg:border-l lg:border-t-0">
          <div className="max-h-[40vh] overflow-y-auto p-4 lg:max-h-none lg:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">• Context</p>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-center gap-2 text-slate-900">
                <Package size={16} className="text-slate-500" />
                <h4 className="text-sm font-semibold">Shipment</h4>
              </div>
              <dl className="mt-3 space-y-3">
                {[
                  ["Request", requestData?.requestId || requestId],
                  ["Route", `${requestData?.originPort || "—"} → ${requestData?.destinationPort || "—"}`],
                  ["Cargo", requestData?.cargoType || shipmentLabel],
                  ["Container", requestData?.containerType || "—"],
                  ["Weight / vol.", requestData?.weightOrVolume || "—"],
                ].map(([dt, dd]) => (
                  <div key={dt}>
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{dt}</dt>
                    <dd className="mt-0.5 text-sm font-medium text-slate-900">{dd}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
              <div className="flex items-center gap-2 text-indigo-950">
                <MapPin size={16} className="text-indigo-500" />
                <h4 className="text-sm font-semibold">Offer snapshot</h4>
              </div>
              <dl className="mt-3 space-y-3">
                {[
                  ["Amount", snapshotAmount || quoteAmount],
                  ["Status", decisionMeta.label],
                  ["Transit", transitLabel],
                  ["Valid till", validityLabel],
                ].map(([dt, dd]) => (
                  <div key={dt}>
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-indigo-400/90">{dt}</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-indigo-950">
                      {dt === "Status" ? (
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${decisionMeta.badgeClass}`}>
                          {dd}
                        </span>
                      ) : (
                        dd
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              {addedByLabel && (
                <p className="mt-4 border-t border-indigo-200/60 pt-3 text-xs text-indigo-700">Submitted by {addedByLabel}</p>
              )}
            </div>

            {showCounterOfferActions && (
              <button
                type="button"
                onClick={onClose}
                disabled={Boolean(submittingDecision)}
                className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 lg:hidden"
              >
                Close
              </button>
            )}
          </div>
        </aside>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Shield size={14} className="shrink-0 text-slate-400" />
            All data is secure and confidential
          </span>
          <span className="shrink-0 text-slate-500">Last updated: {lastUpdatedLabel}</span>
        </div>
      </div>
    </div>
  );
}

const CLOSED_EXPORTER_RATE_REQUEST_STATUSES = new Set(["won", "lost", "closed_no_response"]);

export function isClosedExporterRateRequestStatus(status) {
  return CLOSED_EXPORTER_RATE_REQUEST_STATUSES.has(String(status ?? "").trim().toLowerCase());
}

function getOwnerRatesReviewStatusLabel(status) {
  const key = String(status ?? "").trim().toLowerCase();
  if (key === "pending") return "Pending";
  if (key === "confirmed") return "Confirmed";
  if (key === "rejected") return "Rejected";
  if (!key) return "—";
  return formatStatusLabel(key);
}

export function getOwnerRatesReviewStatus(detail) {
  return String(detail?.ownerRatesReviewStatus ?? detail?.ownerRatesReview?.status ?? "").trim().toLowerCase();
}

function getCurrentEmployeeEmpId(user) {
  return String(
    user?.empId || sessionStorage.getItem("empId") || localStorage.getItem("empId") || "",
  ).trim();
}

export function isCurrentUserRateRequestOwner(detail, user) {
  if (!detail?.ownerId || !user) return false;
  const owner = detail.ownerId;
  if (typeof owner !== "object") return false;
  const myEmp = getCurrentEmployeeEmpId(user);
  const ownerEmp = String(owner.empId || "").trim();
  if (myEmp && ownerEmp && myEmp === ownerEmp) return true;
  const myId = String(user._id || user.id || "").trim();
  const ownerMongo = String(owner._id || "").trim();
  return Boolean(myId && ownerMongo && myId === ownerMongo);
}

export function canOwnerActOnForwardedRates(detail, user = getUserFromStorage()) {
  if (!detail?.forwardedToOwner?.isForwarded) return false;
  if (!isSalesDayShiftTiming(user)) return false;
  if (!isCurrentUserRateRequestOwner(detail, user)) return false;
  const status = getOwnerRatesReviewStatus(detail);
  return !status || status === "pending";
}

/** Day-shift owner: confirm or reject operation rates after forward */
export function OwnerRatesReviewActions({ detail, onSuccess }) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState("");
  const user = getUserFromStorage();
  const requestIdentifier = detail?.requestId || detail?._id || "";
  const reviewStatus = getOwnerRatesReviewStatus(detail);
  const canAct = canOwnerActOnForwardedRates(detail, user);
  const isPending = !reviewStatus || reviewStatus === "pending";

  if (!detail?.forwardedToOwner?.isForwarded) return null;

  const handleConfirm = async () => {
    if (!requestIdentifier || submitting) return;
    setSubmitting("confirm");
    try {
      const safeId = encodeURIComponent(requestIdentifier);
      const body = note.trim() ? { note: note.trim() } : {};
      const res = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/sales-day-agent/rate-requests/${safeId}/confirm-rates`,
        body,
        buildAuthRequestConfig(),
      );
      alertify.success(res.data?.message || "Rates confirmed successfully.");
      setNote("");
      onSuccess?.(res.data?.data || null);
    } catch (err) {
      alertify.error(err.response?.data?.message || "Failed to confirm rates");
    } finally {
      setSubmitting("");
    }
  };

  const handleReject = async () => {
    if (!requestIdentifier || submitting) return;
    if (!note.trim()) {
      alertify.error("A note is required when rejecting rates.");
      return;
    }
    setSubmitting("reject");
    try {
      const safeId = encodeURIComponent(requestIdentifier);
      const res = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/sales-day-agent/rate-requests/${safeId}/reject-rates`,
        { note: note.trim() },
        buildAuthRequestConfig(),
      );
      alertify.success(res.data?.message || "Rates rejected.");
      setNote("");
      onSuccess?.(res.data?.data || null);
    } catch (err) {
      alertify.error(err.response?.data?.message || "Failed to reject rates");
    } finally {
      setSubmitting("");
    }
  };

  if (!isPending) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h4 className="mb-2 text-sm font-semibold text-slate-900">Review & confirm — your decision</h4>
        <p className="text-sm text-slate-700">
          <span className="font-medium text-slate-900">Status: </span>
          {getOwnerRatesReviewStatusLabel(reviewStatus)}
          {detail.ownerRatesReview?.reviewedAt
            ? ` · ${formatDateTime(detail.ownerRatesReview.reviewedAt)}`
            : ""}
        </p>
        {detail.ownerRatesReview?.note && String(detail.ownerRatesReview.note).trim() ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
            <span className="font-medium text-slate-700">Note: </span>
            {detail.ownerRatesReview.note}
          </p>
        ) : null}
      </div>
    );
  }

  if (!canAct) {
    const ownerLabel = formatOwnerRef(detail.ownerId) || "the assigned owner";
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm">
        <h4 className="mb-2 text-sm font-semibold text-amber-950">Review & confirm — pending</h4>
        <p className="text-sm text-amber-900">
          <span className="font-medium">Status: Pending</span>
          {" — "}
          Waiting for {ownerLabel} (day-shift owner) to confirm or reject these rates.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50/90 to-white p-5 shadow-sm">
      <h4 className="text-sm font-semibold text-indigo-950">Review & confirm rates</h4>
      <p className="mt-1 text-xs font-medium text-amber-800">Status: Pending — no decision yet</p>
      <p className="mt-1 text-xs text-slate-600">
        Confirm to approve operation&apos;s rates, or reject so operation can revise and forward again.
      </p>
      <label className="mt-3 block text-xs font-medium text-slate-600">
        Note <span className="font-normal text-slate-400">(optional for confirm, required for reject)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="e.g. Approved — share with customer"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          disabled={Boolean(submitting)}
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={Boolean(submitting)}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 size={16} />
          {submitting === "confirm" ? "Confirming…" : "Confirm rates"}
        </button>
        <button
          type="button"
          onClick={() => void handleReject()}
          disabled={Boolean(submitting)}
          className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <XCircle size={16} />
          {submitting === "reject" ? "Rejecting…" : "Reject rates"}
        </button>
      </div>
    </div>
  );
}

const FORWARD_TO_OWNER_BLOCK_MESSAGES = {
  no_ssl_quotes: "Add at least one operation SSL rate before forwarding to the owner.",
  awaiting_owner_review: "Rates are with the owner — waiting for confirm or reject.",
  owner_confirmed_rates:
    "Owner confirmed the last forward. Add a new SSL quote after that forward to forward again.",
  closed_rate_request: "Cannot forward on a closed rate request (won / lost / closed).",
};

function pickForwardMetaFields(source) {
  if (!source || typeof source !== "object") return null;
  const hasFlag =
    typeof source.canForwardToOwner === "boolean" ||
    source.forwardToOwnerBlockReason != null ||
    source.hasNewSslQuotesSinceForward != null ||
    source.operationSslQuoteCount != null;
  if (!hasFlag) return null;
  return {
    canForwardToOwner: source.canForwardToOwner,
    forwardToOwnerBlockReason: source.forwardToOwnerBlockReason ?? null,
    hasNewSslQuotesSinceForward: source.hasNewSslQuotesSinceForward,
    newSslQuotesSinceForwardCount: source.newSslQuotesSinceForwardCount,
    operationSslQuoteCount: source.operationSslQuoteCount,
    forwardedToOwner: source.forwardedToOwner,
    ownerRatesReview: source.ownerRatesReview,
    ownerRatesReviewStatus: source.ownerRatesReviewStatus,
  };
}

/** Forward meta from GET detail, forward POST, or add/update SSL quote POST. */
export function extractForwardMetaFromApiResponse(res) {
  const body = res?.data;
  if (!body || typeof body !== "object") return null;
  return (
    pickForwardMetaFields(body.data) ||
    pickForwardMetaFields(body.rateRequest) ||
    pickForwardMetaFields(body)
  );
}

export function mergeForwardMetaIntoDetail(prev, patch) {
  if (!patch) return prev;
  if (!prev) return { ...patch };
  const next = { ...prev, ...patch };
  if (patch.forwardedToOwner !== undefined) next.forwardedToOwner = patch.forwardedToOwner;
  if (patch.ownerRatesReview !== undefined) next.ownerRatesReview = patch.ownerRatesReview;
  if (patch.ownerRatesReviewStatus !== undefined) next.ownerRatesReviewStatus = patch.ownerRatesReviewStatus;
  if (patch.operationSslQuotes !== undefined) next.operationSslQuotes = patch.operationSslQuotes;
  return next;
}

/** Client fallback when GET omits canForwardToOwner (older API). */
export function canForwardRatesToOwner(detail) {
  if (!detail || isClosedExporterRateRequestStatus(detail.status)) return false;
  if (!detail.forwardedToOwner?.isForwarded) {
    const count = Number(detail.operationSslQuoteCount);
    if (Number.isFinite(count) && count < 1) return false;
    return true;
  }
  if (detail.hasNewSslQuotesSinceForward === true) return true;
  return getOwnerRatesReviewStatus(detail) === "rejected";
}

/** Prefer server flag from GET / POST forward-to-owner response. */
export function resolveCanForwardToOwner(detail) {
  if (detail && typeof detail.canForwardToOwner === "boolean") {
    return detail.canForwardToOwner;
  }
  return canForwardRatesToOwner(detail);
}

export function getForwardToOwnerBlockReason(detail) {
  const reason = String(detail?.forwardToOwnerBlockReason ?? "").trim();
  if (reason) return reason;
  if (!detail) return "";
  if (isClosedExporterRateRequestStatus(detail.status)) return "closed_rate_request";
  const count = Number(detail.operationSslQuoteCount);
  if (Number.isFinite(count) && count < 1) return "no_ssl_quotes";
  if (detail.forwardedToOwner?.isForwarded) {
    if (detail.hasNewSslQuotesSinceForward === true) return "";
    const review = getOwnerRatesReviewStatus(detail);
    if (review === "confirmed") return "owner_confirmed_rates";
    if (review === "pending" || !review) return "awaiting_owner_review";
  }
  return "";
}

export function getForwardToOwnerBlockMessage(detail) {
  const reason = getForwardToOwnerBlockReason(detail);
  if (reason && FORWARD_TO_OWNER_BLOCK_MESSAGES[reason]) {
    return FORWARD_TO_OWNER_BLOCK_MESSAGES[reason];
  }
  return null;
}

function getForwardToOwnerButtonLabel({ forwarding, canForward, blockReason, hasNewQuotesSinceForward }) {
  if (forwarding) return "Forwarding…";
  if (canForward && hasNewQuotesSinceForward) return "Forward again";
  if (canForward) return "Forward to owner";
  if (blockReason === "no_ssl_quotes") return "Add SSL rates first";
  if (blockReason === "awaiting_owner_review") return "Awaiting owner review";
  if (blockReason === "owner_confirmed_rates") return "Owner confirmed";
  if (blockReason === "closed_rate_request") return "Request closed";
  return "Forward unavailable";
}

/** Operation team: POST forward SSL rates to day-shift owner for review */
export function ForwardToOwnerPanel({ detail, authHeaders, onSuccess }) {
  const [forwarding, setForwarding] = useState(false);
  const requestIdentifier = detail?.requestId || detail?._id || "";
  const forwarded = detail?.forwardedToOwner;
  const review = detail?.ownerRatesReview;
  const canForward = resolveCanForwardToOwner(detail);
  const blockReason = getForwardToOwnerBlockReason(detail);
  const blockMessage = getForwardToOwnerBlockMessage(detail);
  const sslQuoteCount = Number(detail?.operationSslQuoteCount);
  const showSslQuoteCount = Number.isFinite(sslQuoteCount);
  const hasNewQuotesSinceForward = detail?.hasNewSslQuotesSinceForward === true;
  const newQuotesCount = Number(detail?.newSslQuotesSinceForwardCount);
  const showNewQuotesCount = hasNewQuotesSinceForward && Number.isFinite(newQuotesCount) && newQuotesCount > 0;

  const handleForward = async () => {
    if (!requestIdentifier || forwarding || !canForward) return;
    setForwarding(true);
    try {
      const safeId = encodeURIComponent(requestIdentifier);
      const res = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/exporter-rate-requst/${safeId}/forward-to-owner`,
        {},
        buildAuthRequestConfig(authHeaders),
      );
      alertify.success(res.data?.message || "Rates forwarded to the rate request owner successfully.");
      onSuccess?.(res.data?.data || null);
    } catch (err) {
      alertify.error(err.response?.data?.message || "Failed to forward rates to owner");
    } finally {
      setForwarding(false);
    }
  };

  return (
    <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/90 to-blue-50/60 p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
            <SendHorizontal size={18} className="text-indigo-600" />
            Forward rates to owner
          </h4>
          <p className="mt-1 text-xs text-slate-600">
            Send operation SSL rates to the day-shift sales owner ({formatOwnerRef(detail?.ownerId) || "owner"}) for
            review. At least one SSL quote is required.
          </p>
          {showSslQuoteCount && (
            <p className="mt-2 text-xs text-slate-600">
              <span className="font-medium text-slate-500">SSL quotes on request:</span> {sslQuoteCount}
              {showNewQuotesCount ? (
                <span className="text-emerald-700">
                  {" "}
                  · {newQuotesCount} new since last forward
                </span>
              ) : null}
            </p>
          )}
          {forwarded?.isForwarded && (
            <div className="mt-3 space-y-1 text-xs text-slate-700">
              <p>
                <span className="font-medium text-slate-500">Forwarded:</span>{" "}
                {formatDateTime(forwarded.forwardedAt)}
                {forwarded.forwardedBy ? ` · ${formatOwnerRef(forwarded.forwardedBy)}` : ""}
              </p>
              {(review?.status || detail.ownerRatesReviewStatus) && (
                <p>
                  <span className="font-medium text-slate-500">Owner review:</span>{" "}
                  {getOwnerRatesReviewStatusLabel(review?.status ?? detail.ownerRatesReviewStatus)}
                  {review?.reviewedAt ? ` · ${formatDateTime(review.reviewedAt)}` : ""}
                </p>
              )}
              {review?.note && String(review.note).trim() ? (
                <p className="whitespace-pre-wrap text-slate-600">{review.note}</p>
              ) : null}
            </div>
          )}
          {!canForward && blockMessage && (
            <p
              className={`mt-2 text-xs font-medium ${
                blockReason === "owner_confirmed_rates" || blockReason === "closed_rate_request"
                  ? "text-amber-900"
                  : blockReason === "no_ssl_quotes"
                    ? "text-red-700"
                    : "text-indigo-800"
              }`}
            >
              {blockMessage}
            </p>
          )}
          {canForward && hasNewQuotesSinceForward && (
            <p className="mt-2 text-xs font-medium text-emerald-800">
              New SSL quote(s) were added after the last forward — you can forward again. Owner review will reset
              to pending.
            </p>
          )}
          {canForward &&
            !hasNewQuotesSinceForward &&
            forwarded?.isForwarded &&
            getOwnerRatesReviewStatus(detail) === "rejected" && (
              <p className="mt-2 text-xs font-medium text-emerald-800">
                Owner rejected the last forward — revise SSL quotes if needed, then forward again.
              </p>
            )}
        </div>
        <button
          type="button"
          onClick={() => void handleForward()}
          disabled={forwarding || !canForward || !requestIdentifier}
          className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            canForward
              ? "border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700"
              : "border-slate-300 bg-slate-100 text-slate-600"
          }`}
          title={blockMessage || "Forward SSL rates to the day-shift owner for review"}
        >
          <SendHorizontal size={16} />
          {getForwardToOwnerButtonLabel({ forwarding, canForward, blockReason, hasNewQuotesSinceForward })}
        </button>
      </div>
    </div>
  );
}

function getEmbeddedSslQuotes(detail, sslQuotes) {
  if (Array.isArray(sslQuotes)) return sslQuotes;
  if (Array.isArray(detail?.operationSslQuotes)) return detail.operationSslQuotes;
  return null;
}

function getSslQuotesEmptyMessage(detail) {
  if (detail?.forwardedToOwner?.isForwarded) {
    return "No operation SSL rates on this request.";
  }
  return "SSL rates appear here after the operation team forwards them to you as owner.";
}

/** Read-only detail sections for exporter / operation-team / day-shift agent rows */
export function RateRequestDetailBody({ detail }) {
  if (!detail) return null;
  const showAssignment = Boolean(
    detail.ownerId || detail.capturedBy || detail.capturedByRef || detail.receivedAt || detail.submissionChannel,
  );
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Request ID</p>
          <p className="mt-1 break-all font-mono text-lg font-bold text-slate-900">
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

      {showAssignment && (detail.ownerId || detail.capturedBy || detail.receivedAt || detail.capturedByRef) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="mb-4 text-sm font-semibold text-slate-900">Assignment & intake</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DetailField label="Owner" value={formatOwnerRef(detail.ownerId)} />
            <DetailField label="Captured by (ref)" value={detail.capturedByRef || "N/A"} />
            <DetailField label="Captured by" value={formatExporterCompany(detail.capturedBy)} />
            <DetailField label="Received at" value={formatDateTime(detail.receivedAt)} />
            <DetailField label="Quote due" value={formatDateTime(detail.quoteDueAt)} />
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
          <DetailField label="Contact person" value={detail.contactPerson} />
          <DetailField label="Contact email" value={detail.contactEmail} />
          <DetailField label="Contact phone" value={detail.contactPhone} />
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-5">
        <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-emerald-900">
          <Ship size={18} className="text-emerald-600" />
          Shipment details
        </h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DetailField label="Origin port" value={detail.originPort} />
          <DetailField label="Destination port" value={detail.destinationPort} />
          <DetailField label="Cargo type" value={detail.cargoType} />
          <DetailField label="Weight / volume" value={detail.weightOrVolume} />
          <DetailField label="Incoterm" value={detail.incoterm} />
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

      {detail.channelMessageText && String(detail.channelMessageText).trim() !== "" && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-5 shadow-sm">
          <h4 className="mb-2 text-sm font-semibold text-sky-900">Channel / notes</h4>
          <p className="whitespace-pre-wrap text-sm text-slate-800">{detail.channelMessageText}</p>
        </div>
   
   
   )}

      {Array.isArray(detail.internalNotes) && detail.internalNotes.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FileText size={18} className="text-slate-600" />
            Internal notes
          </h4>
          <ul className="max-h-56 space-y-3 overflow-y-auto text-sm text-slate-700">
            {detail.internalNotes.map((entry, idx) => {
              const text =
                entry && typeof entry === "object" ? entry.note ?? entry.text ?? "" : String(entry ?? "");
              const when =
                entry && typeof entry === "object" && entry.createdAt ? formatDateTime(entry.createdAt) : null;
              return (
                <li key={idx} className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
                  {when && <p className="mb-1 text-xs text-slate-500">{when}</p>}
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

/** SSL rates + owner forward review — render before documents panel in detail modals */
function mergeOwnerReviewDetailUpdate(prev, updated) {
  return mergeForwardMetaIntoDetail(prev, updated);
}

export function RateRequestSslRatesBlock({
  detail,
  initialNegotiationQuoteId = null,
  sslQuotes = null,
  allowSslRateEdit = true,
  onDetailUpdated = null,
}) {
  if (!detail) return null;
  const embeddedSslQuotes = getEmbeddedSslQuotes(detail, sslQuotes);

  const handleReviewSuccess = (updated) => {
    if (!updated) return;
    onDetailUpdated?.(mergeOwnerReviewDetailUpdate(detail, updated));
  };

  return (
    <>
      {detail.forwardedToOwner?.isForwarded && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-5 shadow-sm">
          <h4 className="mb-1 text-sm font-semibold text-indigo-900">Rates sent to you for review</h4>
          <p className="mb-3 text-xs text-indigo-800/90">
            Operation forwarded these shipping-line quotes. Review each total below, then confirm or reject in the
            section after the rates.
          </p>
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <DetailField
              label="Forwarded at"
              value={formatDateTime(detail.forwardedToOwner.forwardedAt)}
            />
            <DetailField
              label="Forwarded by"
              value={formatOwnerRef(detail.forwardedToOwner.forwardedBy)}
            />
            <DetailField
              label="Review status"
              value={getOwnerRatesReviewStatusLabel(
                detail.ownerRatesReviewStatus ?? detail.ownerRatesReview?.status,
              )}
            />
          </div>
        </div>
      )}

      <OperationSslRatesSection
        requestId={detail._id || detail.requestId}
        requestData={detail}
        initialNegotiationQuoteId={initialNegotiationQuoteId}
        embeddedQuotes={embeddedSslQuotes}
        allowEdit={allowSslRateEdit}
        emptyMessage={embeddedSslQuotes != null ? getSslQuotesEmptyMessage(detail) : null}
      />

      {detail.forwardedToOwner?.isForwarded && (
        <OwnerRatesReviewActions detail={detail} onSuccess={handleReviewSuccess} />
      )}
    </>
  );
}

const defaultLineItem = () => ({ name: "", quantity: 1, amount: 0, total: 0 });
const defaultOceanLineItems = () => [
  { name: "Ocean freight", quantity: 1, amount: 0, total: 0 },
  { name: "Documentation", quantity: 1, amount: 0, total: 0 },
  { name: "Custom Charges", quantity: 1, amount: 0, total: 0 },
];
const defaultTruckingLineItems = () => [
  { name: "Pickup trucking", quantity: 1, amount: 0, total: 0 },
  { name: "Delivery trucking", quantity: 1, amount: 0, total: 0 },
];

function recalcLineTotal(row) {
  const q = Number(row.quantity);
  const a = Number(row.amount);
  const qn = Number.isFinite(q) ? q : 0;
  const an = Number.isFinite(a) ? a : 0;
  return Math.round(qn * an * 100) / 100;
}

function calculateLineItemsTotal(rows) {
  return Math.round(
    rows.reduce((sum, row) => {
      const total = Number(row?.total);
      return sum + (Number.isFinite(total) ? total : recalcLineTotal(row || {}));
    }, 0) * 100,
  ) / 100;
}

function normalizeLineItems(rows) {
  return rows
    .map((row) => {
      const quantity = Number(row?.quantity) || 0;
      const amount = Number(row?.amount) || 0;
      const total = Number.isFinite(Number(row?.total)) ? Number(row.total) : recalcLineTotal(row || {});
      return {
        name: String(row?.name || "").trim(),
        quantity,
        amount,
        total,
      };
    })
    .filter((row) => row.name && row.total > 0);
}

function toEditableLineItems(rows, fallbackFactory) {
  const list = Array.isArray(rows) && rows.length > 0 ? rows : fallbackFactory();
  return list.map((row) => ({
    name: String(row?.name || ""),
    quantity: row?.quantity ?? 1,
    amount: row?.amount ?? 0,
    total: row?.total ?? recalcLineTotal(row || {}),
  }));
}

function toDateInputValue(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

function buildSslOptionFromLine(line) {
  return {
    value: String(line.id || line.name),
    label: line.code ? `${line.name} (${line.code})` : line.name,
    searchText: [line.name, line.code, line.id].filter(Boolean).join(" "),
    meta: line,
  };
}

function buildSslOptionFromQuote(quote) {
  const name = String(quote?.sslName || "").trim();
  if (!name) return null;
  const code = String(quote?.sslCode || "").trim();
  const persistableId = String(quote?.sslId || "").trim();
  return {
    value: persistableId || code || name,
    label: code ? `${name} (${code})` : name,
    searchText: [name, code, persistableId].filter(Boolean).join(" "),
    meta: {
      id: persistableId || code || name,
      name,
      code,
      persistableId,
    },
  };
}

function mergeSslOptionsWithQuote(lines, quote) {
  const options = lines.map(buildSslOptionFromLine);
  const quoteOption = buildSslOptionFromQuote(quote);
  if (!quoteOption) return options;
  const alreadyIncluded = options.some((option) => {
    const meta = option.meta || {};
    return (
      (quote?.sslId && (meta.persistableId === quote.sslId || meta.id === quote.sslId)) ||
      (quote?.sslCode && meta.code === quote.sslCode && meta.name === quote.sslName) ||
      meta.name === quote?.sslName
    );
  });
  return alreadyIncluded ? options : [quoteOption, ...options];
}

function resolveInitialSslValue(options, quote) {
  if (!quote) return "";
  const matched = options.find((option) => {
    const meta = option.meta || {};
    return (
      (quote.sslId && (meta.persistableId === quote.sslId || meta.id === quote.sslId)) ||
      (quote.sslCode && meta.code === quote.sslCode && meta.name === quote.sslName) ||
      meta.name === quote.sslName
    );
  });
  return matched?.value || "";
}

function ReadOnlyChargeTable({ title, rows, totalAmount, currency = "", variant = "default" }) {
  if ((!Array.isArray(rows) || rows.length === 0) && !(Number(totalAmount) > 0)) return null;
  const isModal = variant === "modal";
  const amountHeader = currency ? `Amount (${currency})` : "Amount";
  const totalHeader = currency ? `Total (${currency})` : "Total";
  return (
    <div className={isModal ? "rounded-xl border border-slate-200 bg-slate-50/50 p-4" : "rounded-lg border border-slate-100 bg-slate-50/70 p-3"}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        {Number(totalAmount) > 0 && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            Total: {currency ? `${currency} ` : ""}
            {Number(totalAmount).toLocaleString()}
          </span>
        )}
      </div>
      {Array.isArray(rows) && rows.length > 0 ? (
        <div className={`overflow-x-auto rounded-lg border bg-white ${isModal ? "border-slate-200 shadow-sm" : "border-slate-100"}`}>
          <table className="w-full min-w-[400px] text-sm">
            <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Qty</th>
                <th className="px-4 py-2.5">{amountHeader}</th>
                <th className="px-4 py-2.5">{totalHeader}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((li, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{li.name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-700">{li.quantity ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-700">{li.amount != null ? Number(li.amount).toLocaleString() : "—"}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-900">{li.total != null ? Number(li.total).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-slate-500">No charge lines saved.</p>
      )}
    </div>
  );
}

function ChargeCalculatorSection({
  title,
  subtitle,
  rows,
  inputClass,
  onUpdateRow,
  onAddRow,
  onRemoveRow,
  totalAmount,
  addLabel,
  tone = "blue",
}) {
  const theme =
    tone === "amber"
      ? {
          shell: "border-amber-200 bg-amber-50/60",
          title: "text-amber-900",
          subtitle: "text-amber-700/80",
          addButton: "from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600",
        }
      : {
          shell: "border-blue-200 bg-blue-50/50",
          title: "text-blue-900",
          subtitle: "text-blue-700/80",
          addButton: "from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700",
        };

  return (
    <div className={`overflow-hidden rounded-2xl border ${theme.shell}`}>
      <div className="border-b border-white/70 bg-white/80 px-5 py-4">
        <h4 className={`text-lg font-semibold ${theme.title}`}>{title}</h4>
        {subtitle && <p className={`mt-1 text-sm ${theme.subtitle}`}>{subtitle}</p>}
      </div>

      <div className="space-y-5 p-5">
        <div className="grid grid-cols-12 gap-3 text-xs font-semibold text-gray-600">
          <div className="col-span-12 md:col-span-4">
            Name <span className="text-red-500">*</span>
          </div>
          <div className="col-span-4 md:col-span-2">
            Qty <span className="text-red-500">*</span>
          </div>
          <div className="col-span-4 md:col-span-2">
            Amount <span className="text-red-500">*</span>
          </div>
          <div className="col-span-3 md:col-span-3">Total</div>
          <div className="col-span-1 text-center">Action</div>
        </div>

        {rows.map((row, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-3 items-center">
            <div className="col-span-12 md:col-span-4">
              <input
                className={inputClass}
                value={row.name}
                onChange={(e) => onUpdateRow(idx, "name", e.target.value)}
                placeholder="Enter charge name"
              />
            </div>
            <div className="col-span-4 md:col-span-2">
              <input
                type="number"
                min="0"
                step="any"
                className={inputClass}
                value={row.quantity}
                onChange={(e) => onUpdateRow(idx, "quantity", e.target.value)}
              />
            </div>
            <div className="col-span-4 md:col-span-2">
              <input
                type="number"
                min="0"
                step="any"
                className={inputClass}
                value={row.amount}
                onChange={(e) => onUpdateRow(idx, "amount", e.target.value)}
              />
            </div>
            <div className="col-span-3 md:col-span-3">
              <div className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-gray-800">
                {recalcLineTotal(row).toFixed(2)}
              </div>
            </div>
            <div className="col-span-1 flex justify-center">
              <button
                type="button"
                disabled={rows.length <= 1}
                onClick={() => onRemoveRow(idx)}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                title="Remove charge"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}

        <div className="flex justify-center">
          <button
            type="button"
            onClick={onAddRow}
            className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r px-6 py-3 text-sm font-semibold text-white shadow-lg transition-colors ${theme.addButton}`}
          >
            <Plus size={18} />
            {addLabel}
          </button>
        </div>

        <div className="flex justify-start">
          <div className="inline-flex items-center gap-3 rounded-xl bg-green-500 px-6 py-4 text-sm font-semibold text-white shadow-lg">
            <Banknote size={20} className="text-white" />
            <span>Total Charges {Number(totalAmount || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Operation team: create a new SSL rate quote, or edit one only when explicitly passed.
 */
export function GiveRateModal({ open, onClose, requestId, requestData, authHeaders, onSuccess, initialQuote = null }) {
  const [selectedSslValue, setSelectedSslValue] = useState("");
  const [sslOptions, setSslOptions] = useState([]);
  const [sslLoading, setSslLoading] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [validityDate, setValidityDate] = useState("");
  const [transitDays, setTransitDays] = useState("");
  const [remarks, setRemarks] = useState("");
  const [lineItems, setLineItems] = useState(defaultOceanLineItems);
  const [truckingLineItems, setTruckingLineItems] = useState(defaultTruckingLineItems);
  const [submitting, setSubmitting] = useState(false);
  const hasTruckingRequest = hasAnyTruckingRequest(requestData);
  const activeQuote = initialQuote;
  const isEditMode = Boolean(activeQuote?._id);

  const totalFromLines = useMemo(() => calculateLineItemsTotal(lineItems), [lineItems]);
  const truckingTotalFromLines = useMemo(() => calculateLineItemsTotal(truckingLineItems), [truckingLineItems]);
  const grandTotalAmount = useMemo(
    () => Math.round((totalFromLines + (hasTruckingRequest ? truckingTotalFromLines : 0)) * 100) / 100,
    [totalFromLines, truckingTotalFromLines, hasTruckingRequest],
  );

  const selectedSsl = useMemo(
    () => sslOptions.find((option) => option.value === selectedSslValue)?.meta || null,
    [sslOptions, selectedSslValue],
  );

  useEffect(() => {
    if (!open) return;
    setSelectedSslValue("");
    setCurrency(activeQuote?.currency || "USD");
    setValidityDate(toDateInputValue(activeQuote?.validityDate));
    setTransitDays(activeQuote?.transitDays === 0 || activeQuote?.transitDays ? String(activeQuote.transitDays) : "");
    setRemarks(activeQuote?.remarks || "");
    setLineItems(toEditableLineItems(activeQuote?.lineItems, defaultOceanLineItems));
    setTruckingLineItems(
      hasTruckingRequest ? toEditableLineItems(activeQuote?.truckingLineItems, defaultTruckingLineItems) : defaultTruckingLineItems(),
    );
    setSubmitting(false);
  }, [open, requestId, activeQuote, hasTruckingRequest]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      setSslLoading(true);
      try {
        const lines = await fetchShippingLineMaster(authHeaders);
        if (cancelled) return;
        const options = mergeSslOptionsWithQuote(lines, activeQuote);
        setSslOptions(options);
        setSelectedSslValue(resolveInitialSslValue(options, activeQuote));
      } catch (err) {
        if (cancelled) return;
        setSslOptions([]);
        alertify.error(err?.response?.data?.message || "Could not load shipping lines");
      } finally {
        if (!cancelled) setSslLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, authHeaders, activeQuote]);

  const updateLine = (idx, field, raw) => {
    setLineItems((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        const next = { ...row };
        if (field === "name") {
          next.name = raw;
        } else {
          const n = raw === "" ? "" : Number(raw);
          next[field] = raw === "" ? "" : Number.isFinite(n) ? n : 0;
        }
        if (field === "quantity" || field === "amount") {
          next.total = recalcLineTotal({
            ...next,
            quantity: field === "quantity" ? (raw === "" ? 0 : Number(raw) || 0) : next.quantity,
            amount: field === "amount" ? (raw === "" ? 0 : Number(raw) || 0) : next.amount,
          });
        }
        return next;
      }),
    );
  };
  const updateTruckingLine = (idx, field, raw) => {
    setTruckingLineItems((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        const next = { ...row };
        if (field === "name") {
          next.name = raw;
        } else {
          const n = raw === "" ? "" : Number(raw);
          next[field] = raw === "" ? "" : Number.isFinite(n) ? n : 0;
        }
        if (field === "quantity" || field === "amount") {
          next.total = recalcLineTotal({
            ...next,
            quantity: field === "quantity" ? (raw === "" ? 0 : Number(raw) || 0) : next.quantity,
            amount: field === "amount" ? (raw === "" ? 0 : Number(raw) || 0) : next.amount,
          });
        }
        return next;
      }),
    );
  };

  const addLine = () => setLineItems((p) => [...p, defaultLineItem()]);
  const addTruckingLine = () => setTruckingLineItems((p) => [...p, defaultLineItem()]);
  const removeLine = (idx) => setLineItems((p) => (p.length <= 1 ? p : p.filter((_, i) => i !== idx)));
  const removeTruckingLine = (idx) => setTruckingLineItems((p) => (p.length <= 1 ? p : p.filter((_, i) => i !== idx)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!requestId) {
      alertify.error("Missing request id");
      return;
    }
    if (!selectedSsl?.name) {
      alertify.error("Select an SSL name");
      return;
    }
    if (!String(validityDate).trim()) {
      alertify.error("Select validity date");
      return;
    }
    const td = Number(transitDays);
    if (!Number.isFinite(td) || td < 0) {
      alertify.error("Enter transit days (0 or more)");
      return;
    }
    const ta = Math.round(grandTotalAmount * 100) / 100;
    if (!Number.isFinite(ta) || ta <= 0) {
      alertify.error("Add line items with amounts so the total is greater than zero");
      return;
    }
    const normalizedLines = normalizeLineItems(lineItems);
    if (normalizedLines.length === 0) {
      alertify.error("Add at least one SSL charge with an amount greater than zero");
      return;
    }
    const normalizedTruckingLines = hasTruckingRequest ? normalizeLineItems(truckingLineItems) : [];

    const payload = {
      sslName: selectedSsl.name,
      ...(selectedSsl.code ? { sslCode: selectedSsl.code } : {}),
      ...(selectedSsl.persistableId ? { sslId: selectedSsl.persistableId } : {}),
      currency: String(currency).trim() || "USD",
      totalAmount: ta,
      baseTotalAmount: totalFromLines,
      validityDate: String(validityDate).trim(),
      transitDays: td,
      remarks: String(remarks || "").trim(),
      lineItems: normalizedLines,
      ...(hasTruckingRequest
        ? {
            truckingLineItems: normalizedTruckingLines,
            truckingTotalAmount: truckingTotalFromLines,
          }
        : {}),
    };

    setSubmitting(true);
    try {
      let res;
      if (isEditMode) {
        res = await axios.patch(
          `${API_CONFIG.BASE_URL}/api/v1/exporter-rate-requst/${requestId}/operation-ssl-rates/${activeQuote._id}`,
          payload,
          buildAuthRequestConfig(),
        );
      } else {
        res = await axios.post(
          `${API_CONFIG.BASE_URL}/api/v1/exporter-rate-requst/${requestId}/operation-ssl-rates`,
          payload,
          buildAuthRequestConfig(),
        );
      }
      alertify.success(isEditMode ? "SSL rate updated" : "SSL rate submitted");
      onSuccess?.(extractForwardMetaFromApiResponse(res));
      onClose();
    } catch (err) {
      alertify.error(err.response?.data?.message || (isEditMode ? "Failed to update SSL rate" : "Failed to submit SSL rate"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={() => !submitting && onClose()}
    >
      <form
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl"
        onClick={(ev) => ev.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4 text-white">
          <div>
            <h3 className="text-lg font-semibold">{isEditMode ? "Edit rate (SSL)" : "Give rate (SSL)"}</h3>
            <p className="text-xs text-slate-300">Request: {requestId}</p>
          </div>
          <button type="button" disabled={submitting} className="text-2xl text-white/80 hover:text-white" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">SSL name *</label>
              <SearchableSelect
                value={selectedSslValue}
                onChange={setSelectedSslValue}
                options={sslOptions}
                placeholder={sslLoading ? "Loading shipping lines..." : "Search and select shipping line"}
                searchPlaceholder="Search shipping lines..."
                emptyText="No shipping lines found"
                disabled={sslLoading || submitting}
              />
              <p className="mt-1 text-xs text-gray-500">
                {sslLoading
                  ? "Loading shipping lines..."
                  : !sslOptions.length
                    ? "No shipping lines found"
                    : selectedSsl
                      ? [
                          `Selected: ${selectedSsl.name}`,
                          selectedSsl.code ? `Code: ${selectedSsl.code}` : "",
                          selectedSsl.persistableId ? `ID: ${selectedSsl.persistableId}` : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : "Choose a shipping line from master data."}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Currency *</label>
              <select className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="INR">INR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Validity date *</label>
              <input className={inputClass} type="date" value={validityDate} onChange={(e) => setValidityDate(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Transit days *</label>
              <input
                type="number"
                min="0"
                step="1"
                className={inputClass}
                value={transitDays}
                onChange={(e) => setTransitDays(e.target.value)}
                placeholder="e.g. 50"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Remarks</label>
              <textarea className={inputClass} rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. All IN" />
            </div>
          </div>

          <ChargeCalculatorSection
            title="SSL charges"
            subtitle="Add the main ocean and documentation charges for this shipping line quote."
            rows={lineItems}
            inputClass={inputClass}
            onUpdateRow={updateLine}
            onAddRow={addLine}
            onRemoveRow={removeLine}
            totalAmount={totalFromLines}
            addLabel="Add New Charge"
            tone="blue"
          />

          {hasTruckingRequest && (
            <div className="space-y-4">
              <ChargeCalculatorSection
                title="Trucking charges"
                subtitle="Use this section only for pickup and delivery trucking costs tied to this request."
                rows={truckingLineItems}
                inputClass={inputClass}
                onUpdateRow={updateTruckingLine}
                onAddRow={addTruckingLine}
                onRemoveRow={removeTruckingLine}
                totalAmount={truckingTotalFromLines}
                addLabel="Add Trucking Charge"
                tone="amber"
              />
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border-2 border-teal-300 bg-gradient-to-br from-teal-50/95 via-white to-emerald-50/80 shadow-md ring-1 ring-teal-100">
            <div className="flex items-center gap-2 border-b border-teal-200/80 bg-teal-600/10 px-5 py-3">
              <Banknote size={20} className="text-teal-700" />
              <p className="text-sm font-semibold text-teal-950">
                {hasTruckingRequest ? "Grand total amount (SSL + trucking)" : "Total amount (SSL charges)"}
              </p>
            </div>
            <div className="space-y-4 p-5">
              {hasTruckingRequest ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-blue-800/80">SSL charges</p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                      {currency} {totalFromLines.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-amber-900/80">Trucking charges</p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                      {currency}{" "}
                      {truckingTotalFromLines.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-600">Calculated from all SSL charge line totals below.</p>
              )}
              <div className="flex flex-col items-stretch justify-between gap-2 border-t border-teal-200/70 pt-4 sm:flex-row sm:items-center">
                <p className="text-xs font-medium text-slate-500">Amount sent to the API as totalAmount</p>
                <p className="text-right text-3xl font-bold tracking-tight tabular-nums text-teal-900 sm:text-4xl">
                  {currency}{" "}
                  {grandTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Main SSL charges are sent as `lineItems`.
            {hasTruckingRequest ? " Trucking charges are sent as `truckingLineItems` and included in the grand total above." : ""}
          </p>

        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4">
          <button type="button" disabled={submitting} onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white disabled:opacity-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? (isEditMode ? "Updating…" : "Submitting…") : isEditMode ? "Update rate" : "Submit rate"}
          </button>
        </div>
      </form>
    </div>
  );
}
