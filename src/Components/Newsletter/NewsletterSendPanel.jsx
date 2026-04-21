import React, { useState } from "react";

const getTwilioMessageSid = (row) =>
  row?.response?.messageSid ||
  row?.response?.MessageSid ||
  row?.messageSid ||
  row?.messageSID ||
  "";

const pickTwilioPayload = (raw) => raw?.data || raw?.twilio || raw?.message || raw;

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
}) => {
  const failedRows = (results || []).filter((row) => row?.status === "failed");
  const [twilioBySid, setTwilioBySid] = useState({});

  const handleTwilioCheck = async (messageSid) => {
    if (!onTwilioStatusFetch || !messageSid) return;
    setTwilioBySid((prev) => ({
      ...prev,
      [messageSid]: { ...(prev[messageSid] || {}), loading: true, error: null },
    }));
    try {
      const raw = await onTwilioStatusFetch(messageSid);
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
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-800">Send Newsletter</h3>
      <p className="mt-1 text-xs text-gray-500">
        Send in bulk after upload, recipient selection, and channel selection.
      </p>

      {whatsappSandboxBanner?.show && whatsappSandboxBanner?.notice ? (
        <div
          className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
          role="status"
        >
          <p className="font-medium">WhatsApp (Twilio sandbox)</p>
          <p className="mt-1">{whatsappSandboxBanner.notice}</p>
          {whatsappSandboxBanner.senderDisplay ? (
            <p className="mt-2 text-amber-800/90">Sender: {whatsappSandboxBanner.senderDisplay}</p>
          ) : null}
        </div>
      ) : null}

      <button
        onClick={onSend}
        disabled={!canSend || isSending}
        className="mt-4 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSending ? "Sending..." : "Send Newsletter"}
      </button>

      <button
        onClick={onRetryFailed}
        disabled={isSending || failedRows.length === 0}
        className="ml-2 mt-4 rounded-md border border-amber-500 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Retry Failed Only
      </button>

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

      {summary ? (
        <div className="mt-4 rounded-md border border-green-100 bg-green-50 p-3 text-xs text-green-800">
          <p>Total recipients: {summary.totalRecipients ?? 0}</p>
          <p>Total attempts: {summary.totalAttempts ?? 0}</p>
          <p>Sent: {summary.sent ?? 0}</p>
          <p>Failed: {summary.failed ?? 0}</p>
        </div>
      ) : null}

      {senderDetails ? (
        <div className="mt-3 rounded-md border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
          <p>Email sender: {senderDetails.emailSender || "-"}</p>
          <p>WhatsApp sender: {senderDetails.whatsappSenderNumber || "-"}</p>
        </div>
      ) : null}

      {results?.length ? (
        <div className="mt-3 max-h-72 overflow-y-auto rounded-md border border-gray-200">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-2 py-2">Recipient</th>
                <th className="px-2 py-2">Channel</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Error</th>
                <th className="px-2 py-2">Twilio</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row, index) => {
                const sid = getTwilioMessageSid(row);
                const isWhatsapp = String(row?.channel || "").toLowerCase() === "whatsapp";
                const twilioState = sid ? twilioBySid[sid] : null;
                const twilioInfo = twilioState?.info;

                return (
                  <tr key={`${row.recipientId || index}-${row.channel || "na"}`} className="border-t border-gray-100 align-top">
                    <td className="px-2 py-2">{row.recipientId || "-"}</td>
                    <td className="px-2 py-2">{row.channel || "-"}</td>
                    <td className="px-2 py-2">{row.status || "-"}</td>
                    <td className="px-2 py-2 break-words">{row.error || "-"}</td>
                    <td className="px-2 py-2">
                      {isWhatsapp && sid ? (
                        <div className="space-y-1">
                          <p className="break-all font-mono text-[10px] text-gray-600" title={sid}>
                            {sid.length > 18 ? `${sid.slice(0, 10)}…${sid.slice(-6)}` : sid}
                          </p>
                          {onTwilioStatusFetch ? (
                            <button
                              type="button"
                              onClick={() => handleTwilioCheck(sid)}
                              disabled={Boolean(twilioState?.loading)}
                              className="rounded border border-gray-300 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                              {twilioState?.loading ? "Checking…" : "Live status"}
                            </button>
                          ) : null}
                          {twilioState?.error ? (
                            <p className="text-[10px] text-red-600">{twilioState.error}</p>
                          ) : null}
                          {twilioInfo ? (
                            <p className="text-[10px] text-gray-700">
                              Twilio: <span className="font-medium">{twilioInfo.status || "-"}</span>
                              {twilioInfo.errorMessage ? (
                                <span className="block text-red-600">{twilioInfo.errorMessage}</span>
                              ) : null}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
};

export default NewsletterSendPanel;
