import React, { useMemo, useState } from "react";

const getRecipientId = (recipient) => recipient?._id || recipient?.userId || recipient?.id;

const RecipientSelector = ({ recipients, selectedRecipientIds, onChange, error }) => {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipients;
    return recipients.filter((r) => {
      const hay = [
        r.personName,
        r.companyName,
        r.email,
        r.whatsappNumber,
        r.contactNumber,
        r.customerId,
        r.eventName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [recipients, query]);

  const handleToggle = (id) => {
    const next = selectedRecipientIds.includes(id)
      ? selectedRecipientIds.filter((item) => item !== id)
      : [...selectedRecipientIds, id];
    onChange(next);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/5">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-xs font-bold text-white">
              2
            </span>
            <div>
              <h3 className="text-base font-semibold tracking-tight text-slate-900">Recipients</h3>
              <p className="text-xs text-slate-500">Search and select AgentCustomer contacts</p>
            </div>
          </div>
          <span className="inline-flex items-center rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-900 ring-1 ring-violet-600/15">
            {selectedRecipientIds.length} selected
          </span>
        </div>
        <div className="mt-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, phone, company…"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
          />
        </div>
      </div>

      <div className="max-h-72 space-y-2 overflow-y-auto p-4">
        {recipients.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
            No recipients loaded. Check permissions or try again later.
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-slate-500">No matches for “{query}”.</p>
        ) : (
          filtered.map((recipient) => {
            const id = getRecipientId(recipient);
            if (!id) return null;
            const checked = selectedRecipientIds.includes(id);
            return (
              <label
                key={id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition ${
                  checked
                    ? "border-violet-400 bg-violet-50/50 ring-1 ring-violet-500/15"
                    : "border-slate-100 bg-slate-50/40 hover:border-slate-200 hover:bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleToggle(id)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{recipient.personName || "Unnamed"}</p>
                  {recipient.companyName ? (
                    <p className="text-xs text-slate-500">{recipient.companyName}</p>
                  ) : null}
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-600">
                    {recipient.email ? <span>{recipient.email}</span> : null}
                    <span className="font-mono text-slate-500">
                      {recipient.whatsappNumber || recipient.contactNumber || "—"}
                    </span>
                  </div>
                </div>
              </label>
            );
          })
        )}
      </div>
      {error ? (
        <p className="border-t border-slate-100 bg-rose-50/80 px-4 py-2 text-xs text-rose-800">{error}</p>
      ) : null}
    </div>
  );
};

export default RecipientSelector;
