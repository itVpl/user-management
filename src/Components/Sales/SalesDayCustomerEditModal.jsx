import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { X } from 'lucide-react';
import { patchSalesDayCustomer } from '../../services/salesDayAgentService';

/** Map PATCH 409 `field` to a key in EDIT_KEYS when the server uses an alias. */
function conflictApiFieldToFormKey(apiField) {
  if (!apiField) return null;
  const s = String(apiField);
  const m = {
    contactPerson: 'personName',
    person_name: 'personName',
    name: 'personName',
    phone: 'contactNumber',
    mobile: 'contactNumber',
  };
  return m[s] || s;
}

const EDIT_KEYS = [
  ['personName', 'Person name'],
  ['companyName', 'Company name'],
  ['email', 'Email'],
  ['contactNumber', 'Phone'],
  ['whatsappNumber', 'WhatsApp'],
  ['linkedin', 'LinkedIn'],
  ['commodity', 'Commodity'],
  ['companyAddress', 'Street / company address'],
  ['city', 'City'],
  ['state', 'State'],
  ['country', 'Country'],
  ['zipcode', 'Zip / postal'],
  ['shippingTo', 'Shipping to'],
  ['companyEmail', 'Company email'],
];

function rowToForm(c) {
  const o = {};
  for (const [k] of EDIT_KEYS) {
    o[k] = c?.[k] != null ? String(c[k]) : '';
  }
  return o;
}

/**
 * Partial PATCH /api/v1/sales-day-agent/:id — disposition stays on PATCH .../disposition.
 */
export default function SalesDayCustomerEditModal({ open, customer, onClose, onSaved }) {
  const [form, setForm] = useState({});
  const [initial, setInitial] = useState({});
  const [busy, setBusy] = useState(false);
  /** API 409 duplicate field name (personName, contactNumber, whatsappNumber, email, …). */
  const [conflictField, setConflictField] = useState(null);

  useEffect(() => {
    if (!open || !customer) return;
    const f = rowToForm(customer);
    setForm(f);
    setInitial(f);
    setConflictField(null);
  }, [open, customer]);

  const dirtyPayload = useMemo(() => {
    if (!customer?._id) return null;
    const body = {};
    for (const [k] of EDIT_KEYS) {
      const cur = (form[k] ?? '').trim();
      const orig = (initial[k] ?? '').trim();
      if (cur !== orig) body[k] = cur;
    }
    return Object.keys(body).length ? body : null;
  }, [form, initial, customer]);

  if (!open || !customer) return null;

  const onChange = (k, v) => {
    if (conflictField === k) setConflictField(null);
    setForm((p) => ({ ...p, [k]: v }));
  };

  const submit = async () => {
    if (!dirtyPayload) {
      toast.info('No changes to save.');
      onClose?.();
      return;
    }
    setBusy(true);
    try {
      const res = await patchSalesDayCustomer(customer._id, dirtyPayload);
      if (res?.success) {
        toast.success('Saved');
        onSaved?.(res.customer);
        onClose?.();
      } else {
        toast.error(res?.message || 'Save failed');
      }
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      const msg = data?.message || e?.message || 'Save failed';
      const fld = data?.field;
      if (status === 409 && fld) {
        const formKey = conflictApiFieldToFormKey(fld);
        if (EDIT_KEYS.some(([k]) => k === formKey)) setConflictField(formKey);
      }
      const allowed = data?.allowedFields;
      if (Array.isArray(allowed)) {
        toast.error(`${msg} (allowed: ${allowed.join(', ')})`);
      } else {
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/45 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3 sticky top-0 bg-white">
          <h3 className="font-semibold text-gray-900">Edit import row</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-500">
            Disposition is unchanged here — use the disposition dropdown on the list. Only fields you change are sent to
            the server.
          </p>
          {EDIT_KEYS.map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-xs font-medium text-gray-600">{label}</span>
              <input
                className={`mt-1 w-full border rounded-lg px-3 py-2 text-sm ${
                  conflictField === key ? 'border-red-500 ring-1 ring-red-200' : 'border-gray-200'
                }`}
                value={form[key] ?? ''}
                onChange={(e) => onChange(key, e.target.value)}
              />
            </label>
          ))}
        </div>
        <div className="border-t px-4 py-3 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button type="button" className="px-3 py-2 rounded-lg border text-sm" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50"
            onClick={submit}
            disabled={busy}
          >
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
