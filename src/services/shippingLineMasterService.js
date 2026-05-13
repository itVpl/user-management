import axios from "axios";
import API_CONFIG from "../config/api.js";

const FALLBACK_SHIPPING_LINES = [
  "MAERSK",
  "MSC",
  "CMA CGM",
  "Hapag-Lloyd",
  "ONE",
  "Evergreen",
  "COSCO",
  "ZIM",
  "Wan Hai",
  "Yang Ming",
  "OOCL",
  "PIL",
].map((name) => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  name,
  code: "",
  persistableId: "",
}));

function normalizeEndpoint(raw) {
  const endpoint = String(raw ?? "").trim();
  if (!endpoint) return "";
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  return `${API_CONFIG.BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
}

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeShippingLine(row, index) {
  if (row == null) return null;
  if (typeof row === "string") {
    const name = row.trim();
    return name ? { id: slugify(name) || `ssl-${index}`, name, code: "", persistableId: "" } : null;
  }
  if (typeof row !== "object") return null;

  const name =
    row.sslName ??
    row.name ??
    row.shippingLineName ??
    row.steamShipLineName ??
    row.lineName ??
    row.label ??
    row.title ??
    "";

  const cleanedName = String(name).trim();
  if (!cleanedName) return null;

  const code =
    row.sslCode ??
    row.code ??
    row.shippingLineCode ??
    row.lineCode ??
    row.scac ??
    row.shortCode ??
    "";

  const id =
    row._id ??
    row.id ??
    row.masterId ??
    row.shippingLineId ??
    row.lineId ??
    row.value ??
    slugify(cleanedName) ??
    `ssl-${index}`;

  return {
    id: String(id),
    name: cleanedName,
    code: String(code ?? "").trim(),
    persistableId: row._id ?? row.id ?? row.masterId ?? row.shippingLineId ?? row.lineId ?? "",
  };
}

function extractShippingLineRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const candidates = [
    payload.shippingLines,
    payload.sslMasterData,
    payload.sslLines,
    payload.lines,
    payload.items,
    payload.rows,
    payload.data,
    payload.result,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === "object") {
      const nested = [
        candidate.shippingLines,
        candidate.sslMasterData,
        candidate.sslLines,
        candidate.lines,
        candidate.items,
        candidate.rows,
        candidate.data,
      ];
      for (const inner of nested) {
        if (Array.isArray(inner)) return inner;
      }
    }
  }

  return [];
}

function dedupeLines(lines) {
  const seen = new Set();
  return lines.filter((line) => {
    const key = `${line.name.toLowerCase()}::${line.code.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function fetchShippingLineMaster(authHeaders = {}) {
  const configuredEndpoint =
    import.meta.env.VITE_SSL_MASTER_ENDPOINT ||
    import.meta.env.VITE_SHIPPING_LINE_MASTER_ENDPOINT ||
    import.meta.env.VITE_SHIPPING_LINES_ENDPOINT ||
    "";

  const endpoint = normalizeEndpoint(configuredEndpoint);
  if (!endpoint) return FALLBACK_SHIPPING_LINES;

  try {
    const res = await axios.get(endpoint, {
      headers: { ...authHeaders },
      withCredentials: true,
    });

    const rows = extractShippingLineRows(res.data);
    const normalized = rows.map(normalizeShippingLine).filter(Boolean);
    return dedupeLines(normalized);
  } catch (error) {
    console.warn("Falling back to built-in shipping lines:", error);
    return FALLBACK_SHIPPING_LINES;
  }
}

export { FALLBACK_SHIPPING_LINES };
