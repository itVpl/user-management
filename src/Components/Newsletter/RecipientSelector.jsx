import React from "react";

const getRecipientId = (recipient) => recipient?._id || recipient?.userId || recipient?.id;

const RecipientSelector = ({ recipients, selectedRecipientIds, onChange, error }) => {
  const handleToggle = (id) => {
    const next = selectedRecipientIds.includes(id)
      ? selectedRecipientIds.filter((item) => item !== id)
      : [...selectedRecipientIds, id];
    onChange(next);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Recipients</h3>
        <span className="text-xs text-gray-500">{selectedRecipientIds.length} selected</span>
      </div>
      <div className="max-h-64 space-y-2 overflow-y-auto">
        {recipients.length === 0 ? (
          <p className="text-sm text-gray-500">No AgentCustomer recipients found.</p>
        ) : (
          recipients.map((recipient) => {
            const id = getRecipientId(recipient);
            if (!id) return null;
            const checked = selectedRecipientIds.includes(id);
            return (
              <label
                key={id}
                className="flex cursor-pointer items-start gap-2 rounded-md border border-gray-100 p-2 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleToggle(id)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">{recipient.personName || "Unnamed"}</p>
                  <p className="text-xs text-gray-600">{recipient.email || "No email"}</p>
                  <p className="text-xs text-gray-600">
                    {recipient.whatsappNumber || recipient.contactNumber || "No WhatsApp number"}
                  </p>
                </div>
              </label>
            );
          })
        )}
      </div>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
};

export default RecipientSelector;
