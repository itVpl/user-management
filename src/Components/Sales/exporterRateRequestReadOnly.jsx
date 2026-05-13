/**
 * Read-only rate request detail UI + formatters shared by ExporterRateRequestWorkflow and AllExporterRR.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import alertify from "alertifyjs";
import "alertifyjs/build/css/alertify.css";
import { FileText, Paperclip, Ship, ClipboardList, Plus, Trash2, Banknote, Truck } from "lucide-react";
import API_CONFIG from "../../config/api.js";
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

function buildAuthHeadersFromStorage() {
  const token =
    sessionStorage.getItem("authToken") ||
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** GET operation SSL rates for a rate request (detail view). */
function OperationSslRatesSection({ requestId, requestData, allowEdit = true }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [editingQuote, setEditingQuote] = useState(null);

  const loadRows = useCallback(async () => {
    if (!requestId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/exporter-rate-requst/${requestId}/operation-ssl-rates`,
        { headers: buildAuthHeadersFromStorage() },
      );
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      const sorted = [...list].sort((a, b) => {
        const ta = new Date(a?.createdAt || 0).getTime();
        const tb = new Date(b?.createdAt || 0).getTime();
        return tb - ta;
      });
      setRows(sorted);
    } catch (e) {
      setErr(e.response?.data?.message || e.message || "Could not load SSL rates");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const fmtAddedBy = (ab) => {
    if (!ab || typeof ab !== "object") return "N/A";
    const name = ab.employeeName || "";
    const id = ab.empId || "";
    const email = ab.email || "";
    const parts = [name && id ? `${name} (${id})` : name || id, email].filter(Boolean);
    return parts.length ? parts.join(" · ") : "N/A";
  };

  return (
    <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50/90 via-white to-cyan-50/40 p-5 shadow-sm">
      <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-teal-950">
        <Banknote size={18} className="text-teal-600" />
        Operation SSL rates
      </h4>
      {loading && <p className="text-sm text-slate-600">Loading SSL rates…</p>}
      {!loading && err && <p className="text-sm text-red-600">{err}</p>}
      {!loading && !err && rows.length === 0 && (
        <p className="text-sm text-slate-600">No SSL rates have been submitted for this request yet.</p>
      )}
      {!loading && !err && rows.length > 0 && (
        <div className="space-y-4">
          {rows.map((r) => (
            <div key={r._id} className="rounded-xl border border-teal-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <p className="text-base font-bold text-slate-900">
                    {r.sslName || "—"}{" "}
                    <span className="text-sm font-semibold text-teal-700">
                      {r.currency || ""} {r.totalAmount != null ? Number(r.totalAmount).toLocaleString() : "—"}
                    </span>
                  </p>
                  {(r.sslCode || r.sslId) && (
                    <p className="mt-1 text-xs text-slate-500">
                      {r.sslCode ? `Code: ${r.sslCode}` : ""}
                      {r.sslCode && r.sslId ? " · " : ""}
                      {r.sslId ? `ID: ${r.sslId}` : ""}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    Added {formatDateTime(r.createdAt)}
                    {r.addedBy ? ` · ${fmtAddedBy(r.addedBy)}` : ""}
                  </p>
                </div>
                {allowEdit && (
                  <button
                    type="button"
                    onClick={() => setEditingQuote(r)}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    Edit quote
                  </button>
                )}
              </div>
              <div className="mb-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
                <DetailField label="Validity" value={formatDateOnly(r.validityDate) ?? formatDateTime(r.validityDate)} />
                <DetailField label="Transit days" value={r.transitDays != null ? String(r.transitDays) : "N/A"} />
                <DetailField label="Remarks" value={r.remarks} multiline />
              </div>
              <div className="space-y-3">
                <ReadOnlyChargeTable
                  title="SSL charges"
                  rows={r.lineItems}
                  totalAmount={r.baseTotalAmount ?? calculateLineItemsTotal(Array.isArray(r.lineItems) ? r.lineItems : [])}
                  currency={r.currency}
                />
                <ReadOnlyChargeTable
                  title="Trucking charges"
                  rows={r.truckingLineItems}
                  totalAmount={r.truckingTotalAmount}
                  currency={r.currency}
                />
              </div>
            </div>
          ))}
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
    </div>
  );
}

/** Read-only detail sections for exporter / operation-team rows */
export function RateRequestDetailBody({ detail }) {
  if (!detail) return null;
  const showAssignment = Boolean(
    detail.ownerId || detail.capturedBy || detail.capturedByRef || detail.receivedAt || detail.submissionChannel,
  );
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

      {isYesValue(detail.truckingRequired) && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-5">
          <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-amber-900">
            <Truck size={18} className="text-amber-700" />
            Trucking details
          </h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DetailField label="Trucking required" value="Yes" />
            <DetailField label="Pickup location" value={formatLocationForView(detail.truckingPickupLocation) || "-"} multiline />
            <DetailField label="Delivery location" value={formatLocationForView(detail.truckingDeliveryLocation) || "-"} multiline />
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

      <OperationSslRatesSection requestId={detail._id} requestData={detail} />
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

function ReadOnlyChargeTable({ title, rows, totalAmount, currency = "" }) {
  if ((!Array.isArray(rows) || rows.length === 0) && !(Number(totalAmount) > 0)) return null;
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        {Number(totalAmount) > 0 && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            Total: {currency ? `${currency} ` : ""}
            {Number(totalAmount).toLocaleString()}
          </span>
        )}
      </div>
      {Array.isArray(rows) && rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-slate-100 bg-white">
          <table className="w-full min-w-[400px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((li, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-800">{li.name ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-700">{li.quantity ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-700">{li.amount != null ? Number(li.amount).toLocaleString() : "—"}</td>
                  <td className="px-3 py-2 font-semibold text-slate-900">{li.total != null ? Number(li.total).toLocaleString() : "—"}</td>
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
 * Operation team: submit/update SSL rate quote.
 */
export function GiveRateModal({ open, onClose, requestId, requestData, authHeaders, onSuccess, initialQuote = null }) {
  const [existingQuote, setExistingQuote] = useState(null);
  const [loadingExistingQuote, setLoadingExistingQuote] = useState(false);
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
  const hasTruckingRequest = isYesValue(requestData?.truckingRequired);
  const activeQuote = initialQuote || existingQuote;
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
    if (initialQuote?._id) {
      setExistingQuote(null);
      setLoadingExistingQuote(false);
      return;
    }
    if (!requestId) {
      setExistingQuote(null);
      setLoadingExistingQuote(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingExistingQuote(true);
      try {
        const res = await axios.get(
          `${API_CONFIG.BASE_URL}/api/v1/exporter-rate-requst/${requestId}/operation-ssl-rates`,
          { headers: { ...authHeaders } },
        );
        if (cancelled) return;
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        const sorted = [...list].sort((a, b) => {
          const ta = new Date(a?.createdAt || 0).getTime();
          const tb = new Date(b?.createdAt || 0).getTime();
          return tb - ta;
        });
        setExistingQuote(sorted[0] || null);
      } catch (err) {
        if (cancelled) return;
        setExistingQuote(null);
      } finally {
        if (!cancelled) setLoadingExistingQuote(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, requestId, authHeaders, initialQuote]);

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
      if (isEditMode) {
        await axios.patch(
          `${API_CONFIG.BASE_URL}/api/v1/exporter-rate-requst/${requestId}/operation-ssl-rates/${activeQuote._id}`,
          payload,
          { headers: { ...authHeaders, "Content-Type": "application/json" } },
        );
      } else {
        await axios.post(
          `${API_CONFIG.BASE_URL}/api/v1/exporter-rate-requst/${requestId}/operation-ssl-rates`,
          payload,
          { headers: { ...authHeaders, "Content-Type": "application/json" } },
        );
      }
      alertify.success(isEditMode ? "SSL rate updated" : "SSL rate submitted");
      onSuccess?.();
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
            {loadingExistingQuote && !initialQuote && (
              <p className="mt-1 text-[11px] text-slate-300">Loading saved SSL quote…</p>
            )}
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
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                {hasTruckingRequest ? "Grand total amount (SSL + trucking)" : "Total amount (sum of line totals)"}
              </label>
              <input
                type="text"
                readOnly
                tabIndex={-1}
                className={`${inputClass} cursor-not-allowed bg-slate-100 text-slate-800`}
                value={Number.isFinite(grandTotalAmount) ? String(Math.round(grandTotalAmount * 100) / 100) : "0"}
              />
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

          <p className="text-xs text-gray-500">
            Main SSL charges are sent as `lineItems`. {hasTruckingRequest ? "Trucking charges are sent as `truckingLineItems` and included in the grand total." : "Total amount sent to the API is the sum of these line totals."}
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
