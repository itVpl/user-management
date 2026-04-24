import React from "react";

const deriveSendType = (channels) => {
  if (channels.email && channels.whatsapp) return "both";
  if (channels.email) return "email";
  if (channels.whatsapp) return "whatsapp";
  return "";
};

const channelCard = (active) =>
  `relative flex flex-1 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
    active
      ? "border-blue-500 bg-blue-50/80 shadow-sm ring-2 ring-blue-500/20"
      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
  }`;

const SendChannelSelector = ({ channels, onChange, error }) => {
  const handleToggle = (key) => {
    const next = { ...channels, [key]: !channels[key] };
    onChange(next, deriveSendType(next));
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/5">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-700 text-xs font-bold text-white">
            3
          </span>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-slate-900">Channels</h3>
            <p className="text-xs text-slate-500">Pick at least one delivery channel</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 p-5 sm:flex-row">
        <label className={channelCard(!!channels.email)}>
          <input
            type="checkbox"
            checked={!!channels.email}
            onChange={() => handleToggle("email")}
            className="sr-only"
          />
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
              channels.email ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"
            }`}
          >
            {channels.email ? "✓" : ""}
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-900">Email</span>
            <span className="text-xs text-slate-500">Uses recipient email</span>
          </span>
        </label>
        <label className={channelCard(!!channels.whatsapp)}>
          <input
            type="checkbox"
            checked={!!channels.whatsapp}
            onChange={() => handleToggle("whatsapp")}
            className="sr-only"
          />
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
              channels.whatsapp ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white"
            }`}
          >
            {channels.whatsapp ? "✓" : ""}
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-900">WhatsApp</span>
            <span className="text-xs text-slate-500">WhatsApp or mobile number</span>
          </span>
        </label>
      </div>
      {error ? <p className="border-t border-slate-100 px-5 py-2 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
};

export default SendChannelSelector;
