import React from "react";

const toDisplayText = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => toDisplayText(item))
      .filter((item) => item && item !== "-")
      .join(", ") || "-";
  }
  if (typeof value === "object") {
    return (
      value.personName ||
      value.name ||
      value.email ||
      value.contactNumber ||
      value.whatsappNumber ||
      value._id ||
      "-"
    );
  }
  return "-";
};

const NewsletterHistoryTable = ({
  rows,
  newsletters,
  filters,
  onFilterChange,
  page,
  onPageChange,
  totalPages,
}) => {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-800">Delivery History</h3>
        <div className="flex flex-wrap gap-2">
          <select
            value={filters.newsletterId}
            onChange={(e) => onFilterChange("newsletterId", e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs"
          >
            <option value="">All Newsletters</option>
            {(newsletters || []).map((item) => (
              <option key={item._id} value={item._id}>
                {item.title || item.subject || item._id}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange("status", e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={filters.channel}
            onChange={(e) => onFilterChange("channel", e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs"
          >
            <option value="">All Channels</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2">Newsletter</th>
              <th className="px-3 py-2">Recipient</th>
              <th className="px-3 py-2">Channel</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Sent At</th>
              <th className="px-3 py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                  No history found.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={`${row._id || row.recipientId || index}`} className="border-b border-gray-100">
                  <td className="px-3 py-2">{toDisplayText(row.newsletterTitle || row.title)}</td>
                  <td className="px-3 py-2">
                    {toDisplayText(row.recipientName || row.personName || row.recipientId || row.recipient)}
                  </td>
                  <td className="px-3 py-2">{toDisplayText(row.channel)}</td>
                  <td className="px-3 py-2">{toDisplayText(row.status)}</td>
                  <td className="px-3 py-2">
                    {row.sentAt ? new Date(row.sentAt).toLocaleString() : "-"}
                  </td>
                  <td className="px-3 py-2">{toDisplayText(row.error || row.response?.messageId)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
        >
          Prev
        </button>
        <span className="text-xs text-gray-600">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default NewsletterHistoryTable;
