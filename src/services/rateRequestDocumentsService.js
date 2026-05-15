import axios from "axios";
import API_CONFIG from "../config/api.js";

function buildAuthHeaders(extraHeaders = {}) {
  const token =
    sessionStorage.getItem("authToken") ||
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
}

/** Operation-team documents base: GET checklist, POST upload/replace */
export function operationTeamDocumentsUrl(identifier) {
  const safe = encodeURIComponent(String(identifier || "").trim());
  return `${API_CONFIG.BASE_URL}/api/v1/exporter-rate-requst/operation-team/${safe}/documents`;
}

/** Operation-team file: GET download / preview (?disposition=inline) */
export function operationTeamDocumentFileUrl(identifier, fileId, { disposition } = {}) {
  const safeId = encodeURIComponent(String(identifier || "").trim());
  const safeFile = encodeURIComponent(String(fileId || "").trim());
  const url = `${API_CONFIG.BASE_URL}/api/v1/exporter-rate-requst/operation-team/${safeId}/documents/files/${safeFile}`;
  return disposition === "inline" ? `${url}?disposition=inline` : url;
}

export function resolveDocumentApiUrl(urlOrPath) {
  if (!urlOrPath) return null;
  const value = String(urlOrPath).trim();
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return `${API_CONFIG.BASE_URL}${value}`;
  return `${API_CONFIG.BASE_URL}/${value}`;
}

/** GET checklist — sections, items, progress, downloadUrl / previewUrl per upload */
export async function fetchRateRequestDocumentChecklist(identifier, headers = {}) {
  const res = await axios.get(operationTeamDocumentsUrl(identifier), {
    headers: buildAuthHeaders(headers),
    withCredentials: true,
  });
  return res.data?.data ?? res.data;
}

/** POST multipart upload (employee on behalf of exporter) */
export async function uploadRateRequestDocument(
  identifier,
  { sectionId, documentTypeId, file },
  headers = {},
) {
  const formData = new FormData();
  formData.append("sectionId", String(sectionId));
  formData.append("documentTypeId", String(documentTypeId));
  formData.append("file", file);

  const res = await axios.post(operationTeamDocumentsUrl(identifier), formData, {
    headers: { ...buildAuthHeaders(headers), "Content-Type": "multipart/form-data" },
    withCredentials: true,
  });
  return res.data?.data ?? res.data;
}

/** DELETE upload for a checklist item (documentTypeId) */
export async function deleteRateRequestDocument(identifier, documentTypeId, headers = {}) {
  const safeId = encodeURIComponent(String(identifier || "").trim());
  const safeType = encodeURIComponent(String(documentTypeId || "").trim());
  const url = `${API_CONFIG.BASE_URL}/api/v1/exporter-rate-requst/operation-team/${safeId}/documents/${safeType}`;
  const res = await axios.delete(url, {
    headers: buildAuthHeaders(headers),
    withCredentials: true,
  });
  return res.data?.data ?? res.data;
}

/** GET file blob (when checklist URLs are not used) */
export async function fetchRateRequestDocumentFile(
  identifier,
  fileId,
  { disposition = "attachment" } = {},
  headers = {},
) {
  const res = await axios.get(
    operationTeamDocumentFileUrl(identifier, fileId, {
      disposition: disposition === "inline" ? "inline" : undefined,
    }),
    {
      headers: buildAuthHeaders(headers),
      responseType: "blob",
      withCredentials: true,
    },
  );
  return res;
}

export const RATE_REQUEST_DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;

export const RATE_REQUEST_DOCUMENT_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip";
