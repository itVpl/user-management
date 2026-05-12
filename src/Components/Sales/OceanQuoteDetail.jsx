import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Ship, ArrowLeft, Mail, FileText, ClipboardList, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { getOceanQuoteById } from '../../services/oceanQuoteService.js';
import { formatEmployeeRefForDisplay } from '../../utils/oceanQuoteDisplay.js';
import Loader from '../common/Loader.jsx';
import { toast } from 'react-toastify';

function formatWhen(d) {
  if (!d) return '—';
  try {
    return format(new Date(d), 'dd MMM yyyy, HH:mm');
  } catch {
    return '—';
  }
}

function formatDateOnly(d) {
  if (!d) return null;
  try {
    return format(new Date(d), 'dd MMM yyyy');
  } catch {
    return null;
  }
}

function DetailField({ label, value, multiline }) {
  const display =
    value === undefined || value === null || String(value).trim() === '' ? 'N/A' : String(value);
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold text-gray-900 ${multiline ? 'whitespace-pre-wrap' : ''}`}>
        {display}
      </p>
    </div>
  );
}

export default function OceanQuoteDetail() {
  const { id } = useParams();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) return;
      setLoading(true);
      setAccessError(null);
      try {
        const res = await getOceanQuoteById(id);
        if (!cancelled && res.data?.success) {
          setQuote(res.data.data);
        } else if (!cancelled) {
          toast.error(res.data?.message || 'Failed to load quote');
          setQuote(null);
        }
      } catch (err) {
        if (cancelled) return;
        const status = err?.response?.status;
        const msg = err?.response?.data?.message || err?.message || 'Failed to load quote';
        if (status === 403) {
          setAccessError(msg);
        } else if (status === 404) {
          setAccessError('This quote was not found.');
        } else {
          toast.error(msg);
        }
        setQuote(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4">
          <Link
            to="/quote-request"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft size={16} aria-hidden /> Back to list
          </Link>
        </div>

        {accessError && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {accessError}
          </div>
        )}

        {loading ? (
          <Loader message="Loading quote…" />
        ) : quote ? (
          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <Eye size={20} />
                </div>
                <div>
                  <h1 className="text-xl font-semibold">Ocean quote detail</h1>
                  <p className="text-sm text-blue-100">Quote request — customer and shipment details</p>
                </div>
              </div>
            </div>

            <div className="space-y-5 bg-gray-50 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quote ID</p>
                  <p className="mt-1 font-mono text-lg font-bold text-slate-900 break-all">{quote._id || id}</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/80 p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Preferred shipping</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {formatDateOnly(quote.preferredShippingDate) ?? 'N/A'}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-5">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-blue-900">
                  <FileText size={18} className="text-blue-600" />
                  Customer details
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <DetailField label="Name" value={quote.name} />
                  <div>
                    <p className="text-xs font-medium text-gray-500">Email</p>
                    {quote.email ? (
                      <a
                        href={`mailto:${quote.email}`}
                        className="mt-0.5 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline"
                      >
                        <Mail size={14} aria-hidden />
                        {quote.email}
                      </a>
                    ) : (
                      <p className="mt-0.5 text-sm font-semibold text-gray-900">N/A</p>
                    )}
                  </div>
                  <DetailField label="Phone" value={quote.phoneNumber} />
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-5">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-emerald-900">
                  <Ship size={18} className="text-emerald-600" />
                  Shipment details
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <DetailField label="Origin port" value={quote.originPort} />
                  <DetailField label="Destination port" value={quote.destinationPort} />
                  <DetailField label="Cargo type" value={quote.cargoType} />
                  <DetailField label="Container type" value={quote.containerType} />
                  <DetailField
                    label="Weight (kg)"
                    value={quote.weightKg != null ? String(quote.weightKg) : undefined}
                  />
                  <DetailField
                    label="Volume (CBM)"
                    value={quote.volumeCbm != null ? String(quote.volumeCbm) : undefined}
                  />
                  <DetailField label="Incoterms" value={quote.incoterms} />
                  <DetailField label="Preferred shipping date" value={quote.preferredShippingDate} />
                  <div className="md:col-span-2">
                    <DetailField label="Additional information" value={quote.additionalInformation} multiline />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/80 p-5">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-indigo-900">
                  <ClipboardList size={18} className="text-indigo-600" />
                  Assignment &amp; system
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <DetailField label="Assignee (name)" value={quote.assignedTo?.employeeName} />
                  <DetailField label="Assignee emp ID" value={quote.assignedTo?.empId} />
                  <DetailField
                    label="Assignee employee"
                    value={formatEmployeeRefForDisplay(quote.assignedTo?.employeeId)}
                  />
                  <div>
                    <p className="text-xs font-medium text-gray-500">Assignee email</p>
                    {quote.assignedTo?.email ? (
                      <a
                        href={`mailto:${quote.assignedTo.email}`}
                        className="mt-0.5 text-sm font-semibold text-blue-600 hover:underline"
                      >
                        {quote.assignedTo.email}
                      </a>
                    ) : (
                      <p className="mt-0.5 text-sm font-semibold text-gray-900">N/A</p>
                    )}
                  </div>
                  <DetailField
                    label="Assignment email sent at"
                    value={formatWhen(quote.assignmentNoticeEmailSentAt)}
                  />
                  <DetailField
                    label="Assignment email error"
                    value={quote.assignmentNoticeEmailError}
                    multiline
                  />
                  <DetailField label="Created" value={formatWhen(quote.createdAt)} />
                  <DetailField label="Updated" value={formatWhen(quote.updatedAt)} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          !accessError && <p className="text-sm text-gray-500">Unable to load this quote.</p>
        )}
      </div>
    </div>
  );
}
