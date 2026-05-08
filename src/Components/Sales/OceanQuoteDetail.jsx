import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Ship, ArrowLeft, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { getOceanQuoteById } from '../../services/oceanQuoteService.js';
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

/**
 * Backend may store `assignedTo.employeeId` as an ObjectId or populate it into an Employee-like object.
 * React cannot render plain objects as children.
 */
function formatEmployeeRefForDisplay(val) {
  if (val == null || val === '') return null;
  if (typeof val !== 'object') return String(val);
  const dept =
    val.department == null
      ? ''
      : typeof val.department === 'string'
        ? val.department
        : val.department?.name ?? '';
  const parts = [];
  const nameEmp = [val.employeeName, val.empId ? `(${val.empId})` : ''].filter(Boolean).join(' ');
  if (nameEmp) parts.push(nameEmp);
  if (val.email) parts.push(val.email);
  if (dept) parts.push(dept);
  if (val._id != null) parts.push(`ID: ${String(val._id)}`);
  return parts.length ? parts.join(' · ') : null;
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

  const row = (label, value) => {
    let rendered = value;
    if (
      rendered != null &&
      typeof rendered === 'object' &&
      !React.isValidElement(rendered)
    ) {
      rendered = formatEmployeeRefForDisplay(rendered);
    }
    return (
      <div className="grid grid-cols-1 gap-1 border-b border-gray-100 py-3 sm:grid-cols-3 sm:gap-4">
        <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
        <dd className="text-sm text-gray-900 sm:col-span-2 break-words">{rendered ?? '—'}</dd>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/quote-request"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
        >
          <ArrowLeft size={16} aria-hidden /> Back to list
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Ship className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Ocean quote</h1>
            <p className="text-xs text-gray-500 font-mono">{id}</p>
          </div>
        </div>

        {accessError && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {accessError}
          </div>
        )}

        {loading ? (
          <Loader message="Loading quote…" />
        ) : quote ? (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-sm font-semibold text-gray-900">Customer details</h2>
            </div>
            <div className="px-6">
              {row('Name', quote.name)}
              {row(
                'Email',
                quote.email ? (
                  <a href={`mailto:${quote.email}`} className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                    <Mail size={14} aria-hidden />
                    {quote.email}
                  </a>
                ) : null,
              )}
              {row('Phone', quote.phoneNumber)}
            </div>

            <div className="border-t border-gray-100 px-6 py-4">
              <h2 className="text-sm font-semibold text-gray-900">Shipment</h2>
            </div>
            <div className="px-6">
              {row('Origin port', quote.originPort)}
              {row('Destination port', quote.destinationPort)}
              {row('Cargo type', quote.cargoType)}
              {row('Container type', quote.containerType)}
              {row('Weight (kg)', quote.weightKg != null ? String(quote.weightKg) : null)}
              {row('Volume (CBM)', quote.volumeCbm != null ? String(quote.volumeCbm) : null)}
              {row('Incoterms', quote.incoterms)}
              {row('Preferred shipping date', quote.preferredShippingDate)}
              {row('Additional information', quote.additionalInformation)}
            </div>

            <div className="border-t border-gray-100 px-6 py-4">
              <h2 className="text-sm font-semibold text-gray-900">Assignment &amp; system</h2>
            </div>
            <div className="px-6 pb-6">
              {row('Assignee (name)', quote.assignedTo?.employeeName)}
              {row('Assignee emp ID', quote.assignedTo?.empId)}
              {row('Assignee employee', formatEmployeeRefForDisplay(quote.assignedTo?.employeeId))}
              {row(
                'Assignee email',
                quote.assignedTo?.email ? (
                  <a href={`mailto:${quote.assignedTo.email}`} className="text-blue-600 hover:underline">
                    {quote.assignedTo.email}
                  </a>
                ) : null,
              )}
              {row('Assignment email sent at', formatWhen(quote.assignmentNoticeEmailSentAt))}
              {row('Assignment email error', quote.assignmentNoticeEmailError || '—')}
              {row('Created', formatWhen(quote.createdAt))}
              {row('Updated', formatWhen(quote.updatedAt))}
            </div>
          </div>
        ) : (
          !accessError && (
            <p className="text-sm text-gray-500">Unable to load this quote.</p>
          )
        )}
      </div>
    </div>
  );
}
