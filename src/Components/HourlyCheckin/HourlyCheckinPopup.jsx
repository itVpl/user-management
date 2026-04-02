import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { ChevronDown, ChevronUp, Clock, Loader2, Send } from "lucide-react";
import {
  getHourlyCheckinStatus,
  submitHourlyCheckinV2,
} from "../../services/hourlyCheckinService";

const ENABLED_DEPARTMENTS = new Set(["Sales", "CMT", "HR"]);

const getAuthToken = () =>
  localStorage.getItem("authToken") ||
  sessionStorage.getItem("authToken") ||
  localStorage.getItem("token") ||
  sessionStorage.getItem("token");

const getUserData = () => {
  const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

function formatTimeRange(startIso, endIso) {
  if (!startIso || !endIso) return "";
  const s = new Date(startIso);
  const e = new Date(endIso);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "";
  const fmt = (d) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${fmt(s)} – ${fmt(e)}`;
}

function safeJsonParse(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getAutoMetricsSummaryLines(autoMetrics) {
  const cmt = autoMetrics?.cmt;
  const sales = autoMetrics?.sales;

  if (cmt) {
    return [
      { label: "Calls", value: cmt.noOfCalls ?? 0 },
      {
        label: "Load assign/reassign",
        value: cmt.noOfLoadAssignOrReassign?.count ?? 0,
      },
      { label: "Bids with load ref", value: cmt.noOfBidsWithLoadRef?.count ?? 0 },
      { label: "Trucker added", value: cmt.noOfTruckerAdded ?? 0 },
    ];
  }

  if (sales) {
    return [
      { label: "Calls", value: sales.noOfCalls ?? 0 },
      { label: "Loads posted", value: sales.noOfLoadPosted?.count ?? 0 },
      { label: "Delivery orders", value: sales.noOfDeliveryOrder?.count ?? 0 },
      { label: "Customer added", value: sales.noOfCustomerAdded ?? 0 },
    ];
  }

  return [];
}

function getAutoMetricsDetailGroups(autoMetrics) {
  const cmt = autoMetrics?.cmt;
  const sales = autoMetrics?.sales;

  if (cmt) {
    return [
      {
        title: "Load assign/reassign (refs)",
        items: (cmt.noOfLoadAssignOrReassign?.refs || []).map((r) => String(r)),
      },
      {
        title: "Bids (bidId → loadRef)",
        items: (cmt.noOfBidsWithLoadRef?.bids || []).map(
          (b) => `${b?.bidId || "-"} → ${b?.loadRef || "-"}`,
        ),
      },
    ];
  }

  if (sales) {
    return [
      {
        title: "Loads posted (refs)",
        items: (sales.noOfLoadPosted?.refs || []).map((r) => String(r)),
      },
      {
        title: "Delivery orders (loadNo)",
        items: (sales.noOfDeliveryOrder?.refs || []).map((r) => String(r)),
      },
    ];
  }

  return [];
}

export default function HourlyCheckinPopup() {
  const [status, setStatus] = useState(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [workStatus, setWorkStatus] = useState("accept"); // accept | reject
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionAttachment, setRejectionAttachment] = useState(null);
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [autoMetricsLoading, setAutoMetricsLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [submittedForTime, setSubmittedForTime] = useState(() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours(),
    )}:${pad(d.getMinutes())}`;
  });

  const pollRef = useRef(null);
  const autoMetricsRef = useRef(null);
  const lastOpenedBucketRef = useRef("");

  const eligible = useMemo(() => {
    const token = getAuthToken();
    if (!token) return false;
    const user = getUserData();
    const dept =
      typeof user?.department === "string"
        ? user.department
        : user?.department?.name || "";
    return ENABLED_DEPARTMENTS.has((dept || "").trim());
  }, []);

  const pollStatus = async ({ allowOpen = true, includeAutoMetrics = false } = {}) => {
    try {
      const res = await getHourlyCheckinStatus(
        includeAutoMetrics ? { includeAutoMetrics: true } : {},
      );
      const data = res?.data || null;
      setStatus(data);

      const bucketKey = data?.currentHourStart || "";
      const shouldOpen =
        allowOpen &&
        data?.shouldShowPopup === true &&
        data?.hasSubmittedThisHour === false &&
        !!bucketKey &&
        bucketKey !== lastOpenedBucketRef.current;

      if (shouldOpen) {
        lastOpenedBucketRef.current = bucketKey;
        setOpen(true);
        setShowDetails(false);
        setUseCustomTime(false);
      }
    } catch (err) {
      // Silent on polling (avoid spam), but keep last known state.
      const msg = err?.response?.data?.message;
      if (msg && /department|eligible|forbidden/i.test(msg)) {
        setOpen(false);
      }
    }
  };

  useEffect(() => {
    if (!eligible) return;

    pollStatus();
    pollRef.current = setInterval(() => pollStatus(), 2 * 60 * 1000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible]);

  useEffect(() => {
    if (!open) return;

    const bucketKey =
      status?.previousHourStart || status?.currentHourStart || "current";
    const draftKey = `hourlyCheckinDraft:${bucketKey}`;
    const draft = safeJsonParse(localStorage.getItem(draftKey));
    if (draft?.responseText && typeof draft.responseText === "string") {
      setResponseText(draft.responseText);
    } else {
      setResponseText("");
    }
    setWorkStatus("accept");
    setRejectionReason("");
    setRejectionAttachment(null);

    const fetchAuto = async () => {
      try {
        setAutoMetricsLoading(true);
        await pollStatus({ allowOpen: false, includeAutoMetrics: true });
      } finally {
        setAutoMetricsLoading(false);
      }
    };

    fetchAuto();
    autoMetricsRef.current = setInterval(fetchAuto, 4 * 60 * 1000);

    return () => {
      if (autoMetricsRef.current) clearInterval(autoMetricsRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const bucketKey =
      status?.previousHourStart || status?.currentHourStart || "current";
    const draftKey = `hourlyCheckinDraft:${bucketKey}`;
    localStorage.setItem(
      draftKey,
      JSON.stringify({ responseText: responseText || "", savedAt: Date.now() }),
    );
  }, [open, responseText, status?.previousHourStart, status?.currentHourStart]);

  const handleSubmit = async () => {
    const text = (responseText || "").trim();
    if (!text) {
      toast.error("Please write your hourly check-in.");
      return;
    }

    if (workStatus === "reject" && !rejectionAttachment) {
      toast.error("Please upload an attachment for reject.");
      return;
    }

    try {
      setSubmitting(true);
      const iso = useCustomTime
        ? new Date(submittedForTime).toISOString()
        : undefined;
      await submitHourlyCheckinV2({
        responseText: text,
        submittedForTime: iso,
        workStatus,
        rejectionReason: (rejectionReason || "").trim() || undefined,
        rejectionAttachment,
      });
      toast.success("Hourly check-in submitted.");
      const bucketKey =
        status?.previousHourStart || status?.currentHourStart || "current";
      localStorage.removeItem(`hourlyCheckinDraft:${bucketKey}`);
      setOpen(false);
      await pollStatus({ allowOpen: false });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to submit check-in");
    } finally {
      setSubmitting(false);
    }
  };

  if (!eligible) return null;

  const timeRange = formatTimeRange(
    status?.previousHourStart || status?.currentHourStart,
    status?.previousHourEnd || status?.currentHourEnd,
  );

  const autoMetrics =
    status?.previousHourAutoMetrics || status?.currentHourAutoMetrics || null;
  const autoSummaryLines = getAutoMetricsSummaryLines(autoMetrics);
  const autoDetailGroups = getAutoMetricsDetailGroups(autoMetrics);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 backdrop-blur-[2px] p-4">
          <div
            className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            <div className="px-6 py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <Clock size={20} />
                </div>
                <div>
                  <div className="text-lg font-bold">Hourly Check-in</div>
                  <div className="mt-0.5 text-xs text-white/85">
                    {timeRange ? `Submitting for ${timeRange}` : "Submitting for last hour"}
                  </div>
                </div>
              </div>
              <div className="text-xs text-white/80 text-right">
                <div className="font-semibold">
                  {status?.employeeName || status?.empId || ""}
                </div>
                <div>{status?.department || ""}</div>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-b from-gray-50 to-white">
              <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Last hour summary (auto)
                      </div>
                      {autoMetricsLoading && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                          <Loader2 className="animate-spin" size={12} />
                          Refreshing
                        </span>
                      )}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {autoSummaryLines.length === 0 ? (
                        <div className="col-span-4 text-sm text-gray-600">
                          {autoMetricsLoading ? "Loading summary..." : "Summary not available."}
                        </div>
                      ) : (
                        autoSummaryLines.map((l) => (
                          <div
                            key={l.label}
                            className="rounded-xl border border-gray-100 bg-gradient-to-b from-gray-50 to-white px-3 py-2.5"
                          >
                            <div className="text-[11px] font-semibold text-gray-600">
                              {l.label}
                            </div>
                            <div className="text-sm font-bold text-gray-900">
                              {l.value}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowDetails((v) => !v)}
                    disabled={autoDetailGroups.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    Details{" "}
                    {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {showDetails && autoDetailGroups.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {autoDetailGroups.map((g) => (
                      <div
                        key={g.title}
                        className="rounded-xl border border-gray-100 bg-gray-50 p-3"
                      >
                        <div className="text-xs font-semibold text-gray-700">
                          {g.title}
                        </div>
                        {g.items.length === 0 ? (
                          <div className="mt-1 text-sm text-gray-600">No items</div>
                        ) : (
                          <ul className="mt-2 max-h-36 overflow-auto text-sm text-gray-800 list-disc pl-5">
                            {g.items.map((it, idx) => (
                              <li key={`${g.title}-${idx}`}>{it}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {status?.lastSubmission?.responseText && (
                <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Last submission
                  </div>
                  <div className="mt-1 text-sm text-gray-800 line-clamp-3">
                    {status.lastSubmission.responseText}
                  </div>
                </div>
              )}

              <label className="block text-sm font-semibold text-gray-800 mb-2">
                What did you do in the last hour?{" "}
                <span className="text-red-600">*</span>
              </label>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={6}
                placeholder="Write your work summary..."
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={submitting}
              />

              <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold text-gray-900">
                  Work status <span className="text-red-600">*</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWorkStatus("accept")}
                    disabled={submitting}
                    className={[
                      "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                      workStatus === "accept"
                        ? "border-green-200 bg-green-50 text-green-800"
                        : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50",
                    ].join(" ")}
                  >
                    Accept
                  </button>

                  <button
                    type="button"
                    onClick={() => setWorkStatus("reject")}
                    disabled={submitting}
                    className={[
                      "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                      workStatus === "reject"
                        ? "border-red-200 bg-red-50 text-red-800"
                        : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50",
                    ].join(" ")}
                  >
                    Reject
                  </button>
                </div>

                {workStatus === "reject" && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Rejection reason (optional)
                      </label>
                      <input
                        type="text"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Reason..."
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Attachment <span className="text-red-600">*</span>{" "}
                        <span className="text-xs font-medium text-gray-500">
                          (jpg / png / pdf)
                        </span>
                      </label>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => setRejectionAttachment(e.target.files?.[0] || null)}
                        disabled={submitting}
                        className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-xl file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-gray-900 hover:file:bg-gray-200"
                      />
                      {rejectionAttachment?.name && (
                        <div className="mt-2 text-xs text-gray-600">
                          Selected:{" "}
                          <span className="font-semibold text-gray-900">
                            {rejectionAttachment.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 select-none">
                  <input
                    type="checkbox"
                    checked={useCustomTime}
                    onChange={(e) => setUseCustomTime(e.target.checked)}
                    disabled={submitting}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Late submission (choose time)
                </label>

                {useCustomTime && (
                  <input
                    type="datetime-local"
                    value={submittedForTime}
                    onChange={(e) => setSubmittedForTime(e.target.value)}
                    className="w-full sm:w-auto rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm"
                    disabled={submitting}
                  />
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white px-5 py-2.5 text-sm font-semibold shadow-lg shadow-indigo-200/40 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Submitting...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Submit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

