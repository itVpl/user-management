/**
 * Read-only rate request detail UI + formatters shared by ExporterRateRequestWorkflow and AllExporterRR.
 */
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import alertify from "alertifyjs";
import "alertifyjs/build/css/alertify.css";
import { FileText, Paperclip, Ship, ClipboardList, Plus, Trash2, Banknote } from "lucide-react";
import API_CONFIG from "../../config/api.js";
import { HS_CODE_OPTIONS } from "../../data/hsCodeOptions.js";
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

function locationHasAnyValue(loc) {
  if (loc == null) return false;
  if (typeof loc === "string") return loc.trim() !== "";
  if (typeof loc === "object") {
    return ["address", "city", "pincode"].some((k) => String(loc[k] ?? "").trim() !== "");
  }
  return false;
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

export function hasExtraDetails(detail) {
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
function OperationSslRatesSection({ requestId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!requestId) {
      setRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
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
        if (!cancelled) setRows(sorted);
      } catch (e) {
        if (!cancelled) {
          setErr(e.response?.data?.message || e.message || "Could not load SSL rates");
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestId]);

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
                  <p className="mt-1 text-xs text-slate-500">
                    Added {formatDateTime(r.createdAt)}
                    {r.addedBy ? ` · ${fmtAddedBy(r.addedBy)}` : ""}
                  </p>
                </div>
              </div>
              <div className="mb-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
                <DetailField label="Validity" value={formatDateOnly(r.validityDate) ?? formatDateTime(r.validityDate)} />
                <DetailField label="Transit days" value={r.transitDays != null ? String(r.transitDays) : "N/A"} />
                <DetailField label="Remarks" value={r.remarks} multiline />
              </div>
              {Array.isArray(r.lineItems) && r.lineItems.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-slate-100">
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
                      {r.lineItems.map((li, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-medium text-slate-800">{li.name ?? "—"}</td>
                          <td className="px-3 py-2 text-slate-700">{li.quantity ?? "—"}</td>
                          <td className="px-3 py-2 text-slate-700">
                            {li.amount != null ? Number(li.amount).toLocaleString() : "—"}
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-900">
                            {li.total != null ? Number(li.total).toLocaleString() : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
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

      <OperationSslRatesSection requestId={detail._id} />
    </>
  );
}

const defaultLineItem = () => ({ name: "", quantity: 1, amount: 0, total: 0 });

function recalcLineTotal(row) {
  const q = Number(row.quantity);
  const a = Number(row.amount);
  const qn = Number.isFinite(q) ? q : 0;
  const an = Number.isFinite(a) ? a : 0;
  return Math.round(qn * an * 100) / 100;
}

/**
 * Operation team: submit SSL rate quote — POST /api/v1/exporter-rate-requst/:id/operation-ssl-rates
 */
export function GiveRateModal({ open, onClose, requestId, authHeaders, onSuccess }) {
  const [sslName, setSslName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [validityDate, setValidityDate] = useState("");
  const [transitDays, setTransitDays] = useState("");
  const [remarks, setRemarks] = useState("");
  const [lineItems, setLineItems] = useState([
    { name: "Ocean freight", quantity: 1, amount: 0, total: 0 },
    { name: "Documentation", quantity: 1, amount: 0, total: 0 },
    { name: "Custom Charges", quantity: 1, amount: 0, total: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const totalFromLines = useMemo(
    () =>
      lineItems.reduce((s, row) => {
        const t = Number(row.total);
        return s + (Number.isFinite(t) ? t : recalcLineTotal(row));
      }, 0),
    [lineItems],
  );

  useEffect(() => {
    if (!open) return;
    setSslName("");
    setCurrency("USD");
    setValidityDate("");
    setTransitDays("");
    setRemarks("");
    setLineItems([
      { name: "Ocean freight", quantity: 1, amount: 0, total: 0 },
      { name: "Documentation", quantity: 1, amount: 0, total: 0 },
      { name: "Custom Charges", quantity: 1, amount: 0, total: 0 },
    ]);
    setSubmitting(false);
  }, [open, requestId]);

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

  const addLine = () => setLineItems((p) => [...p, defaultLineItem()]);
  const removeLine = (idx) => setLineItems((p) => (p.length <= 1 ? p : p.filter((_, i) => i !== idx)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!requestId) {
      alertify.error("Missing request id");
      return;
    }
    if (!String(sslName).trim()) {
      alertify.error("Enter SSL name");
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
    const ta = Math.round(totalFromLines * 100) / 100;
    if (!Number.isFinite(ta) || ta <= 0) {
      alertify.error("Add line items with amounts so the total is greater than zero");
      return;
    }
    const normalizedLines = lineItems
      .filter((row) => String(row.name || "").trim() !== "")
      .map((row) => {
        const quantity = Number(row.quantity) || 0;
        const amount = Number(row.amount) || 0;
        const total = Number.isFinite(Number(row.total)) ? Number(row.total) : recalcLineTotal(row);
        return { name: String(row.name).trim(), quantity, amount, total };
      });
    if (normalizedLines.length === 0) {
      alertify.error("Add at least one line item with a name");
      return;
    }

    const payload = {
      sslName: String(sslName).trim(),
      currency: String(currency).trim() || "USD",
      totalAmount: ta,
      validityDate: String(validityDate).trim(),
      transitDays: td,
      remarks: String(remarks || "").trim(),
      lineItems: normalizedLines,
    };

    setSubmitting(true);
    try {
      await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/exporter-rate-requst/${requestId}/operation-ssl-rates`,
        payload,
        { headers: { ...authHeaders, "Content-Type": "application/json" } },
      );
      alertify.success("SSL rate submitted");
      onSuccess?.();
      onClose();
    } catch (err) {
      alertify.error(err.response?.data?.message || "Failed to submit SSL rate");
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
            <h3 className="text-lg font-semibold">Give rate (SSL)</h3>
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
              <input className={inputClass} value={sslName} onChange={(e) => setSslName(e.target.value)} placeholder="e.g. MERSK" />
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
              <label className="mb-1 block text-xs font-semibold text-gray-600">Total amount (sum of line totals)</label>
              <input
                type="text"
                readOnly
                tabIndex={-1}
                className={`${inputClass} cursor-not-allowed bg-slate-100 text-slate-800`}
                value={Number.isFinite(totalFromLines) ? String(Math.round(totalFromLines * 100) / 100) : "0"}
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

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">Line items</span>
              <button type="button" onClick={addLine} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                <Plus size={14} /> Add line
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Name</th>
                    <th className="w-24 px-3 py-2 text-left font-medium text-gray-700">Qty</th>
                    <th className="w-28 px-3 py-2 text-left font-medium text-gray-700">Amount</th>
                    <th className="w-28 px-3 py-2 text-left font-medium text-gray-700">Total</th>
                    <th className="w-12 px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="px-2 py-2">
                        <input className={inputClass} value={row.name} onChange={(e) => updateLine(idx, "name", e.target.value)} placeholder="Charge name" />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className={inputClass}
                          value={row.quantity}
                          onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className={inputClass}
                          value={row.amount}
                          onChange={(e) => updateLine(idx, "amount", e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" className={`${inputClass} bg-gray-50`} readOnly value={recalcLineTotal(row)} />
                      </td>
                      <td className="px-1 py-2 text-center">
                        <button
                          type="button"
                          disabled={lineItems.length <= 1}
                          onClick={() => removeLine(idx)}
                          className="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-30"
                          title="Remove line"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-xs text-gray-500">Each line total = quantity × amount. Header total amount sent to the API is always the sum of these line totals.</p>
          </div>
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
            {submitting ? "Submitting…" : "Submit rate"}
          </button>
        </div>
      </form>
    </div>
  );
}
