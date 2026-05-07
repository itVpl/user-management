import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import { Upload, Search, RefreshCw, Download, Pencil } from 'lucide-react';
import {
  downloadSalesDayImportTemplate,
  fetchSalesDayDispositions,
  fetchSalesDayImportBatches,
  fetchSalesDayList,
  importSalesDayCustomers,
  patchSalesDayDisposition,
} from '../../services/salesDayAgentService';
import {
  searchAgentCustomersByCompany,
  setAgentCustomerPassword,
  updateAgentCustomerDetails,
} from '../../services/agentCustomerEventService';
import SalesDayCustomerEditModal from './SalesDayCustomerEditModal.jsx';
import SalesDayAgentManualCustomerForm from './SalesDayAgentManualCustomerForm.jsx';
import { getSavedDispositionNotesForRow } from '../../utils/salesDayAgentEligibility';

/** Matches server CSV order (§3.2 / §3.3). */
const IMPORT_FIELDS = [
  { key: 'companyName', label: 'Company name' },
  { key: 'contactPerson', label: 'Contact person' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'contactNumber', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'whatsappNumber', label: 'WhatsApp' },
  { key: 'commodity', label: 'Commodity' },
  { key: 'companyAddress', label: 'Street / address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'country', label: 'Country' },
  { key: 'zipcode', label: 'Zip / postal' },
  { key: 'shippingTo', label: 'Shipping to' },
];

const HEADER_ALIASES = {
  companyName: ['company', 'company name', 'comp name', 'organization', 'firm'],
  contactPerson: [
    'contact',
    'contact person',
    'person name',
    'contact name',
    'contact_person',
    'person',
  ],
  linkedin: ['linkedin', 'linked in', 'linkedin url'],
  contactNumber: [
    'phone',
    'mobile',
    'cell',
    'contact number',
    'tel',
    'telephone',
    'contact no',
    'primary phone',
    'work phone',
  ],
  email: ['email', 'e mail', 'email address', 'email_address'],
  whatsappNumber: ['whatsapp', 'whats app', 'wa number'],
  commodity: ['commodity', 'product', 'goods'],
  companyAddress: [
    'company address',
    'address',
    'company_address',
    'street',
    'address line 1',
    'comp add',
    'comp_add',
    'address line 2',
    'address 2',
    'suite',
  ],
  city: ['city', 'town'],
  state: ['state', 'province', 'region'],
  country: ['country', 'nation'],
  zipcode: ['zip', 'zipcode', 'zip code', 'postal', 'postal code', 'postal_code', 'postalcode'],
  shippingTo: ['shipping to', 'shipping_to', 'ship to', 'destination'],
};

function normalizeHeader(h) {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function guessColumnMap(headers) {
  const map = {};
  const used = new Set();
  const normHeaders = headers.map((h) => ({ raw: h, n: normalizeHeader(h) }));

  for (const { key } of IMPORT_FIELDS) {
    const base = HEADER_ALIASES[key] || [key.replace(/([A-Z])/g, ' $1').trim().toLowerCase()];
    const spaced = key.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
    const aliases = [...base, spaced, key.toLowerCase()];
    for (let i = 0; i < normHeaders.length; i++) {
      if (used.has(i)) continue;
      const { n } = normHeaders[i];
      if (!n) continue;
      const hit = aliases.some((a) => n === a || n.includes(a) || a.includes(n));
      if (hit) {
        map[key] = i;
        used.add(i);
        break;
      }
    }
  }
  return map;
}

function parseSpreadsheetToMatrix(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buf = e.target?.result;
        const wb = XLSX.read(buf, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function rowToCustomer(row, colMap) {
  const pick = (key) => {
    const idx = colMap[key];
    if (idx == null || idx < 0) return '';
    return String(row[idx] ?? '').trim();
  };
  return {
    companyName: pick('companyName'),
    contactPerson: pick('contactPerson'),
    linkedin: pick('linkedin'),
    contactNumber: pick('contactNumber'),
    email: pick('email'),
    whatsappNumber: pick('whatsappNumber'),
    commodity: pick('commodity'),
    companyAddress: pick('companyAddress'),
    city: pick('city'),
    state: pick('state'),
    country: pick('country'),
    zipcode: pick('zipcode'),
    shippingTo: pick('shippingTo'),
  };
}

function isRowEmpty(c) {
  return !Object.values(c).some((v) => String(v).trim());
}

function isoToDatetimeLocalValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultFollowUpDatetimeLocal() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Prefill notes + datetime-local from saved row / disposition log (edit follow-up). */
function getFollowUpPrefillFromCustomer(row) {
  if (!row || typeof row !== 'object') return { notes: '', datetimeLocal: '' };
  const log = Array.isArray(row.salesDispositionLog) ? row.salesDispositionLog : [];
  for (let i = log.length - 1; i >= 0; i -= 1) {
    const e = log[i];
    if (!e || typeof e !== 'object') continue;
    if (e.disposition === 'follow_up' && e.nextFollowUpAt) {
      return {
        notes: typeof e.notes === 'string' ? e.notes : '',
        datetimeLocal: isoToDatetimeLocalValue(e.nextFollowUpAt),
      };
    }
  }
  const top = row.nextFollowUpAt || row.remindAt || row.salesDayNextFollowUpAt;
  if (top) {
    return { notes: '', datetimeLocal: isoToDatetimeLocalValue(top) };
  }
  return { notes: '', datetimeLocal: '' };
}

export default function SalesDayAgentWorkspace() {
  const [tab, setTab] = useState('import');

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
          <strong className="font-medium text-gray-800">Import file</strong> (CSV/Excel),{' '}
          <strong className="font-medium text-gray-800">Manual add</strong> (event / AgentCustomer), or{' '}
          <strong className="font-medium text-gray-800">Review &amp; filter</strong> for dispositions and edits, or{' '}
          <strong className="font-medium text-gray-800">Agent customer manage</strong> to set password and edit details.
        </p>
        <div
          className="inline-flex flex-wrap gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm shrink-0"
          role="tablist"
          aria-label="Add Agent sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'import'}
            onClick={() => setTab('import')}
            className={`px-4 sm:px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
              tab === 'import'
                ? 'bg-orange-500 border-orange-500 text-white shadow-[0_6px_16px_rgba(249,115,22,0.35)]'
                : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300 hover:text-orange-600'
            }`}
          >
            Import file
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'manual'}
            onClick={() => setTab('manual')}
            className={`px-4 sm:px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
              tab === 'manual'
                ? 'bg-orange-500 border-orange-500 text-white shadow-[0_6px_16px_rgba(249,115,22,0.35)]'
                : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300 hover:text-orange-600'
            }`}
          >
            Manual add
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'browse'}
            onClick={() => setTab('browse')}
            className={`px-4 sm:px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
              tab === 'browse'
                ? 'bg-orange-500 border-orange-500 text-white shadow-[0_6px_16px_rgba(249,115,22,0.35)]'
                : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300 hover:text-orange-600'
            }`}
          >
            Review &amp; filter
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'agent_manage'}
            onClick={() => setTab('agent_manage')}
            className={`px-4 sm:px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
              tab === 'agent_manage'
                ? 'bg-orange-500 border-orange-500 text-white shadow-[0_6px_16px_rgba(249,115,22,0.35)]'
                : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300 hover:text-orange-600'
            }`}
          >
            Agent customer manage
          </button>
        </div>
      </div>
      <div className="border-t border-gray-100 pt-5">
        {tab === 'import' && <ImportPanel />}
        {tab === 'manual' && <SalesDayAgentManualCustomerForm />}
        {tab === 'browse' && <BrowsePanel onGoImport={() => setTab('import')} />}
        {tab === 'agent_manage' && <AgentCustomerManagePanel />}
      </div>
    </div>
  );
}

function AgentCustomerManagePanel() {
  const [searchValue, setSearchValue] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [passwordModal, setPasswordModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [editForm, setEditForm] = useState({
    personName: '',
    companyName: '',
    contactNumber: '',
    whatsappNumber: '',
    email: '',
    linkedin: '',
    companyAddress: '',
    mc_dot_no: '',
    onboardCompany: '',
    companyEmail: '',
    country: '',
    state: '',
    city: '',
    zipcode: '',
    compAdd: '',
    commodity: '',
    shippingTo: '',
  });

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        ...(appliedSearch.trim() ? { companyName: appliedSearch.trim() } : {}),
      };
      const res = await searchAgentCustomersByCompany(params);
      if (res?.success) {
        setCustomers(Array.isArray(res.customers) ? res.customers : []);
        setPagination(
          res.pagination || {
            page,
            limit,
            total: Array.isArray(res.customers) ? res.customers.length : 0,
            totalPages: 1,
          },
        );
      } else {
        toast.error(res?.message || 'Could not load customers');
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not load customers');
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, page, limit]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const openPasswordModal = (customer) => {
    setSelectedCustomer(customer);
    setPasswordForm({ email: customer.email || '', password: '', confirmPassword: '' });
    setPasswordModal(true);
  };

  const openEditModal = (customer) => {
    setSelectedCustomer(customer);
    setEditForm({
      personName: customer.personName || '',
      companyName: customer.companyName || '',
      contactNumber: customer.contactNumber || '',
      whatsappNumber: customer.whatsappNumber || '',
      email: customer.email || '',
      linkedin: customer.linkedin || '',
      companyAddress: customer.companyAddress || '',
      mc_dot_no: customer.mc_dot_no || '',
      onboardCompany: customer.onboardCompany || '',
      companyEmail: customer.companyEmail || '',
      country: customer.country || '',
      state: customer.state || '',
      city: customer.city || '',
      zipcode: customer.zipcode || '',
      compAdd: customer.compAdd || '',
      commodity: customer.commodity || '',
      shippingTo: customer.shippingTo || '',
    });
    setEditModal(true);
  };

  const savePassword = async () => {
    if (!selectedCustomer?._id) return;
    if (!String(passwordForm.email || '').trim()) {
      toast.error('Customer email is required to set/reset password.');
      return;
    }
    if (!passwordForm.password || !passwordForm.confirmPassword) {
      toast.error('Password and confirm password are required.');
      return;
    }
    if (passwordForm.password !== passwordForm.confirmPassword) {
      toast.error('Password and confirm password must match.');
      return;
    }
    if (passwordForm.password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    try {
      await setAgentCustomerPassword(selectedCustomer._id, {
        email: String(passwordForm.email || '').trim(),
        password: passwordForm.password,
        confirmPassword: passwordForm.confirmPassword,
      });
      toast.success('Password saved successfully');
      setPasswordModal(false);
      setSelectedCustomer(null);
      await loadCustomers();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not save password');
    } finally {
      setSaving(false);
    }
  };

  const saveEdits = async () => {
    if (!selectedCustomer?._id) return;
    const changedPayload = Object.keys(editForm).reduce((acc, key) => {
      const prev = String(selectedCustomer?.[key] ?? '').trim();
      const next = String(editForm[key] ?? '').trim();
      if (prev !== next) acc[key] = next;
      return acc;
    }, {});

    if (!Object.keys(changedPayload).length) {
      toast.info('No changes to save.');
      return;
    }

    setSaving(true);
    try {
      await updateAgentCustomerDetails(selectedCustomer._id, changedPayload);
      toast.success('Customer updated successfully');
      setEditModal(false);
      setSelectedCustomer(null);
      await loadCustomers();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not update customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-600">Search by company</label>
            <input
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
              placeholder="Enter company name"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm"
            onClick={() => {
              setPage(1);
              setAppliedSearch(searchValue);
            }}
          >
            <Search size={16} />
            Search
          </button>
        </div>
      </div>

      <div className="do-report-scroll-x overflow-x-auto border border-gray-200 rounded-2xl shadow-sm bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600">Company</th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600">Person</th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600">Email</th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600">Phone</th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600">Password</th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && customers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                  No customers found.
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c._id} className="border-t border-gray-100 odd:bg-white even:bg-slate-50/30">
                  <td className="px-3 py-2">{c.companyName || '—'}</td>
                  <td className="px-3 py-2">{c.personName || '—'}</td>
                  <td className="px-3 py-2">{c.email || '—'}</td>
                  <td className="px-3 py-2">{c.contactNumber || '—'}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        c.hasPassword ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {c.hasPassword ? 'Set' : 'Not set'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        onClick={() => openPasswordModal(c)}
                      >
                        {c.hasPassword ? 'Reset password' : 'Set password'}
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center p-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                        title="Edit customer"
                        onClick={() => openEditModal(c)}
                      >
                        <Pencil size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between text-xs text-gray-600">
        <span>
          Page {pagination.page || page} of {pagination.totalPages || 1} · Rows: {pagination.total || customers.length}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={(pagination.page || page) <= 1}
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <button
            type="button"
            disabled={(pagination.page || page) >= (pagination.totalPages || 1)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-40"
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {passwordModal && selectedCustomer && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-5 space-y-3">
            <h3 className="font-semibold">
              {selectedCustomer.hasPassword ? 'Reset password' : 'Set password'}
            </h3>
            <p className="text-sm text-gray-600">
              {selectedCustomer.companyName} ({selectedCustomer.email || 'No email'})
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
              <input
                type="email"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={passwordForm.email || ''}
                onChange={(e) => setPasswordForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="No email available"
              />
            </div>
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Password"
              value={passwordForm.password}
              onChange={(e) => setPasswordForm((f) => ({ ...f, password: e.target.value }))}
            />
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Confirm password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-2 rounded border text-sm"
                onClick={() => {
                  setPasswordModal(false);
                  setSelectedCustomer(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                className="px-3 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
                onClick={savePassword}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {editModal && selectedCustomer && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-3xl w-full p-5 space-y-3 max-h-[85vh] overflow-auto">
            <h3 className="font-semibold">Edit Agent Customer</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.keys(editForm).map((key) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600">{key}</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={editForm[key]}
                    onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-2 rounded border text-sm"
                onClick={() => {
                  setEditModal(false);
                  setSelectedCustomer(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                className="px-3 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
                onClick={saveEdits}
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ImportPanel() {
  const [rows, setRows] = useState([]);
  /** First-row headers (padded to sheet width); used only for automatic column matching. */
  const [headers, setHeaders] = useState([]);
  const [importBatchId, setImportBatchId] = useState('');
  const [busy, setBusy] = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);

  const colMap = useMemo(() => (headers.length ? guessColumnMap(headers) : {}), [headers]);

  const onDownloadTemplate = async () => {
    setTemplateBusy(true);
    try {
      await downloadSalesDayImportTemplate();
      toast.success('Template downloaded');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not download template');
    } finally {
      setTemplateBusy(false);
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const matrix = await parseSpreadsheetToMatrix(file);
      if (!matrix.length) {
        toast.error('No rows found in file.');
        return;
      }
      const hdr = matrix[0].map((c) => String(c).trim());
      const body = matrix.slice(1).filter((r) => r.some((c) => String(c).trim()));
      const maxRowWidth = body.reduce((w, r) => Math.max(w, Array.isArray(r) ? r.length : 0), 0);
      const width = Math.max(hdr.length, maxRowWidth);
      const paddedHdr = [...hdr];
      while (paddedHdr.length < width) paddedHdr.push('');
      setHeaders(paddedHdr);
      setRows(body);
      toast.success(`Loaded ${body.length} data rows, ${width} column(s)`);
    } catch (err) {
      console.error(err);
      toast.error('Could not parse file. Use CSV or XLSX.');
    }
  };

  const mappedPreview = useMemo(() => {
    return rows.slice(0, 8).map((r) => rowToCustomer(r, colMap));
  }, [rows, colMap]);

  const submitImport = async () => {
    if (!rows.length) {
      toast.error('Choose a file first.');
      return;
    }
    const customers = rows.map((r) => rowToCustomer(r, colMap)).filter((c) => !isRowEmpty(c));
    if (!customers.length) {
      toast.error('No rows with data after mapping.');
      return;
    }
    setBusy(true);
    try {
      const body = {
        customers,
        ...(importBatchId.trim() ? { importBatchId: importBatchId.trim() } : {}),
      };
      const res = await importSalesDayCustomers(body);
      if (res?.success) {
        toast.success(`Created ${res.created ?? 0}${res.failed ? `, failed ${res.failed}` : ''}`);
        if (Array.isArray(res.errors) && res.errors.length) {
          console.warn('Import errors', res.errors);
          const summary = res.errors
            .slice(0, 5)
            .map((er) => {
              const idx = typeof er.index === 'number' ? er.index + 1 : '?';
              const fld = er.field ? ` ${er.field}` : '';
              return `Row ${idx}${fld}: ${er.message || 'failed'}`;
            })
            .join(' · ');
          toast.info(
            res.errors.length > 5
              ? `${summary} · +${res.errors.length - 5} more (see console)`
              : summary,
          );
        }
        setRows([]);
        setHeaders([]);
        setImportBatchId('');
      } else {
        toast.error(res?.message || 'Import failed');
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={templateBusy}
          onClick={onDownloadTemplate}
          className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 hover:border-blue-300 hover:bg-blue-50/40 disabled:opacity-50 transition-colors"
        >
          <Download size={18} className="text-blue-600" />
          {templateBusy ? 'Downloading…' : 'Download template'}
        </button>
        <span className="text-xs text-gray-500 max-w-md leading-relaxed">
          Official CSV columns (UTF-8 BOM) from the server — use this for guaranteed header names.
        </span>
      </div>
      <div>
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl py-12 px-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50/20 transition-colors bg-slate-50/40">
          <Upload className="text-gray-400 mb-3" size={40} />
          <span className="text-sm font-medium text-gray-800">Drop a file or click to browse</span>
          <span className="text-xs text-gray-500 mt-1">CSV or Excel — first row must be headers</span>
          <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFile} />
        </label>
      </div>

      {headers.length > 0 && (
        <>
          <p className="text-xs text-gray-500">
            Columns are detected from your header row. Use <strong className="font-medium text-gray-700">Download
            template</strong> for guaranteed column names, or names like Phone, Email, and City.
          </p>

          <div>
            <label className="text-xs font-semibold text-gray-600">Optional batch id (group this file)</label>
            <input
              className="mt-1.5 w-full md:max-w-md border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
              value={importBatchId}
              onChange={(e) => setImportBatchId(e.target.value)}
              placeholder="e.g. campaign_april"
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Preview (first 8 rows)</h3>
            <div className="do-report-scroll-x overflow-x-auto border border-gray-200 rounded-xl shadow-sm text-xs">
              <table className="min-w-full">
                <thead className="bg-slate-50 text-left sticky top-0 z-10">
                  <tr>
                    {IMPORT_FIELDS.map((f) => (
                      <th
                        key={f.key}
                        className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap"
                      >
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mappedPreview.map((c, i) => (
                    <tr key={i} className="border-t border-gray-100 odd:bg-white even:bg-slate-50/40">
                      {IMPORT_FIELDS.map((f) => (
                        <td key={f.key} className="px-3 py-2 text-gray-800 max-w-[140px] truncate">
                          {c[f.key] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={submitImport}
            className="px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 shadow-sm"
          >
            {busy ? 'Importing…' : 'Import to server'}
          </button>
        </>
      )}
    </div>
  );
}

function BrowsePanel({ onGoImport }) {
  const [dispositions, setDispositions] = useState([]);
  const [batches, setBatches] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 25;

  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [filters, setFilters] = useState({
    search: '',
    date: '',
    commodity: '',
    city: '',
    state: '',
    country: '',
    zipcode: '',
    shippingTo: '',
    disposition: '',
    importBatchId: '',
  });

  const [editCustomer, setEditCustomer] = useState(null);

  const [followUp, setFollowUp] = useState(null);
  const [followUpModalIsEdit, setFollowUpModalIsEdit] = useState(false);
  const [followNotes, setFollowNotes] = useState('');
  const [followAt, setFollowAt] = useState('');
  const [savingId, setSavingId] = useState(null);
  /** Optional notes sent with PATCH disposition when disposition !== follow_up (§3.7). */
  const [dispositionNotesById, setDispositionNotesById] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search), 350);
    return () => clearTimeout(t);
  }, [filters.search]);

  useEffect(() => {
    setPage(1);
  }, [
    filters.date,
    filters.commodity,
    filters.city,
    filters.state,
    filters.country,
    filters.zipcode,
    filters.shippingTo,
    filters.disposition,
    filters.importBatchId,
    debouncedSearch,
  ]);

  const loadMeta = useCallback(async () => {
    try {
      const [d, b] = await Promise.all([fetchSalesDayDispositions(), fetchSalesDayImportBatches()]);
      if (d?.success) setDispositions(d.dispositions || []);
      const batchList =
        b?.importBatchIds ||
        b?.importBatches ||
        b?.batches ||
        b?.batchIds ||
        (Array.isArray(b) ? b : []);
      setBatches(Array.isArray(batchList) ? batchList : []);
    } catch (e) {
      if (e?.response?.status !== 403) console.warn(e);
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
        ...(filters.date ? { date: filters.date } : {}),
        ...(filters.commodity.trim() ? { commodity: filters.commodity.trim() } : {}),
        ...(filters.city.trim() ? { city: filters.city.trim() } : {}),
        ...(filters.state.trim() ? { state: filters.state.trim() } : {}),
        ...(filters.country.trim() ? { country: filters.country.trim() } : {}),
        ...(filters.zipcode.trim() ? { zipcode: filters.zipcode.trim() } : {}),
        ...(filters.shippingTo.trim() ? { shippingTo: filters.shippingTo.trim() } : {}),
        ...(filters.disposition ? { disposition: filters.disposition } : {}),
        ...(filters.importBatchId ? { importBatchId: filters.importBatchId } : {}),
      };
      const data = await fetchSalesDayList(params);
      if (data?.success) {
        setCustomers(data.customers || data.rows || []);
        const t =
          data.total ??
          data.count ??
          data.totalCount ??
          data.pagination?.total ??
          data.pagination?.count;
        setTotal(typeof t === 'number' ? t : (data.customers || data.rows || []).length);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not load list');
    } finally {
      setLoading(false);
    }
  }, [
    page,
    debouncedSearch,
    filters.date,
    filters.commodity,
    filters.city,
    filters.state,
    filters.country,
    filters.zipcode,
    filters.shippingTo,
    filters.disposition,
    filters.importBatchId,
  ]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const totalPages = Math.max(1, Math.ceil((total || 0) / limit));
  const visibleFrom = total > 0 ? (page - 1) * limit + 1 : 0;
  const visibleTo = Math.min(page * limit, total);
  const pageButtons = useMemo(() => {
    if (totalPages <= 1) return [];
    const pages = new Set([1, totalPages, page - 1, page, page + 1]);
    return [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  }, [page, totalPages]);

  const openFollowUpEditor = (row) => {
    const pre = getFollowUpPrefillFromCustomer(row);
    setFollowUpModalIsEdit(true);
    setFollowUp(row);
    setFollowNotes(pre.notes || '');
    setFollowAt(pre.datetimeLocal || defaultFollowUpDatetimeLocal());
  };

  const onDispositionChange = async (row, value) => {
    if (!value) return;
    if (value === 'follow_up') {
      if (row.salesDayDisposition === 'follow_up') {
        openFollowUpEditor(row);
      } else {
        setFollowUpModalIsEdit(false);
        setFollowUp(row);
        setFollowNotes('');
        setFollowAt(defaultFollowUpDatetimeLocal());
      }
      return;
    }
    setSavingId(row._id);
    const notes = (dispositionNotesById[row._id] ?? '').trim() || undefined;
    try {
      await patchSalesDayDisposition(row._id, { disposition: value, ...(notes ? { notes } : {}) });
      toast.success('Updated');
      setDispositionNotesById((m) => {
        const next = { ...m };
        delete next[row._id];
        return next;
      });
      await loadList();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Update failed');
    } finally {
      setSavingId(null);
    }
  };

  /** Notes-only save: PATCH runs only when the dropdown changes; users often type notes after picking disposition. */
  const saveDispositionNotes = async (row) => {
    const disp = row.salesDayDisposition;
    if (!disp) {
      toast.error('Choose a disposition first.');
      return;
    }
    if (disp === 'follow_up') {
      toast.error('Use the follow-up dialog for follow-up notes.');
      return;
    }
    setSavingId(row._id);
    const raw =
      dispositionNotesById[row._id] !== undefined
        ? dispositionNotesById[row._id]
        : getSavedDispositionNotesForRow(row);
    const notes = raw.trim() || undefined;
    try {
      await patchSalesDayDisposition(row._id, {
        disposition: disp,
        ...(notes ? { notes } : {}),
      });
      toast.success('Notes saved');
      setDispositionNotesById((m) => {
        const next = { ...m };
        delete next[row._id];
        return next;
      });
      await loadList();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally {
      setSavingId(null);
    }
  };

  const submitFollowUp = async () => {
    if (!followUp?._id) return;
    if (!followAt) {
      toast.error('Pick date & time for follow-up.');
      return;
    }
    setSavingId(followUp._id);
    try {
      await patchSalesDayDisposition(followUp._id, {
        disposition: 'follow_up',
        notes: followNotes.trim() || undefined,
        nextFollowUpAt: new Date(followAt).toISOString(),
      });
      toast.success(followUpModalIsEdit ? 'Follow-up updated' : 'Follow-up saved');
      setFollowUp(null);
      setFollowUpModalIsEdit(false);
      await loadList();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-blue-50/70 border-b border-gray-100">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-semibold text-slate-800">Filters</h3>
            <span className="text-xs text-gray-500">Narrow by lead details, date, batch, or disposition</span>
          </div>
        </div>
        <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-2">
            <span className="text-xs font-medium text-gray-600">Search</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                placeholder="Name, email, company, phone…"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Date</span>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-xl px-2.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
              value={filters.date}
              onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Commodity</span>
            <input
              className="w-full border border-gray-200 rounded-xl px-2.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
              value={filters.commodity}
              onChange={(e) => setFilters((f) => ({ ...f, commodity: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">City</span>
            <input
              className="w-full border border-gray-200 rounded-xl px-2.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
              value={filters.city}
              onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">State</span>
            <input
              className="w-full border border-gray-200 rounded-xl px-2.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
              value={filters.state}
              onChange={(e) => setFilters((f) => ({ ...f, state: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Country</span>
            <input
              className="w-full border border-gray-200 rounded-xl px-2.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
              value={filters.country}
              onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Zip</span>
            <input
              className="w-full border border-gray-200 rounded-xl px-2.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
              value={filters.zipcode}
              onChange={(e) => setFilters((f) => ({ ...f, zipcode: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Shipping to</span>
            <input
              className="w-full border border-gray-200 rounded-xl px-2.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
              value={filters.shippingTo}
              onChange={(e) => setFilters((f) => ({ ...f, shippingTo: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Disposition</span>
            <select
              className="w-full border border-gray-200 rounded-xl px-2.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
              value={filters.disposition}
              onChange={(e) => setFilters((f) => ({ ...f, disposition: e.target.value }))}
            >
              <option value="">Any</option>
              <option value="__none__">No disposition yet</option>
              {dispositions.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Import batch</span>
            <select
              className="w-full border border-gray-200 rounded-xl px-2.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
              value={filters.importBatchId}
              onChange={(e) => setFilters((f) => ({ ...f, importBatchId: e.target.value }))}
            >
              <option value="">Any</option>
              {batches.map((b) => (
                <option key={String(b)} value={String(b)}>
                  {String(b)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-200/80 pt-4">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm"
            onClick={() => setDebouncedSearch(filters.search.trim())}
          >
            <RefreshCw size={16} />
            Apply search
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
            onClick={() => {
              setFilters({
                search: '',
                date: '',
                commodity: '',
                city: '',
                state: '',
                country: '',
                zipcode: '',
                shippingTo: '',
                disposition: '',
                importBatchId: '',
              });
              setDebouncedSearch('');
              setPage(1);
            }}
          >
            Clear filters
          </button>
          <span className="ml-auto text-xs text-gray-500 font-medium">Rows found: {total}</span>
        </div>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && customers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-slate-50 px-6 py-12 text-center">
          <p className="text-sm font-medium text-gray-800">No rows to show</p>
          <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto">
            Either no leads match these filters, or nothing has been imported yet. Leads only appear here after a
            successful file import.
          </p>
          {typeof onGoImport === 'function' && (
            <button
              type="button"
              onClick={onGoImport}
              className="mt-5 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              Go to Import file
            </button>
          )}
        </div>
      ) : (
        <div className="do-report-scroll-x overflow-x-auto border border-gray-200 rounded-2xl shadow-sm bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-slate-50 to-blue-50/50 text-left sticky top-0 z-10 shadow-[0_1px_0_0_rgb(226_232_240)]">
              <tr>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap">
                  Person
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap">
                  Company
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap">
                  Email
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap">
                  Phone
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap">
                  Commodity
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap">
                  City
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap">
                  St
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap">
                  Zip
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap">
                  Country
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap">
                  Address
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap">
                  Ship to
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap">
                  Batch
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 whitespace-nowrap min-w-[11rem]">
                  Disposition
                </th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-600 w-20 text-center">
                  Edit
                </th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c._id} className="border-t border-gray-100 odd:bg-white even:bg-slate-50/30 hover:bg-blue-50/50 transition-colors">
                  <td className="px-3 py-2">{c.personName || '—'}</td>
                  <td className="px-3 py-2">{c.companyName || '—'}</td>
                  <td className="px-3 py-2 max-w-[120px] truncate">{c.email || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{c.contactNumber || '—'}</td>
                  <td className="px-3 py-2 max-w-[100px] truncate">{c.commodity || '—'}</td>
                  <td className="px-3 py-2">{c.city || '—'}</td>
                  <td className="px-3 py-2">{c.state || '—'}</td>
                  <td className="px-3 py-2">{c.zipcode || '—'}</td>
                  <td className="px-3 py-2">{c.country || '—'}</td>
                  <td className="px-3 py-2 max-w-[140px] truncate text-xs" title={[c.companyAddress, c.compAdd].filter(Boolean).join(' · ') || ''}>
                    {[c.companyAddress, c.compAdd].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="px-3 py-2 max-w-[100px] truncate">{c.shippingTo || '—'}</td>
                  <td className="px-3 py-2 max-w-[90px] truncate text-xs">{c.importBatchId || '—'}</td>
                  <td className="px-3 py-2 align-top min-w-[11rem]">
                    <div className="flex flex-col gap-1.5 max-w-[220px]">
                      <select
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs w-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400"
                        value={c.salesDayDisposition || ''}
                        disabled={savingId === c._id}
                        onChange={(e) => onDispositionChange(c, e.target.value)}
                      >
                        <option value="">—</option>
                        {dispositions.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-1 items-stretch">
                        <input
                          type="text"
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-[11px] min-w-0 flex-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400"
                          placeholder="Notes (optional)"
                          value={
                            dispositionNotesById[c._id] !== undefined
                              ? dispositionNotesById[c._id]
                              : getSavedDispositionNotesForRow(c)
                          }
                          disabled={savingId === c._id}
                          onChange={(e) =>
                            setDispositionNotesById((m) => ({ ...m, [c._id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              saveDispositionNotes(c);
                            }
                          }}
                        />
                        <button
                          type="button"
                          title="Save note without changing disposition"
                          disabled={
                            savingId === c._id ||
                            !c.salesDayDisposition ||
                            c.salesDayDisposition === 'follow_up'
                          }
                          onClick={() => saveDispositionNotes(c)}
                          className="shrink-0 px-2 py-1 rounded-lg border border-gray-200 bg-slate-50 text-[10px] font-semibold text-gray-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50"
                        >
                          Save
                        </button>
                      </div>
                      {c.salesDayDisposition === 'follow_up' && (
                        <button
                          type="button"
                          className="text-[10px] text-blue-600 font-semibold text-left hover:underline disabled:opacity-40"
                          disabled={savingId === c._id}
                          onClick={() => openFollowUpEditor(c)}
                        >
                          Edit follow-up (date &amp; notes)
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      title="Edit fields"
                      className="inline-flex items-center justify-center p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setEditCustomer(c)}
                    >
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && customers.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600 pt-1">
          <span className="font-medium text-gray-700">
            Page {page} of {totalPages}{' '}
            <span className="font-normal text-gray-500">
              ({visibleFrom}-{visibleTo} of {total} rows)
            </span>
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={page <= 1}
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              onClick={() => setPage(1)}
            >
              First
            </button>
            <button
              type="button"
              disabled={page <= 1}
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            {pageButtons.map((p, idx) => (
              <React.Fragment key={p}>
                {idx > 0 && p - pageButtons[idx - 1] > 1 && (
                  <span className="px-1 self-center text-gray-400 select-none">…</span>
                )}
                <button
                  type="button"
                  onClick={() => setPage(p)}
                  className={`min-w-10 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                    p === page
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              </React.Fragment>
            ))}
            <button
              type="button"
              disabled={page >= totalPages}
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              onClick={() => setPage(totalPages)}
            >
              Last
            </button>
          </div>
        </div>
      )}

      <SalesDayCustomerEditModal
        open={!!editCustomer}
        customer={editCustomer}
        onClose={() => setEditCustomer(null)}
        onSaved={() => loadList()}
      />

      {followUp && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-5 space-y-3">
            <h3 className="font-semibold">{followUpModalIsEdit ? 'Edit follow-up' : 'Follow-up'}</h3>
            <p className="text-sm text-gray-600">
              {followUp.personName} — {followUp.companyName}
            </p>
            <textarea
              className="w-full border rounded-lg px-2 py-2 text-sm"
              rows={3}
              placeholder="Notes (optional)"
              value={followNotes}
              onChange={(e) => setFollowNotes(e.target.value)}
            />
            <input
              type="datetime-local"
              className="w-full border rounded-lg px-2 py-2 text-sm"
              value={followAt}
              onChange={(e) => setFollowAt(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-2 rounded border text-sm"
                onClick={() => {
                  setFollowUp(null);
                  setFollowUpModalIsEdit(false);
                  loadList();
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingId === followUp._id}
                className="px-3 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
                onClick={submitFollowUp}
              >
                {followUpModalIsEdit ? 'Save changes' : 'Save follow-up'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
