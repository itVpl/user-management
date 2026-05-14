export const EXPORTER_QUOTE_BELL_STORAGE_KEY = "exporter_quote_bell_notifications";
export const EXPORTER_QUOTE_SUMMARY_EVENT = "EXPORTER_QUOTE_SUMMARY_UPDATED";
export const EXPORTER_QUOTE_THREAD_READ_EVENT = "EXPORTER_QUOTE_THREAD_READ";

export function toExporterQuoteUnreadCount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeExporterQuoteBellEntries(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.filter((entry) => {
    const unreadCount = toExporterQuoteUnreadCount(entry?.unreadCount);
    return unreadCount > 0 && Boolean(entry?.sslQuote) && Boolean(entry?.rateRequest || entry?.requestId);
  });
}

export function readExporterQuoteBellEntries() {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(EXPORTER_QUOTE_BELL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return normalizeExporterQuoteBellEntries(parsed);
  } catch (error) {
    console.warn("Failed to read exporter quote bell cache:", error);
    return [];
  }
}

export function persistExporterQuoteBellEntries(entries) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(EXPORTER_QUOTE_BELL_STORAGE_KEY, JSON.stringify(normalizeExporterQuoteBellEntries(entries)));
  } catch (error) {
    console.warn("Failed to persist exporter quote bell cache:", error);
  }
}

export function markExporterQuoteEntriesRead(entries, quoteId, readState = null) {
  const targetQuoteId = String(quoteId || "").trim();
  if (!targetQuoteId) return normalizeExporterQuoteBellEntries(entries);
  return normalizeExporterQuoteBellEntries(
    (Array.isArray(entries) ? entries : []).map((entry) =>
      String(entry?.sslQuote || "").trim() === targetQuoteId
        ? {
            ...entry,
            unreadCount: 0,
            ...(readState && typeof readState === "object" ? readState : {}),
          }
        : entry,
    ),
  );
}

export function buildExporterQuoteRequestUnreadMap(entries) {
  return normalizeExporterQuoteBellEntries(entries).reduce((acc, entry) => {
    const unreadCount = toExporterQuoteUnreadCount(entry?.unreadCount);
    const requestMongoId = String(entry?.rateRequest || "").trim();
    const requestId = String(entry?.requestId || "").trim();
    if (requestMongoId) {
      acc[`mongo:${requestMongoId}`] = (acc[`mongo:${requestMongoId}`] || 0) + unreadCount;
    }
    if (requestId) {
      acc[`request:${requestId}`] = (acc[`request:${requestId}`] || 0) + unreadCount;
    }
    return acc;
  }, {});
}

export function getExporterQuoteRequestUnreadCount(unreadMap, row) {
  const requestMongoId = String(row?._id || "").trim();
  const requestId = String(row?.requestId || "").trim();
  if (requestMongoId && unreadMap[`mongo:${requestMongoId}`]) {
    return unreadMap[`mongo:${requestMongoId}`];
  }
  if (requestId && unreadMap[`request:${requestId}`]) {
    return unreadMap[`request:${requestId}`];
  }
  return 0;
}
