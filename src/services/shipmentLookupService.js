import { ICD_NAMES_BY_COUNTRY_CODE } from "../data/shipmentFormIcds.js";
import { INDIAN_SEAPORT_OPTIONS, USA_SEAPORT_OPTIONS } from "../data/shipmentFormPorts.js";
import { SEAPORT_NAMES_BY_COUNTRY_CODE } from "../data/shipmentFormSeaportsExtra.js";
import { countryCodeToFlagImageUrl } from "../utils/countryFlags.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim();
const API_V1_PREFIX = "/api/v1";
const COUNTRY_LOOKUP_PATH = import.meta.env.VITE_SHIPMENT_COUNTRIES_LOOKUP_PATH?.trim();
const PORT_LOOKUP_PATH = import.meta.env.VITE_SHIPMENT_PORTS_LOOKUP_PATH?.trim();
const DEFAULT_PAGE_LIMIT = 25;

const FALLBACK_COUNTRIES = [
  { id: "IN", code: "IN", name: "India" },
  { id: "US", code: "US", name: "United States" },
  { id: "CN", code: "CN", name: "China" },
  { id: "SG", code: "SG", name: "Singapore" },
  { id: "AE", code: "AE", name: "United Arab Emirates" },
  { id: "DE", code: "DE", name: "Germany" },
  { id: "GB", code: "GB", name: "United Kingdom" },
  { id: "NL", code: "NL", name: "Netherlands" },
  { id: "HK", code: "HK", name: "Hong Kong" },
  { id: "JP", code: "JP", name: "Japan" },
  { id: "KR", code: "KR", name: "South Korea" },
  { id: "AU", code: "AU", name: "Australia" },
  { id: "BR", code: "BR", name: "Brazil" },
  { id: "SA", code: "SA", name: "Saudi Arabia" },
  { id: "FR", code: "FR", name: "France" },
  { id: "IT", code: "IT", name: "Italy" },
  { id: "ES", code: "ES", name: "Spain" },
  { id: "CA", code: "CA", name: "Canada" },
  { id: "MX", code: "MX", name: "Mexico" },
  { id: "VN", code: "VN", name: "Vietnam" },
];

const FALLBACK_COUNTRY_BY_CODE = Object.fromEntries(
  FALLBACK_COUNTRIES.map((country) => [country.code, country]),
);

const ISO3_TO_ISO2 = {
  USA: "US",
  IND: "IN",
  CHN: "CN",
  GBR: "GB",
  ARE: "AE",
  DEU: "DE",
  FRA: "FR",
  JPN: "JP",
  KOR: "KR",
  AUS: "AU",
  BRA: "BR",
  SAU: "SA",
  ITA: "IT",
  ESP: "ES",
  CAN: "CA",
  MEX: "MX",
  VNM: "VN",
  NLD: "NL",
  SGP: "SG",
  HKG: "HK",
};

function resolveIso2CountryCode(country, countryNameHint = "") {
  const normalized =
    country && typeof country === "object" && (country.code || country.name)
      ? country
      : normalizeCountry(country) || { code: country, name: countryNameHint };

  let code = String(normalized?.code || country || "")
    .trim()
    .toUpperCase();
  const name = String(normalized?.name || countryNameHint || "").trim();

  if (/^[A-Z]{2}$/.test(code)) return code;
  if (ISO3_TO_ISO2[code]) return ISO3_TO_ISO2[code];

  if (name) {
    const byName = FALLBACK_COUNTRIES.find(
      (entry) => entry.name.toLowerCase() === name.toLowerCase(),
    );
    if (byName) return byName.code;
  }

  const id = String(normalized?.id || "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(id)) return id;

  return "";
}

function buildFallbackPortsForCountry(countryCode, countryName = "") {
  const code = resolveIso2CountryCode(countryCode, countryName);
  if (!code) return [];

  const country =
    FALLBACK_COUNTRY_BY_CODE[code] || { code, name: countryName || code };

  let seaportLabels =
    code === "IN"
      ? [...INDIAN_SEAPORT_OPTIONS]
      : code === "US"
        ? [...USA_SEAPORT_OPTIONS]
        : (SEAPORT_NAMES_BY_COUNTRY_CODE[code] || []).map(
            (name) => `${name}, ${country.name}`,
          );

  if (!seaportLabels.length) {
    seaportLabels = [`${country.name} — Main Port`];
  }

  const seaports = seaportLabels.map((label) =>
    normalizeFallbackPortLabel(label, code, country.name, "seaport"),
  );
  const icds = (ICD_NAMES_BY_COUNTRY_CODE[code] || []).map((name) =>
    normalizeFallbackPortLabel(name, code, country.name, "icd"),
  );

  return dedupeBy([...seaports, ...icds], portDedupeKey);
}

const FALLBACK_PORTS_BY_COUNTRY = Object.fromEntries(
  FALLBACK_COUNTRIES.map((country) => [
    country.code,
    buildFallbackPortsForCountry(country.code),
  ]),
);

const DEFAULT_COUNTRY_LOOKUP_PATHS = uniquePaths([
  COUNTRY_LOOKUP_PATH,
  "/shipment-lookups/countries",
  "/shipment-lookup/countries",
  "/lookups/countries",
  "/lookup/countries",
  "/master-data/countries",
  "/master/countries",
  "/reference/countries",
  "/countries",
]);

const DEFAULT_PORT_LOOKUP_PATHS = uniquePaths([
  PORT_LOOKUP_PATH,
  "/shipment-lookups/ports",
  "/shipment-lookup/ports",
  "/lookups/ports",
  "/lookup/ports",
  "/master-data/ports",
  "/master/ports",
  "/reference/ports",
  "/ports",
]);

let resolvedCountryLookupPath = null;
let resolvedPortLookupPath = null;

function uniquePaths(paths) {
  return [
    ...new Set(paths.map((value) => String(value || "").trim()).filter(Boolean)),
  ];
}

function normalizeLookupPath(path) {
  const raw = String(path || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;

  const normalizedPath = raw.startsWith("/") ? raw : `/${raw}`;
  const pathWithPrefix = normalizedPath.startsWith(API_V1_PREFIX)
    ? normalizedPath
    : `${API_V1_PREFIX}${normalizedPath}`;
  if (!API_BASE_URL) return pathWithPrefix;

  const normalizedBase = API_BASE_URL.replace(/\/+$/, "").replace(
    /\/api\/v1$/i,
    "",
  );
  return `${normalizedBase}${pathWithPrefix}`;
}

function authHeaders(token) {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function dedupeBy(items, getKey) {
  const seen = new Set();
  return items.filter((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  return [];
}

function extractPagination(payload, page, limit, itemCount) {
  const pagination =
    payload?.pagination ||
    payload?.meta ||
    payload?.data?.pagination ||
    payload?.data?.meta ||
    {};
  const currentPage =
    Number(pagination.currentPage || pagination.page || payload?.page || page || 1) ||
    1;
  const totalPages =
    Number(
      pagination.totalPages ||
        payload?.totalPages ||
        Math.ceil(
          (pagination.totalItems || pagination.total || itemCount || 0) /
            Math.max(
              1,
              pagination.itemsPerPage || pagination.limit || limit || DEFAULT_PAGE_LIMIT,
            ),
        ),
    ) || 1;
  const totalItems =
    Number(pagination.totalItems || pagination.total || payload?.totalItems || itemCount || 0) ||
    0;
  const itemsPerPage =
    Number(
      pagination.itemsPerPage ||
        pagination.limit ||
        payload?.limit ||
        limit ||
        DEFAULT_PAGE_LIMIT,
    ) || DEFAULT_PAGE_LIMIT;

  return {
    currentPage,
    totalPages: Math.max(1, totalPages),
    totalItems,
    itemsPerPage,
  };
}

function normalizeCountry(item) {
  const code = firstNonEmpty(
    item?.countryCode,
    item?.country_code,
    item?.iso2,
    item?.isoCode,
    item?.code,
    item?.alpha2,
    item?.country?.code,
  ).toUpperCase();
  const name = firstNonEmpty(
    item?.countryName,
    item?.country_name,
    item?.name,
    item?.label,
    item?.title,
    item?.country?.name,
  );
  const id = firstNonEmpty(item?._id, item?.id, item?.countryId, item?.country_id, code, name);
  if (!id && !name && !code) return null;

  return {
    id: id || code || name,
    code,
    name: name || code || id,
  };
}

function resolveLocationKind(item) {
  const portType = firstNonEmpty(item?.portType, item?.port_type).toLowerCase();
  if (
    portType.includes("icd") ||
    portType.includes("inland") ||
    portType.includes("depot") ||
    portType.includes("cfs")
  ) {
    return "icd";
  }
  if (item?.isSeaport === false || item?.is_seaport === false) return "icd";
  if (portType.includes("sea") || item?.isSeaport === true || item?.is_seaport === true)
    return "seaport";
  return "seaport";
}

function locationKindBadge(kind) {
  return kind === "icd" ? "ICD" : "Port";
}

function normalizePort(item, fallbackCountry = null) {
  const countryCode = firstNonEmpty(
    item?.countryCode,
    item?.country_code,
    item?.country?.code,
    item?.country?.countryCode,
    fallbackCountry?.code,
  ).toUpperCase();
  const countryName = firstNonEmpty(
    item?.countryName,
    item?.country_name,
    item?.country?.name,
    item?.country?.countryName,
    fallbackCountry?.name,
  );
  const portName = firstNonEmpty(
    item?.portName,
    item?.port_name,
    item?.name,
    item?.port,
    item?.portCity,
    item?.city,
    item?.label,
  );
  const city = firstNonEmpty(item?.city, item?.portCity, item?.port_city);
  const locode = firstNonEmpty(item?.unlocode, item?.locode, item?.unLocode, item?.code);
  const locationKind = resolveLocationKind(item);
  const displayName =
    city && portName && city.toLowerCase() !== portName.toLowerCase()
      ? `${portName}, ${city}`
      : portName || city;
  const label = countryName ? `${displayName}, ${countryName}` : displayName;
  const id = firstNonEmpty(
    item?._id,
    item?.id,
    item?.portId,
    item?.port_id,
    locode,
    `${locationKind}-${label}`,
  );
  if (!id || !displayName) return null;

  return {
    id,
    code: locode,
    name: displayName,
    label,
    countryCode,
    countryName,
    locationKind,
    badge: locationKindBadge(locationKind),
    isSeaport: locationKind === "seaport",
    transportMode: firstNonEmpty(item?.transportMode, item?.transport_mode),
    portType: firstNonEmpty(item?.portType, item?.port_type) || locationKind,
  };
}

function normalizeFallbackPortLabel(
  labelOrName,
  countryCode,
  countryName,
  locationKind = "seaport",
) {
  const raw = String(labelOrName || "").trim();
  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  let portName = parts[0] || raw;
  if (locationKind === "icd" && !/\bicd\b/i.test(portName)) {
    portName = `${portName} (ICD)`;
  }

  return {
    id: `${countryCode}-${locationKind}-${portName}`.toLowerCase().replace(/\s+/g, "-"),
    code: "",
    name: portName,
    label: `${portName}, ${countryName}`,
    countryCode,
    countryName,
    locationKind,
    badge: locationKindBadge(locationKind),
    isSeaport: locationKind === "seaport",
    portType: locationKind,
  };
}

function portDisplayName(port) {
  const name = String(port?.name || "").trim();
  if (name) return name;
  const label = String(port?.label || "").trim();
  if (!label) return "";
  return label.split(",")[0].trim();
}

/** Dedupe by visible name + type so API rows with different ids still collapse. */
function portDedupeKey(item) {
  const name = portDisplayName(item).toLowerCase();
  if (!name) {
    return String(item?.id || item?.code || "").toLowerCase();
  }
  const kind = String(item?.locationKind || item?.portType || "seaport").toLowerCase();
  return `${kind}::${name}`;
}

function sortLocationOptions(items) {
  const rank = { seaport: 0, icd: 1 };
  return [...items].sort((a, b) => {
    const kindDiff = (rank[a.locationKind] ?? 2) - (rank[b.locationKind] ?? 2);
    if (kindDiff !== 0) return kindDiff;
    return String(a.label || a.name).localeCompare(String(b.label || b.name));
  });
}

function filterPortsForCountry(items, countryCode) {
  const code = resolveIso2CountryCode(countryCode);
  if (!code) return items || [];
  return (items || []).filter((item) => {
    const itemCode = String(item.countryCode || "").toUpperCase();
    return !itemCode || itemCode === code;
  });
}

function mergePortsWithStaticCatalog(apiItems, countryCode, countryName = "") {
  const staticLocations = buildFallbackPortsForCountry(countryCode, countryName);
  return sortLocationOptions(dedupeBy([...(apiItems || []), ...staticLocations], portDedupeKey));
}

async function fetchLookupPortsBatch(token, params, fallbackCountry, signal, extraParams = {}) {
  return fetchAllLookupPages({
    token,
    signal,
    lookupType: "ports",
    limit: params.limit,
    params: { ...params, ...extraParams },
    mapItem: (item) => normalizePort(item, fallbackCountry),
    getDedupeKey: portDedupeKey,
  });
}

async function fetchNormalizedPorts(token, params, fallbackCountry, signal) {
  const [general, icd, inland] = await Promise.all([
    fetchLookupPortsBatch(token, params, fallbackCountry, signal, {
      isSeaport: undefined,
      portType: undefined,
    }),
    fetchLookupPortsBatch(token, params, fallbackCountry, signal, {
      portType: "icd",
      isSeaport: false,
    }),
    fetchLookupPortsBatch(token, params, fallbackCountry, signal, {
      portType: "inland",
      isSeaport: false,
    }),
  ]);

  const items = sortLocationOptions(dedupeBy([...general, ...icd, ...inland], portDedupeKey));

  return { items, pagination: { currentPage: 1, totalPages: 1, totalItems: items.length, itemsPerPage: items.length } };
}

function filterFallbackCountries(search) {
  const query = String(search || "").trim().toLowerCase();
  const filtered = !query
    ? FALLBACK_COUNTRIES
    : FALLBACK_COUNTRIES.filter((country) =>
        `${country.name} ${country.code}`.toLowerCase().includes(query),
      );

  return filtered.map((country) => ({ ...country }));
}

function filterFallbackPorts(countryCode, countryName, search) {
  const query = String(search || "").trim().toLowerCase();
  const base = buildFallbackPortsForCountry(countryCode, countryName);
  const filtered = !query
    ? base
    : base.filter((port) =>
        `${portDisplayName(port)} ${port.code || ""} ${port.badge || ""}`.toLowerCase().includes(query),
      );

  return sortLocationOptions(filtered.map((port) => ({ ...port })));
}

async function requestLookup({ token, signal, params, lookupType }) {
  const resolvedPath =
    lookupType === "countries" ? resolvedCountryLookupPath : resolvedPortLookupPath;
  const candidatePaths = resolvedPath
    ? [resolvedPath]
    : lookupType === "countries"
      ? DEFAULT_COUNTRY_LOOKUP_PATHS
      : DEFAULT_PORT_LOOKUP_PATHS;

  let capturedError = null;

  for (const path of candidatePaths) {
    try {
      const url = new URL(normalizeLookupPath(path), window.location.origin);
      if (params.page != null) url.searchParams.set("page", String(params.page));
      if (params.limit != null) url.searchParams.set("limit", String(params.limit));
      if (params.search) {
        url.searchParams.set("search", params.search);
        url.searchParams.set("q", params.search);
      }
      if (params.countryId) url.searchParams.set("countryId", params.countryId);
      if (params.countryCode) {
        url.searchParams.set("countryCode", params.countryCode);
        url.searchParams.set("country", params.countryCode);
      }
      if (params.transportMode) url.searchParams.set("transportMode", params.transportMode);
      if (params.isSeaport != null) url.searchParams.set("isSeaport", String(params.isSeaport));
      if (params.portType) url.searchParams.set("portType", params.portType);

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: authHeaders(token),
        credentials: "include",
        signal,
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        const error = new Error(payload?.message || `Failed to load ${lookupType}`);
        error.status = res.status;
        throw error;
      }

      if (lookupType === "countries") resolvedCountryLookupPath = path;
      if (lookupType === "ports") resolvedPortLookupPath = path;
      return payload;
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      capturedError = capturedError || error;
    }
  }

  throw capturedError || new Error(`Failed to load ${lookupType}`);
}

const COUNTRY_PAGE_SIZE = 250;
const MAX_LOOKUP_PAGES = 100;

async function fetchAllLookupPages({
  token,
  signal,
  lookupType,
  limit = COUNTRY_PAGE_SIZE,
  params = {},
  mapItem,
  getDedupeKey,
}) {
  const pageLimit = Math.max(25, Math.min(500, Number(limit) || COUNTRY_PAGE_SIZE));
  const merged = [];
  const seen = new Set();
  let currentPage = 1;
  let totalPages = 1;

  while (currentPage <= totalPages && currentPage <= MAX_LOOKUP_PAGES) {
    const payload = await requestLookup({
      token,
      signal,
      params: { ...params, page: currentPage, limit: pageLimit },
      lookupType,
    });
    const batch = extractItems(payload).map(mapItem).filter(Boolean);
    let added = 0;
    for (const item of batch) {
      const key = getDedupeKey(item);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
      added += 1;
    }

    const pagination = extractPagination(payload, currentPage, pageLimit, batch.length);
    totalPages = pagination.totalPages;
    if (!batch.length) break;
    if (added === 0 && currentPage > 1) break;
    currentPage += 1;
  }

  return merged;
}

export async function listShipmentCountries(
  token,
  { search = "", page = 1, limit = COUNTRY_PAGE_SIZE, fetchAllPages = true, signal } = {},
) {
  try {
    const useAllPages = fetchAllPages && !String(search || "").trim();

    if (useAllPages) {
      const items = await fetchAllLookupPages({
        token,
        signal,
        lookupType: "countries",
        limit,
        mapItem: normalizeCountry,
        getDedupeKey: (item) => item.id || item.code || item.name,
      });
      return {
        items,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: items.length,
          itemsPerPage: items.length || limit,
        },
      };
    }

    const payload = await requestLookup({
      token,
      signal,
      params: { search, page, limit },
      lookupType: "countries",
    });
    const items = dedupeBy(
      extractItems(payload).map(normalizeCountry).filter(Boolean),
      (item) => item.id || item.code || item.name,
    );
    return {
      items,
      pagination: extractPagination(payload, page, limit, items.length),
    };
  } catch {
    // Fallback when lookup API is unavailable
  }

  const items = filterFallbackCountries(search);
  return {
    items,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: items.length,
      itemsPerPage: Math.max(limit, items.length || limit),
    },
  };
}

export async function listShipmentPorts(
  token,
  {
    countryId,
    countryCode,
    countryName,
    search = "",
    page = 1,
    limit = 500,
    transportMode = "ocean",
    isSeaport,
    portType,
    signal,
  } = {},
) {
  const iso2 = resolveIso2CountryCode(countryCode, countryName);
  if (!iso2 && !countryId && !countryCode) {
    return {
      items: [],
      pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: limit },
    };
  }

  const resolvedName =
    countryName ||
    FALLBACK_COUNTRY_BY_CODE[iso2]?.name ||
    String(countryCode || "").trim();
  const fallbackCountry = { code: iso2, name: resolvedName };
  const lookupParams = {
    countryId,
    countryCode: iso2,
    countryName: resolvedName,
    search,
    page,
    limit: Math.max(limit, 100),
    transportMode,
    signal,
  };

  let items = [];

  try {
    const { items: apiItems, pagination } =
      isSeaport != null || portType
        ? await (async () => {
            const payload = await requestLookup({
              token,
              signal,
              params: { ...lookupParams, isSeaport, portType },
              lookupType: "ports",
            });
            const normalized = sortLocationOptions(
              dedupeBy(
                extractItems(payload)
                  .map((item) => normalizePort(item, fallbackCountry))
                  .filter(Boolean),
                portDedupeKey,
              ),
            );
            return {
              items: filterPortsForCountry(normalized, iso2),
              pagination: extractPagination(payload, page, limit, normalized.length),
            };
          })()
        : await fetchNormalizedPorts(token, lookupParams, fallbackCountry, signal);

    items = mergePortsWithStaticCatalog(filterPortsForCountry(apiItems, iso2), iso2, resolvedName);
    if (items.length) {
      const filtered = search
        ? items.filter((port) =>
            `${portDisplayName(port)} ${port.code || ""} ${port.badge || ""}`
              .toLowerCase()
              .includes(search.toLowerCase()),
          )
        : items;
      return {
        items: filtered,
        pagination: pagination || extractPagination({}, page, limit, filtered.length),
      };
    }
  } catch {
    // Fallback when lookup API is unavailable
  }

  items = filterFallbackPorts(iso2, resolvedName, search);
  const totalPages = Math.max(1, Math.ceil(items.length / limit));
  const start = (Math.max(1, page) - 1) * limit;
  const pagedItems = items.slice(start, start + limit);

  return {
    items: pagedItems,
    pagination: {
      currentPage: Math.max(1, page),
      totalPages,
      totalItems: items.length,
      itemsPerPage: limit,
    },
  };
}

/** Map normalized port rows to SearchableSelect options (name only — no country suffix) */
export function shipmentPortsToSelectOptions(ports) {
  const options = (ports || []).map((port) => {
    const displayName = portDisplayName(port);
    const isIcd = port.locationKind === "icd";
    return {
      value: displayName,
      label: displayName,
      displayLabel: displayName,
      badge: port.badge || (isIcd ? "ICD" : "Port"),
      locationKind: port.locationKind,
      searchText: `${displayName} ${isIcd ? "icd" : "port"}`.toLowerCase(),
    };
  });

  return dedupeBy(options, (option) => {
    const kind = String(option.locationKind || "seaport").toLowerCase();
    return `${kind}::${String(option.value || "").toLowerCase()}`;
  });
}

/** Map normalized country rows to SearchableSelect options */
export function shipmentCountriesToSelectOptions(countries) {
  return (countries || [])
    .map((raw) => {
      const normalized = normalizeCountry(raw) || raw;
      const code = resolveIso2CountryCode(normalized);
      const name = String(normalized?.name || code).trim();
      const countryId = firstNonEmpty(normalized?.id, raw?._id, raw?.id);
      if (!code) return null;
      return {
        value: code,
        label: name,
        displayLabel: name,
        countryId,
        flagUrl: countryCodeToFlagImageUrl(code),
        searchText: `${name} ${code}`.toLowerCase(),
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(a.displayLabel).localeCompare(String(b.displayLabel)));
}

export { FALLBACK_COUNTRIES, FALLBACK_PORTS_BY_COUNTRY };
