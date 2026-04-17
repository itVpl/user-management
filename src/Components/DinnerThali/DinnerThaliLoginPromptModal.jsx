import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import alertify from "alertifyjs";
import { X } from "lucide-react";
import API_CONFIG from "../../config/api";

function normalizeLoginPayload(p) {
  if (!p || typeof p !== "object" || !Array.isArray(p.choices) || p.choices.length === 0) return null;
  return {
    timezone: p.timezone,
    forDateKey: p.forDateKey,
    cutoffHour: p.cutoffHour,
    cutoffMinute: p.cutoffMinute,
    canSubmit: p.canSubmit,
    choices: p.choices,
    myChoice: p.myChoice ?? null,
    mySubmittedAt: p.mySubmittedAt ?? null,
  };
}

/**
 * Post-login prompt: UI from login `dinnerThali` immediately; GET /status runs in parallel to sync.
 * Token must already be in sessionStorage before this mounts (see Login.jsx).
 */
const DinnerThaliLoginPromptModal = ({ payload, onDismiss }) => {
  const [status, setStatus] = useState(null);
  const [statusPending, setStatusPending] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [selectedChoice, setSelectedChoice] = useState(() => normalizeLoginPayload(payload)?.myChoice ?? null);
  const [saving, setSaving] = useState(false);

  const payloadMerged = useMemo(() => normalizeLoginPayload(payload), [payload]);
  const merged = status ?? payloadMerged;

  useEffect(() => {
    if (merged?.myChoice != null) {
      setSelectedChoice(merged.myChoice);
    }
  }, [merged?.forDateKey, merged?.myChoice]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatusPending(true);
      setFetchError(null);
      try {
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/dinner-thali/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled && res.data?.success && res.data.data) {
          setStatus(res.data.data);
          const d = res.data.data;
          setSelectedChoice(d.myChoice ?? null);
        }
      } catch (e) {
        if (!cancelled) {
          if (e.response?.status === 403) {
            setFetchError(e.response?.data?.message || "Not available.");
            setStatus(null);
          } else {
            setFetchError(null);
          }
        }
      } finally {
        if (!cancelled) setStatusPending(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cutoffLabel = (s) => {
    if (s == null) return "";
    const h = s.cutoffHour;
    const m = s.cutoffMinute;
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    const mm = String(m ?? 0).padStart(2, "0");
    return `${hour12}:${mm} ${ampm}`;
  };

  const authHeaders = () => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!merged?.canSubmit) {
      alertify.warning("The submission window is closed.");
      return;
    }
    if (!selectedChoice) {
      alertify.error("Please select an option.");
      return;
    }
    setSaving(true);
    try {
      const res = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/dinner-thali`,
        { choice: selectedChoice },
        { headers: authHeaders() }
      );
      if (res.data?.success) {
        alertify.success(res.data.message || "Saved.");
        onDismiss();
      }
    } catch (err) {
      alertify.error(err.response?.data?.message || "Could not save your choice.");
    } finally {
      setSaving(false);
    }
  };

  const blockingSpinner = statusPending && !payloadMerged;

  const modal = createPortal(
    <div
      className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/55 p-4"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dinner-thali-login-prompt-title"
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-5">
          <h2 id="dinner-thali-login-prompt-title" className="text-lg font-bold text-gray-900">
            Today&apos;s dinner thali
          </h2>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          {blockingSpinner && (
            <div className="flex justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            </div>
          )}

          {!blockingSpinner && fetchError && (
            <div className="space-y-4">
              <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">{fetchError}</p>
              <button
                type="button"
                onClick={onDismiss}
                className="w-full rounded-lg bg-gray-800 py-2.5 font-medium text-white hover:bg-gray-900"
              >
                Continue
              </button>
            </div>
          )}

          {!blockingSpinner && !fetchError && merged && (
            <>
              <p className="mb-3 text-sm text-gray-600">
                Office date <span className="font-medium text-gray-800">{merged.forDateKey}</span>
                {merged.timezone ? ` · ${merged.timezone}` : ""}
                {merged.cutoffHour != null ? ` · Cutoff ${cutoffLabel(merged)}` : ""}
              </p>

              {!merged.canSubmit && (
                <div className="mb-4 rounded-xl border-2 border-amber-400 bg-amber-100 px-4 py-4 shadow-sm" role="status">
                  <p className="text-lg font-bold uppercase tracking-wide text-amber-950">
                    Dinner thali window is closed
                  </p>
                  <p className="mt-2 text-sm font-medium text-amber-900">
                    Choices are accepted only until {cutoffLabel(merged)} office time
                    {merged.timezone ? ` (${merged.timezone})` : ""}.
                  </p>
                </div>
              )}

              {!merged.canSubmit && merged.myChoice && (
                <p className="mb-4 text-sm text-gray-700">
                  Your choice today:{" "}
                  <span className="font-semibold text-gray-900">
                    {merged.choices?.find((c) => c.value === merged.myChoice)?.label || merged.myChoice}
                  </span>
                </p>
              )}

              {merged.canSubmit && merged.myChoice && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-700">
                    You already have a choice saved for today. You can change it from the Dinner thali card on your
                    dashboard until cutoff.
                  </p>
                  <button
                    type="button"
                    onClick={onDismiss}
                    className="w-full rounded-lg bg-gray-800 py-2.5 font-medium text-white hover:bg-gray-900"
                  >
                    Continue
                  </button>
                </div>
              )}

              {merged.canSubmit && !merged.myChoice && (
                <form onSubmit={handleSave} className="space-y-4">
                  <p className="text-sm font-medium text-gray-800">Choose one option for today, then submit.</p>
                  <fieldset disabled={saving} className="space-y-2">
                    {(merged.choices || []).map((c) => (
                      <label
                        key={c.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 ${
                          selectedChoice === c.value ? "border-amber-500 bg-amber-50" : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="thali-login-prompt"
                          value={c.value}
                          checked={selectedChoice === c.value}
                          onChange={() => setSelectedChoice(c.value)}
                          className="h-4 w-4 text-amber-600"
                        />
                        <span className="font-medium text-gray-900">{c.label}</span>
                      </label>
                    ))}
                  </fieldset>
                  <button
                    type="submit"
                    disabled={saving || !selectedChoice}
                    className="w-full rounded-lg bg-amber-600 py-2.5 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    {saving ? "Submitting…" : "Submit"}
                  </button>
                </form>
              )}

              {!merged.canSubmit && (
                <button
                  type="button"
                  onClick={onDismiss}
                  className="mt-4 w-full rounded-lg bg-gray-800 py-2.5 font-medium text-white hover:bg-gray-900"
                >
                  Continue
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );

  return modal;
};

export default DinnerThaliLoginPromptModal;
