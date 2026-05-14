import { useCallback, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import API_CONFIG from "../../config/api.js";
import {
  EXPORTER_QUOTE_SUMMARY_EVENT,
  normalizeExporterQuoteBellEntries,
  persistExporterQuoteBellEntries,
} from "./exporterQuoteNotificationUtils.js";

function buildAuthHeadersFromStorage() {
  const token =
    sessionStorage.getItem("authToken") ||
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getNotificationKey(entry) {
  return `${entry?.sslQuote || ""}:${entry?.lastMessageAt || ""}:${toNumber(entry?.unreadCount)}`;
}

function publishExporterQuoteSummary(entries) {
  if (typeof window === "undefined") return;
  persistExporterQuoteBellEntries(entries);
  window.dispatchEvent(
    new CustomEvent(EXPORTER_QUOTE_SUMMARY_EVENT, {
      detail: normalizeExporterQuoteBellEntries(entries),
    }),
  );
}

function shouldNotify(previousEntry, nextEntry) {
  const nextUnreadCount = toNumber(nextEntry?.unreadCount);
  if (nextUnreadCount <= 0) return false;
  if (!previousEntry) return true;
  const previousUnreadCount = toNumber(previousEntry?.unreadCount);
  if (nextUnreadCount > previousUnreadCount) return true;
  return Boolean(nextEntry?.lastMessageAt && nextEntry.lastMessageAt !== previousEntry?.lastMessageAt);
}

export default function GlobalExporterQuoteNotifications() {
  const navigate = useNavigate();
  const previousSummaryRef = useRef(new Map());
  const initialLoadRef = useRef(true);

  const openThreadFromNotification = useCallback(
    (entry) => {
      if (!entry?.rateRequest) return;
      navigate("/sales/all-exporter-rr", {
        state: {
          exporterQuoteNotification: {
            requestMongoId: entry.rateRequest,
            requestId: entry.requestId || "",
            quoteId: entry.sslQuote || "",
          },
        },
      });
    },
    [navigate],
  );

  const showBrowserNotification = useCallback(
    (entry) => {
      if (typeof window === "undefined" || typeof Notification === "undefined") return;
      if (document.visibilityState === "visible") return;
      if (Notification.permission !== "granted") return;

      const notification = new Notification("New exporter quote message", {
        body: `${entry.sslName || "SSL quote"} • ${entry.lastMessagePreview || "Open to view the latest message"}`,
        tag: `exporter-quote-${getNotificationKey(entry)}`,
      });

      notification.onclick = () => {
        window.focus();
        openThreadFromNotification(entry);
        notification.close();
      };
    },
    [openThreadFromNotification],
  );

  const showToastNotification = useCallback(
    (entry) => {
      const unreadCount = toNumber(entry?.unreadCount);
      const toastId = `exporter-quote-${getNotificationKey(entry)}`;
      toast.info(
        ({ closeToast }) => (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-900">New exporter quote message</div>
            <div className="text-xs text-slate-600">
              Request {entry.requestId || entry.rateRequest || "N/A"} · {entry.sslName || "SSL quote"}
            </div>
            {entry.lastMessagePreview ? <div className="rounded bg-slate-50 px-2 py-1 text-sm text-slate-700">{entry.lastMessagePreview}</div> : null}
            <div className="text-xs text-slate-500">{unreadCount} unread message{unreadCount === 1 ? "" : "s"}</div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  closeToast?.();
                  openThreadFromNotification(entry);
                }}
                className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
              >
                View thread
              </button>
            </div>
          </div>
        ),
        {
          toastId,
          autoClose: 8000,
          closeButton: true,
          position: "top-right",
        },
      );
    },
    [openThreadFromNotification],
  );

  const fetchUnreadSummary = useCallback(async () => {
    const authHeaders = buildAuthHeadersFromStorage();
    if (!authHeaders.Authorization) {
      previousSummaryRef.current = new Map();
      initialLoadRef.current = true;
      publishExporterQuoteSummary([]);
      return;
    }

    try {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/exporter-rate-requst/quote-thread-unread-summary`, {
        headers: authHeaders,
        params: { unreadOnly: false, limit: 100 },
      });
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      const nextSummaryMap = new Map();
      const unreadEntries = normalizeExporterQuoteBellEntries(list);

      unreadEntries.forEach((entry) => {
        if (!entry?.sslQuote) return;
        nextSummaryMap.set(String(entry.sslQuote), entry);
      });

      if (!initialLoadRef.current) {
        nextSummaryMap.forEach((entry, quoteId) => {
          const previousEntry = previousSummaryRef.current.get(quoteId);
          if (!shouldNotify(previousEntry, entry)) return;
          showToastNotification(entry);
          showBrowserNotification(entry);
        });
      }

      previousSummaryRef.current = nextSummaryMap;
      initialLoadRef.current = false;
      publishExporterQuoteSummary(unreadEntries);
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) return;
      console.error("Failed to poll exporter quote notifications:", error);
    }
  }, [showBrowserNotification, showToastNotification]);

  useEffect(() => {
    if (typeof window !== "undefined" && typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    void fetchUnreadSummary();
    const intervalId = setInterval(() => {
      void fetchUnreadSummary();
    }, 15000);
    return () => clearInterval(intervalId);
  }, [fetchUnreadSummary]);

  return null;
}
