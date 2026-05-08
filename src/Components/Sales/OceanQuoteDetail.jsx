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

const BTN_BACK =
  'cursor-pointer inline-flex shrink-0 items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50';

const SECTION_TITLE = 'text-base font-semibold text-gray-900';
const LABEL = 'text-sm font-semibold uppercase tracking-wide text-gray-500';
const VALUE = 'text-base font-medium text-gray-900';

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
      <div className="grid grid-cols-1 gap-2 py-4 sm:grid-cols-12 sm:items-start sm:gap-4">
        <dt className={`${LABEL} sm:col-span-4`}>{label}</dt>
        <dd className={`${VALUE} break-words sm:col-span-8`}>{rendered ?? '—'}</dd>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        {/* Same outer width/padding as list; one horizontal bar on sm+ */}
        <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-3">
          <Link to="/quote-request" className={BTN_BACK}>
            <ArrowLeft size={18} aria-hidden /> Back to list
          </Link>
          <div className="hidden h-8 w-px shrink-0 bg-gray-200 sm:block" aria-hidden />
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:flex-initial">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Ship className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight text-gray-900">Ocean quote detail</h1>
              <p className="truncate font-mono text-sm text-gray-500" title={id}>
                {id}
              </p>
            </div>
          </div>
        </div>

        {accessError && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-900">
            {accessError}
          </div>
        )}

        {loading ? (
          <Loader message="Loading quote…" />
        ) : quote ? (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 bg-gray-50/80 px-5 py-3">
              <h2 className={SECTION_TITLE}>Customer details</h2>
            </div>
            <dl className="divide-y divide-gray-200 px-5">
              {row('Name', quote.name)}
              {row(
                'Email',
                quote.email ? (
                  <a
                    href={`mailto:${quote.email}`}
                    className="cursor-pointer inline-flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    <Mail size={16} aria-hidden />
                    {quote.email}
                  </a>
                ) : null,
              )}
              {row('Phone', quote.phoneNumber)}
            </dl>

            <div className="border-t border-gray-100 bg-gray-50/80 px-5 py-3">
              <h2 className={SECTION_TITLE}>Shipment</h2>
            </div>
            <dl className="divide-y divide-gray-200 px-5">
              {row('Origin port', quote.originPort)}
              {row('Destination port', quote.destinationPort)}
              {row('Cargo type', quote.cargoType)}
              {row('Container type', quote.containerType)}
              {row('Weight (kg)', quote.weightKg != null ? String(quote.weightKg) : null)}
              {row('Volume (CBM)', quote.volumeCbm != null ? String(quote.volumeCbm) : null)}
              {row('Incoterms', quote.incoterms)}
              {row('Preferred shipping date', quote.preferredShippingDate)}
              {row('Additional information', quote.additionalInformation)}
            </dl>

            <div className="border-t border-gray-100 bg-gray-50/80 px-5 py-3">
              <h2 className={SECTION_TITLE}>Assignment &amp; system</h2>
            </div>
            <dl className="divide-y divide-gray-200 px-5 pb-1">
              {row('Assignee (name)', quote.assignedTo?.employeeName)}
              {row('Assignee emp ID', quote.assignedTo?.empId)}
              {row('Assignee employee', formatEmployeeRefForDisplay(quote.assignedTo?.employeeId))}
              {row(
                'Assignee email',
                quote.assignedTo?.email ? (
                  <a
                    href={`mailto:${quote.assignedTo.email}`}
                    className="cursor-pointer text-blue-600 hover:underline"
                  >
                    {quote.assignedTo.email}
                  </a>
                ) : null,
              )}
              {row('Assignment email sent at', formatWhen(quote.assignmentNoticeEmailSentAt))}
              {row('Assignment email error', quote.assignmentNoticeEmailError || '—')}
              {row('Created', formatWhen(quote.createdAt))}
              {row('Updated', formatWhen(quote.updatedAt))}
            </dl>
          </div>
        ) : (
          !accessError && <p className="text-base text-gray-500">Unable to load this quote.</p>
        )}
      </div>
    </div>
  );
}
