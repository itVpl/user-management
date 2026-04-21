import React from "react";

const NewsletterSendPanel = ({
  onSend,
  onRetryFailed,
  isSending,
  canSend,
  summary,
  results,
  senderDetails,
  error,
}) => {
  const failedRows = (results || []).filter((row) => row?.status === "failed");

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-800">Send Newsletter</h3>
      <p className="mt-1 text-xs text-gray-500">
        Send in bulk after upload, recipient selection, and channel selection.
      </p>

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
        <div className="mt-3 max-h-56 overflow-y-auto rounded-md border border-gray-200">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-2 py-2">Recipient</th>
                <th className="px-2 py-2">Channel</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row, index) => (
                <tr key={`${row.recipientId || index}-${row.channel || "na"}`} className="border-t border-gray-100">
                  <td className="px-2 py-2">{row.recipientId || "-"}</td>
                  <td className="px-2 py-2">{row.channel || "-"}</td>
                  <td className="px-2 py-2">{row.status || "-"}</td>
                  <td className="px-2 py-2">{row.error || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
};

export default NewsletterSendPanel;
