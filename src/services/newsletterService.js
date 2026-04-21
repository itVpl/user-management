import API_CONFIG from "../config/api";

const NEWSLETTER_BASE = "/api/v1/newsletter";

const getAuthToken = () =>
  sessionStorage.getItem("authToken") ||
  localStorage.getItem("authToken") ||
  sessionStorage.getItem("token") ||
  localStorage.getItem("token");

const authHeaders = (isFormData = false) => {
  const token = getAuthToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
};

const request = async (endpoint, options = {}) => {
  const response = await fetch(API_CONFIG.getFullUrl(`${NEWSLETTER_BASE}${endpoint}`), {
    credentials: "include",
    ...options,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || `Request failed with status ${response.status}`);
  }
  return payload;
};

export const newsletterService = {
  getUploadConfig() {
    return request("/meta/upload-config", {
      method: "GET",
      headers: authHeaders(),
    });
  },

  uploadNewsletter(formData) {
    return request("/upload", {
      method: "POST",
      headers: authHeaders(true),
      body: formData,
    });
  },

  sendNewsletter(body) {
    return request("/send", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
  },

  listNewsletters() {
    return request("", {
      method: "GET",
      headers: authHeaders(),
    });
  },

  getRecipients(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        query.set(key, String(value));
      }
    });
    const suffix = query.toString() ? `/recipients?${query.toString()}` : "/recipients";
    return request(suffix, {
      method: "GET",
      headers: authHeaders(),
    });
  },

  getHistory(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        query.set(key, String(value));
      }
    });

    const suffix = query.toString() ? `/history?${query.toString()}` : "/history";
    return request(suffix, {
      method: "GET",
      headers: authHeaders(),
    });
  },
};

export default newsletterService;
