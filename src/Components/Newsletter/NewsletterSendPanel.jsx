import React, { useMemo, useState } from "react";

const TWILIO_MSG_SID = /^(SM|MM|IM)[a-f0-9]{32}$/i;

const parseResponseObject = (response) => {
  if (!response) return null;
  if (typeof response === "string") {
    try {
      return JSON.parse(response);
    } catch {
      return null;
    }
  }
  if (typeof response === "object") return response;
  return null;
};

const extractSidFromObject = (obj) => {
  if (!obj || typeof obj !== "object") return "";
  return (
    obj.messageSid ||
    obj.MessageSid ||
    obj.sid ||
    obj.Sid ||
    obj.message_sid ||
    ""
  );
};

const getTwilioMessageSid = (row) => {
  const flat =
    row?.messageSid ||
    row?.MessageSid ||
    row?.twilioMessageSid ||
    row?.twilioSid ||
    row?.sid ||
    "";
  if (typeof flat === "string" && flat.trim()) return flat.trim();
  const parsed = parseResponseObject(row?.response);
  return extractSidFromObject(parsed) || "";
};

const isValidTwilioMessageSid = (sid) => typeof sid === "string" && TWILIO_MSG_SID.test(sid.trim());

const pickTwilioPayload = (raw) => raw?.data || raw?.twilio || raw?.message || raw;

const statusBadgeClass = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "sent" || s === "delivered") return "bg-emerald-50 text-emerald-800 ring-emerald-600/15";
  if (s === "failed" || s === "undelivered") return "bg-rose-50 text-rose-800 ring-rose-600/15";
  if (s === "queued" || s === "accepted" || s === "sending") return "bg-amber-50 text-amber-900 ring-amber-600/15";
  return "bg-slate-100 text-slate-700 ring-slate-600/10";
};

const NewsletterSendPanel = ({
  onSend,
  onRetryFailed,
  onTwilioStatusFetch,
  isSending,
  canSend,
  summary,
  results,
  senderDetails,
  error,
  whatsappSandboxBanner,
  recipientLookup = {},
}) => {
  const failedRows = (results || []).filter((row) => row?.status === "failed");
  const [twilioBySid, setTwilioBySid] = useState({});

  const recipientLabel = useMemo(() => {
    const map = typeof recipientLookup === "object" && recipientLookup !== null ? recipientLookup : {};
    return (id) => {
      if (!id) return null;
      return map[id] || map[String(id)] || null;
    };
  }, [recipientLookup]);

  const handleTwilioCheck = async (messageSid) => {
    if (!onTwilioStatusFetch || !messageSid || !isValidTwilioMessageSid(messageSid)) return;
    setTwilioBySid((prev) => ({
      ...prev,
      [messageSid]: { ...(prev[messageSid] || {}), loading: true, error: null },
    }));
    try {
      const raw = await onTwilioStatusFetch(messageSid.trim());
      const info = pickTwilioPayload(raw);
      setTwilioBySid((prev) => ({
        ...prev,
        [messageSid]: { loading: false, info, error: null },
      }));
    } catch (e) {
      setTwilioBySid((prev) => ({
        ...prev,
        [messageSid]: { loading: false, info: null, error: e?.message || "Status check failed." },
      }));
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/5">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
        <h3 className="text-base font-semibold tracking-tight text-slate-900">Send</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Choose recipients and channels first, then send. Results and Twilio status appear below.
        </p>
      </div>

      <div className="space-y-4 p-5">
        {whatsappSandboxBanner?.show && whatsappSandboxBanner?.notice ? (
          <div
            className="flex gap-3 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-xs text-amber-950 shadow-sm"
            role="status"
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-200/60 text-sm font-bold text-amber-900">
              !
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-amber-950">WhatsApp sandbox</p>
              <p className="mt-1 leading-relaxed text-amber-900/90">{whatsappSandboxBanner.notice}</p>
              {whatsappSandboxBanner.senderDisplay ? (
                <p className="mt-2 font-mono text-[11px] text-amber-900/80">
                  From <span className="font-semibold">{whatsappSandboxBanner.senderDisplay}</span>
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={onSend}
            disabled={!canSend || isSending}
            className="inline-flex min-h-[42px] flex-1 items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:min-w-[160px]"
          >
            {isSending ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Sending…
              </span>
            ) : (
              "Send newsletter"
            )}
          </button>
          <button
            type="button"
            onClick={onRetryFailed}
            disabled={isSending || failedRows.length === 0}
            className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Retry failed only
          </button>
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</div>
        ) : null}

        {(summary || senderDetails) && (
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            {summary ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Recipients", summary.totalRecipients ?? 0],
                  ["Attempts", summary.totalAttempts ?? 0],
                  ["Sent", summary.sent ?? 0],
                  ["Failed", summary.failed ?? 0],
                ].map(([label, val]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-white bg-white px-3 py-2 shadow-sm ring-1 ring-slate-900/5"
                  >
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{val}</p>
                  </div>
                ))}
              </div>
            ) : null}
            {senderDetails ? (
              <div className="mt-3 flex flex-col gap-1 border-t border-slate-200/80 pt-3 text-xs text-slate-600 sm:flex-row sm:flex-wrap sm:gap-x-6">
                <p>
                  <span className="font-medium text-slate-700">Email</span>{" "}
                  <span className="text-slate-600">{senderDetails.emailSender || "—"}</span>
                </p>
                <p>
                  <span className="font-medium text-slate-700">WhatsApp</span>{" "}
                  <span className="font-mono text-slate-600">{senderDetails.whatsappSenderNumber || "—"}</span>
                </p>
              </div>
            ) : null}
          </div>
        )}

        {results?.length ? (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">This send</p>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/5">
              <div className="max-h-80 overflow-y-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 backdrop-blur-sm">
                    <tr className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      <th className="px-3 py-2.5">Recipient</th>
                      <th className="px-3 py-2.5">Channel</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Detail</th>
                      <th className="px-3 py-2.5">Twilio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.map((row, index) => {
                      const rid = row.recipientId || row.recipient_id;
                      const label = recipientLabel(rid);
                      const sidRaw = getTwilioMessageSid(row);
                      const sid = typeof sidRaw === "string" ? sidRaw.trim() : "";
                      const sidValid = isValidTwilioMessageSid(sid);
                      const isWhatsapp = String(row?.channel || "").toLowerCase() === "whatsapp";
                      const twilioState = sid ? twilioBySid[sid] : null;
                      const twilioInfo = twilioState?.info;

                      return (
                        <tr key={`${rid || index}-${row.channel || "na"}`} className="align-top text-slate-800">
                          <td className="px-3 py-3">
                            {label ? (
                              <>
                                <p className="font-medium text-slate-900">{label.split(" · ")[0]}</p>
                                {label.includes(" · ") ? (
                                  <p className="mt-0.5 text-[11px] text-slate-500">{label.split(" · ").slice(1).join(" · ")}</p>
                                ) : null}
                                <p className="mt-1 font-mono text-[10px] text-slate-400" title={rid}>
                                  {rid ? `${String(rid).slice(0, 8)}…` : "—"}
                                </p>
                              </>
                            ) : (
                              <p className="font-mono text-[11px] text-slate-600" title={rid}>
                                {rid || "—"}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-3 capitalize text-slate-600">{row.channel || "—"}</td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${statusBadgeClass(
                                row.status
                              )}`}
                            >
                              {row.status || "—"}
                            </span>
                          </td>
                          <td className="max-w-[200px] px-3 py-3 break-words text-slate-600">
                            {row.error && String(row.error).trim() !== "-" ? row.error : "—"}
                          </td>
                          <td className="px-3 py-3">
                            {isWhatsapp && sidValid ? (
                              <div className="space-y-1.5">
                                <p className="font-mono text-[10px] leading-tight text-slate-500" title={sid}>
                                  {sid.slice(0, 10)}…{sid.slice(-6)}
                                </p>
                                {onTwilioStatusFetch ? (
                                  <button
                                    type="button"
                                    onClick={() => handleTwilioCheck(sid)}
                                    disabled={Boolean(twilioState?.loading)}
                                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                                  >
                                    {twilioState?.loading ? "Checking…" : "Live status"}
                                  </button>
                                ) : null}
                                {twilioState?.error ? (
                                  <p className="text-[10px] text-rose-600">{twilioState.error}</p>
                                ) : null}
                                {twilioInfo ? (
                                  <p className="text-[10px] text-slate-700">
                                    <span className="font-semibold text-slate-900">{twilioInfo.status || "—"}</span>
                                    {twilioInfo.errorMessage ? (
                                      <span className="mt-0.5 block text-rose-600">{twilioInfo.errorMessage}</span>
                                    ) : null}
                                  </p>
                                ) : null}
                              </div>
                            ) : isWhatsapp && sid && !sidValid ? (
                              <p className="text-[10px] leading-snug text-slate-400" title={sid}>
                                No Twilio message SID on this row (cannot poll). If the API adds{" "}
                                <code className="rounded bg-slate-100 px-0.5">SM…</code> use Live status.
                              </p>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default NewsletterSendPanel;
