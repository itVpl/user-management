import React, { useEffect, useMemo, useRef } from "react";

const getRecipientId = (recipient) => recipient?._id || recipient?.userId || recipient?.id;

const RecipientSelector = ({
  recipients,
  selectedRecipientIds,
  onChange,
  searchQuery = "",
  onSearchChange,
  isLoading = false,
  error,
}) => {
  const selectAllRef = useRef(null);

  const visibleIds = useMemo(
    () => recipients.map(getRecipientId).filter(Boolean),
    [recipients],
  );

  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedRecipientIds.includes(id));

  const someVisibleSelected =
    !allVisibleSelected && visibleIds.some((id) => selectedRecipientIds.includes(id));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected;
    }
  }, [someVisibleSelected]);

  const handleToggle = (id) => {
    const next = selectedRecipientIds.includes(id)
      ? selectedRecipientIds.filter((item) => item !== id)
      : [...selectedRecipientIds, id];
    onChange(next);
  };

  const handleSelectAllToggle = () => {
    if (allVisibleSelected) {
      const visibleSet = new Set(visibleIds);
      onChange(selectedRecipientIds.filter((id) => !visibleSet.has(id)));
      return;
    }
    onChange([...new Set([...selectedRecipientIds, ...visibleIds])]);
  };

  const handleClearSelection = () => onChange([]);

  const trimmedSearch = searchQuery.trim();
  const showSelectAll = !isLoading && visibleIds.length > 0;

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
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search by name, email, phone, company…"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
          />
        </div>
        {showSelectAll ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-800">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allVisibleSelected}
                onChange={handleSelectAllToggle}
                className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
              <span>
                Select all
                {trimmedSearch ? (
                  <span className="font-normal text-slate-500"> ({visibleIds.length} matching)</span>
                ) : (
                  <span className="font-normal text-slate-500"> ({visibleIds.length})</span>
                )}
              </span>
            </label>
            {selectedRecipientIds.length > 0 ? (
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-xs font-semibold text-violet-700 transition hover:text-violet-900"
              >
                Clear selection
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="max-h-72 space-y-2 overflow-y-auto p-4">
        {isLoading ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
            Searching contacts…
          </p>
        ) : recipients.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
            {trimmedSearch
              ? `No matches for “${trimmedSearch}”.`
              : "No recipients loaded. Check permissions or try again later."}
          </p>
        ) : (
          recipients.map((recipient) => {
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
