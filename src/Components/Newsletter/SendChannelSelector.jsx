import React from "react";

const deriveSendType = (channels) => {
  if (channels.email && channels.whatsapp) return "both";
  if (channels.email) return "email";
  if (channels.whatsapp) return "whatsapp";
  return "";
};

const SendChannelSelector = ({ channels, onChange, error }) => {
  const handleToggle = (key) => {
    const next = { ...channels, [key]: !channels[key] };
    onChange(next, deriveSendType(next));
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-800">Send Channels</h3>
      <div className="mt-3 flex flex-wrap gap-4">
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={!!channels.email}
            onChange={() => handleToggle("email")}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          Email
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={!!channels.whatsapp}
            onChange={() => handleToggle("whatsapp")}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          WhatsApp
        </label>
      </div>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
};

export default SendChannelSelector;
