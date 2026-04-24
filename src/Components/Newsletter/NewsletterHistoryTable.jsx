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
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/5">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold tracking-tight text-slate-900">Delivery history</h3>
        <div className="flex flex-wrap gap-2">
          <select
            value={filters.newsletterId}
            onChange={(e) => onFilterChange("newsletterId", e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/25"
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
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/25"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={filters.channel}
            onChange={(e) => onFilterChange("channel", e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/25"
          >
            <option value="">All Channels</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto p-2 sm:p-4">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-3 py-2.5">Newsletter</th>
              <th className="px-3 py-2.5">Recipient</th>
              <th className="px-3 py-2.5">Channel</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Sent At</th>
              <th className="px-3 py-2.5">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-sm text-slate-500">
                  No history found.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={`${row._id || row.recipientId || index}`} className="hover:bg-slate-50/60">
                  <td className="px-3 py-2.5">{toDisplayText(row.newsletterTitle || row.title)}</td>
                  <td className="px-3 py-2.5">
                    {toDisplayText(row.recipientName || row.personName || row.recipientId || row.recipient)}
                  </td>
                  <td className="px-3 py-2.5 capitalize">{toDisplayText(row.channel)}</td>
                  <td className="px-3 py-2.5">{toDisplayText(row.status)}</td>
                  <td className="px-3 py-2.5 text-slate-600">
                    {row.sentAt ? new Date(row.sentAt).toLocaleString() : "-"}
                  </td>
                  <td className="max-w-[220px] px-3 py-2.5 break-words text-slate-600">
                    {toDisplayText(row.error || row.response?.messageId)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-4 py-3">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
        >
          Prev
        </button>
        <span className="text-xs font-medium text-slate-600">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default NewsletterHistoryTable;
