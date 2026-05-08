import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Ship, CheckCircle2, Loader2 } from 'lucide-react';
import { submitOceanQuote } from '../services/oceanQuoteService.js';

const initialForm = () => ({
  name: '',
  email: '',
  phoneNumber: '',
  originPort: '',
  destinationPort: '',
  cargoType: '',
  containerType: '',
  weightKg: '',
  volumeCbm: '',
  incoterms: '',
  preferredShippingDate: '',
  additionalInformation: '',
});

export default function OceanQuotePublicForm() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    const weightKg = form.weightKg === '' ? undefined : Number(form.weightKg);
    const volumeCbm = form.volumeCbm === '' ? undefined : Number(form.volumeCbm);
    if (form.weightKg !== '' && Number.isNaN(weightKg)) {
      setError('Weight must be a valid number.');
      return;
    }
    if (form.volumeCbm !== '' && Number.isNaN(volumeCbm)) {
      setError('Volume must be a valid number.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phoneNumber: form.phoneNumber.trim(),
      originPort: form.originPort.trim(),
      destinationPort: form.destinationPort.trim(),
      cargoType: form.cargoType.trim(),
      containerType: form.containerType.trim(),
      ...(form.weightKg !== '' ? { weightKg } : {}),
      ...(form.volumeCbm !== '' ? { volumeCbm } : {}),
      ...(form.incoterms.trim() ? { incoterms: form.incoterms.trim() } : {}),
      ...(form.preferredShippingDate ? { preferredShippingDate: form.preferredShippingDate } : {}),
      ...(form.additionalInformation.trim()
        ? { additionalInformation: form.additionalInformation.trim() }
        : {}),
    };

    setSubmitting(true);
    try {
      const res = await submitOceanQuote(payload);
      if (res.data?.success) {
        setResult(res.data);
        setForm(initialForm());
      } else {
        setError(res.data?.message || 'Submission failed.');
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to submit.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-10 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white">
            <Ship className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Ocean freight quote request</h1>
          <p className="mt-2 text-sm text-slate-600">
            Submit your shipment details and our team will get back to you.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {result ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-green-600" aria-hidden />
              <h2 className="text-lg font-semibold text-slate-900">Thank you</h2>
              <p className="mt-2 text-sm text-slate-600">{result.message}</p>
              {result.assignment?.assignedToEmployee && (
                <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-left text-sm text-slate-700">
                  Your request was assigned to{' '}
                  <span className="font-medium">{result.assignment.assignedToEmployee.employeeName}</span>
                  {result.assignment.emailToAssigneeSent ? ' — we emailed them so they can reply quickly.' : ''}
                </p>
              )}
              {result.assignment?.assignmentSkippedReason && (
                <p className="mt-4 text-left text-xs text-amber-800">{result.assignment.assignmentSkippedReason}</p>
              )}
              <button
                type="button"
                className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                onClick={() => setResult(null)}
              >
                Submit another request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-700">Full name *</label>
                  <input name="name" required className={inputCls} value={form.name} onChange={handleChange} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Email *</label>
                  <input
                    name="email"
                    type="email"
                    required
                    className={inputCls}
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Phone *</label>
                  <input name="phoneNumber" required className={inputCls} value={form.phoneNumber} onChange={handleChange} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Origin port *</label>
                  <input name="originPort" required className={inputCls} value={form.originPort} onChange={handleChange} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Destination port *</label>
                  <input
                    name="destinationPort"
                    required
                    className={inputCls}
                    value={form.destinationPort}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Cargo type *</label>
                  <input name="cargoType" required className={inputCls} value={form.cargoType} onChange={handleChange} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Container type *</label>
                  <input
                    name="containerType"
                    required
                    className={inputCls}
                    value={form.containerType}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Weight (kg)</label>
                  <input name="weightKg" type="number" min="0" step="any" className={inputCls} value={form.weightKg} onChange={handleChange} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Volume (CBM)</label>
                  <input name="volumeCbm" type="number" min="0" step="any" className={inputCls} value={form.volumeCbm} onChange={handleChange} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Incoterms</label>
                  <input name="incoterms" className={inputCls} value={form.incoterms} onChange={handleChange} placeholder="e.g. FOB" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Preferred shipping date</label>
                  <input
                    name="preferredShippingDate"
                    type="date"
                    className={inputCls}
                    value={form.preferredShippingDate}
                    onChange={handleChange}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-700">Additional information</label>
                  <textarea
                    name="additionalInformation"
                    rows={3}
                    className={inputCls}
                    value={form.additionalInformation}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Submitting…
                  </>
                ) : (
                  'Request quote'
                )}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          <Link to="/" className="text-blue-600 hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
