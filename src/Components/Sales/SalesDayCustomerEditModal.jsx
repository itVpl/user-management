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

const MODAL_SHELL = 'rounded-2xl border border-gray-200 bg-white w-full flex flex-col overflow-hidden max-h-[90vh]';
const MODAL_HEADER = 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-4 shrink-0';
const MODAL_FIELD =
  'w-full px-4 py-3 border rounded-xl text-base text-gray-900 placeholder:text-gray-400 bg-white border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400';
const MODAL_LABEL = 'text-sm font-semibold text-gray-700';

const EDIT_KEYS = [
  ['personName', 'Person name'],
  ['companyName', 'Company name'],
  ['email', 'Email'],
  ['contactNumber', 'Phone'],
  ['whatsappNumber', 'WhatsApp'],
  ['linkedin', 'LinkedIn'],
  ['commodity', 'Commodity'],
  ['companyEmail', 'Company email'],
  ['city', 'City'],
  ['state', 'State'],
  ['country', 'Country'],
  ['zipcode', 'Zip / postal'],
  ['shippingTo', 'Shipping to'],
  ['companyAddress', 'Street / company address'],
];

const MULTILINE_KEYS = new Set(['companyAddress']);

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

  const gridFields = EDIT_KEYS.filter(([k]) => !MULTILINE_KEYS.has(k));
  const multilineFields = EDIT_KEYS.filter(([k]) => MULTILINE_KEYS.has(k));

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/45 p-4">
      <div className={`max-w-3xl ${MODAL_SHELL}`}>
        <div className={`${MODAL_HEADER} flex items-start justify-between gap-2`}>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Edit import row</h2>
            <p className="text-base text-blue-100/95 mt-1 leading-snug">
              {customer.companyName || customer.personName || 'Lead'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-white/90 hover:bg-white/15"
            aria-label="Close"
            disabled={busy}
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-5">
          <p className="text-sm text-gray-600 leading-relaxed">
            Disposition is unchanged here — use the disposition dropdown on the list. Only fields you change are sent to
            the server.
          </p>
          <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-5 space-y-4">
            <h3 className="text-base font-semibold text-blue-900">Lead details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {gridFields.map(([key, label]) => (
                <label key={key} className="block min-w-0">
                  <span className={`${MODAL_LABEL} block mb-1.5`}>{label}</span>
                  <input
                    className={`${MODAL_FIELD} ${
                      conflictField === key ? 'border-red-500 ring-2 ring-red-100' : ''
                    }`}
                    value={form[key] ?? ''}
                    onChange={(e) => onChange(key, e.target.value)}
                  />
                </label>
              ))}
            </div>
            {multilineFields.map(([key, label]) => (
              <label key={key} className="block min-w-0">
                <span className={`${MODAL_LABEL} block mb-1.5`}>{label}</span>
                <textarea
                  rows={4}
                  className={`${MODAL_FIELD} resize-y min-h-[6rem] leading-relaxed ${
                    conflictField === key ? 'border-red-500 ring-2 ring-red-100' : ''
                  }`}
                  value={form[key] ?? ''}
                  onChange={(e) => onChange(key, e.target.value)}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 px-5 py-4 flex justify-end gap-3 shrink-0 bg-white">
          <button
            type="button"
            className="px-5 py-3 rounded-xl border border-gray-300 bg-white text-base font-semibold text-gray-700 hover:bg-gray-50"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-base font-semibold hover:from-blue-700 hover:to-violet-700 disabled:opacity-50"
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
