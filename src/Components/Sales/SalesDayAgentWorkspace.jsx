import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import { Upload, Search, RefreshCw, Download, Mail, Lock, X } from 'lucide-react';
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

/** Matches manual form styling for modals (no shadow on card). */
const MODAL_SHELL = 'rounded-2xl border border-gray-200 bg-white w-full flex flex-col overflow-hidden max-h-[90vh]';
const MODAL_HEADER = 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-4 shrink-0';
const MODAL_FIELD =
  'w-full px-4 py-3 border rounded-xl text-base text-gray-900 placeholder:text-gray-400 bg-white border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400';
const MODAL_LABEL = 'text-sm font-semibold text-gray-700';

/** Agent manage edit drawer: explicit order + readable labels (+ scroll body shows all rows). */
const AGENT_CUSTOMER_EDIT_FIELDS = [
  { key: 'personName', label: 'Person name', multiline: false },
  { key: 'companyName', label: 'Company name', multiline: false },
  { key: 'email', label: 'Email', multiline: false },
  { key: 'contactNumber', label: 'Contact number', multiline: false },
  { key: 'whatsappNumber', label: 'WhatsApp', multiline: false },
  { key: 'linkedin', label: 'LinkedIn', multiline: false },
  { key: 'commodity', label: 'Commodity', multiline: false },
  { key: 'companyEmail', label: 'Company email', multiline: false },
  { key: 'mc_dot_no', label: 'MC / DOT no.', multiline: false },
  { key: 'onboardCompany', label: 'Onboard company', multiline: false },
  { key: 'city', label: 'City', multiline: false },
  { key: 'state', label: 'State', multiline: false },
  { key: 'country', label: 'Country', multiline: false },
  { key: 'zipcode', label: 'Zip / postal', multiline: false },
  { key: 'shippingTo', label: 'Shipping to', multiline: false },
  { key: 'companyAddress', label: 'Company address', multiline: true, rows: 3 },
  { key: 'compAdd', label: 'Company address (alt)', multiline: true, rows: 2 },
];

function pickCustomerStr(customer, aliases) {
  if (!customer) return '';
  for (const prop of aliases) {
    const v = customer[prop];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v);
  }
  for (const prop of aliases) {
    const v = customer[prop];
    if (v !== undefined && v !== null) return String(v);
  }
  return '';
}

function customerToAgentEditForm(customer) {
  return {
    personName: pickCustomerStr(customer, ['personName', 'person_name', 'contactPerson', 'contact_person', 'name']),
    companyName: pickCustomerStr(customer, ['companyName', 'company_name', 'organisation', 'organization']),
    contactNumber: pickCustomerStr(customer, ['contactNumber', 'contact_number', 'phone', 'mobile', 'tel']),
    whatsappNumber: pickCustomerStr(customer, ['whatsappNumber', 'whatsapp', 'whatsapp_number']),
    email: pickCustomerStr(customer, ['email', 'emailAddress', 'Email']),
    linkedin: pickCustomerStr(customer, ['linkedin', 'linkedinUrl']),
    companyAddress: pickCustomerStr(customer, ['companyAddress', 'company_address', 'street', 'address']),
    mc_dot_no: pickCustomerStr(customer, ['mc_dot_no', 'mcDotNo']),
    onboardCompany: pickCustomerStr(customer, ['onboardCompany', 'onboard_company']),
    companyEmail: pickCustomerStr(customer, ['companyEmail', 'company_email']),
    country: pickCustomerStr(customer, ['country']),
    state: pickCustomerStr(customer, ['state', 'province']),
    city: pickCustomerStr(customer, ['city', 'town']),
    zipcode: pickCustomerStr(customer, ['zipcode', 'zip', 'postalCode', 'postal_code']),
    compAdd: pickCustomerStr(customer, ['compAdd', 'comp_add', 'secondaryAddress']),
    commodity: pickCustomerStr(customer, ['commodity', 'product']),
    shippingTo: pickCustomerStr(customer, ['shippingTo', 'shipping_to', 'shipTo']),
  };
}

const EMPTY_AGENT_EDIT_FORM = customerToAgentEditForm({});

const TABLE_STYLE = {
  shell: 'do-report-scroll-x overflow-x-auto rounded-2xl border border-gray-200 bg-gray-50 p-3',
  table: 'min-w-full border-separate border-spacing-y-2.5 text-[13px] font-sans',
  head: 'text-left',
  th: 'px-4 py-3 text-[14px] font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap bg-white border-y border-gray-200',
  row: 'bg-white',
  td: 'px-4 py-3 text-[16px] font-medium text-gray-700 align-middle bg-white border-y border-gray-200',
  tdStart: 'rounded-l-xl border-l border-gray-200',
  tdEnd: 'rounded-r-xl border-r border-gray-200',
};

const PAGINATION_STYLE = {
  wrap: 'mt-4 w-full rounded-xl border border-gray-200 bg-white px-4 py-3',
  meta: 'text-base text-gray-500',
  nav: 'flex items-center gap-1 gap-x-2',
  link: 'cursor-pointer px-2 py-0.5 text-base font-medium text-gray-700 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent',
  /** Inactive: border-2 transparent matches active layout; tight box (no oversized padding) */
  pageBtn:
    'cursor-pointer min-w-8 h-8 px-1.5 inline-flex items-center justify-center rounded-md text-base font-semibold tabular-nums transition-colors box-border leading-none',
  pageInactive: 'border-2 border-transparent text-gray-800 hover:bg-gray-100',
  pageActive: 'border-1 border-black text-black font-bold bg-gray-50/90 hover:bg-gray-100',
  dots: 'px-0.5 text-gray-500 select-none text-base font-medium',
};

function paginationPageNum(v, fallback = 1) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

/** Truncate long text inside table cells — inner span improves ellipsis reliably. */
function TruncTd({ children, title }) {
  const t = typeof title === 'string' ? title.trim() : title;
  return (
    <span className="block min-w-0 max-w-full truncate" title={t ? t : undefined}>
      {children}
    </span>
  );
}

export default function SalesDayAgentWorkspace() {
  const [tab, setTab] = useState('import');

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex justify-center">
        {/* <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
          <strong className="font-medium text-gray-800">Import file</strong> (CSV/Excel),{' '}
          <strong className="font-medium text-gray-800">Manual add</strong> (event / AgentCustomer), or{' '}
          <strong className="font-medium text-gray-800">Review &amp; filter</strong> for dispositions and edits, or{' '}
          <strong className="font-medium text-gray-800">Agent customer manage</strong> to set password and edit details.
        </p> */}
        <div
          className="inline-flex flex-wrap gap-2 rounded-2xl border border-gray-200 bg-white p-2 shrink-0"
          role="tablist"
          aria-label="Add Agent sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'import'}
            onClick={() => setTab('import')}
            className={`px-4 sm:px-5 py-2.5 rounded-xl border text-medium font-semibold transition-all cursor-pointer ${
              tab === 'import'
                ? 'bg-orange-500 border-orange-500 text-white'
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
            className={`px-4 sm:px-5 py-2.5 rounded-xl border text-medium font-semibold transition-all cursor-pointer ${
              tab === 'manual'
                ? 'bg-orange-500 border-orange-500 text-white'
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
            className={`px-4 sm:px-5 py-2.5 rounded-xl border text-medium font-semibold transition-all cursor-pointer ${
              tab === 'browse'
                ? 'bg-orange-500 border-orange-500 text-white'
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
            className={`px-4 sm:px-5 py-2.5 rounded-xl border text-medium font-semibold transition-all cursor-pointer ${
              tab === 'agent_manage'
                ? 'bg-orange-500 border-orange-500 text-white'
                : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300 hover:text-orange-600'
            }`}
          >
            Agent customer manage
          </button>
        </div>
        </div>
      </div>
      <div>
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
  const [limit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [passwordModal, setPasswordModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [editForm, setEditForm] = useState(EMPTY_AGENT_EDIT_FORM);
  /** Snapshot when modal opened — correct dirty-diff even if API uses alternate field names */
  const [editBaseline, setEditBaseline] = useState(EMPTY_AGENT_EDIT_FORM);

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

  const currentPage = paginationPageNum(pagination.page ?? page, 1);
  const totalPages = paginationPageNum(pagination.totalPages, 1) || 1;
  const totalRows = pagination.total || customers.length;
  const fromRow = totalRows > 0 ? (currentPage - 1) * limit + 1 : 0;
  const toRow = Math.min(currentPage * limit, totalRows);
  const pageButtons = useMemo(() => {
    if (totalPages <= 1) return [1];
    const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    return [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  }, [currentPage, totalPages]);

  const openPasswordModal = (customer) => {
    setSelectedCustomer(customer);
    setPasswordForm({ email: customer.email || '', password: '', confirmPassword: '' });
    setPasswordModal(true);
  };

  const openEditModal = (customer) => {
    setSelectedCustomer(customer);
    const next = customerToAgentEditForm(customer);
    setEditForm(next);
    setEditBaseline(next);
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
      const prev = String(editBaseline[key] ?? '').trim();
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
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            {/* <label className="text-xs font-medium text-gray-600">Search by company</label> */}
            <input
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
              placeholder="Search by company name"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
          <button
            type="button"
            className=" inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-medium font-semibold hover:bg-slate-800 transition-colors"
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

      <div className={TABLE_STYLE.shell}>
        <table className={TABLE_STYLE.table}>
          <thead className={TABLE_STYLE.head}>
            <tr>
              <th className={`${TABLE_STYLE.th} ${TABLE_STYLE.tdStart}`}>Company</th>
              <th className={TABLE_STYLE.th}>Person</th>
              <th className={TABLE_STYLE.th}>Email</th>
              <th className={TABLE_STYLE.th}>Phone</th>
              <th className={TABLE_STYLE.th}>Password</th>
              <th className={`${TABLE_STYLE.th} ${TABLE_STYLE.tdEnd} text-center`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && customers.length === 0 ? (
              <tr className={TABLE_STYLE.row}>
                <td colSpan={6} className={`${TABLE_STYLE.td} ${TABLE_STYLE.tdStart} ${TABLE_STYLE.tdEnd} py-8 text-center text-sm text-gray-500`}>
                  No customers found.
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c._id} className={TABLE_STYLE.row}>
                  <td className={`${TABLE_STYLE.td} ${TABLE_STYLE.tdStart} max-w-[9rem]`}>
                    <TruncTd title={c.companyName}>{c.companyName || '—'}</TruncTd>
                  </td>
                  <td className={`${TABLE_STYLE.td} max-w-[8rem]`}>
                    <TruncTd title={c.personName}>{c.personName || '—'}</TruncTd>
                  </td>
                  <td className={`${TABLE_STYLE.td} max-w-[10rem]`}>
                    <TruncTd title={c.email}>{c.email || '—'}</TruncTd>
                  </td>
                  <td className={TABLE_STYLE.td}>{c.contactNumber || '—'}</td>
                  <td className={TABLE_STYLE.td}>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[14px] font-semibold ${
                        c.hasPassword ? 'bg-emerald-100 text-[14px]' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {c.hasPassword ? 'Set' : 'Not set'}
                    </span>
                  </td>
                  <td className={`${TABLE_STYLE.td} ${TABLE_STYLE.tdEnd}`}>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        className="cursor-pointer px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-[15px] font-semibold text-gray-700 hover:bg-gray-50"
                        onClick={() => openPasswordModal(c)}
                      >
                        {c.hasPassword ? 'Reset password' : 'Set password'}
                      </button>
                      <button
                        type="button"
                        className="cursor-pointer inline-flex items-center justify-center p-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                        title="Edit customer"
                        onClick={() => openEditModal(c)}
                      >
                        {/* <Pencil size={13} /> */}
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={`${PAGINATION_STYLE.wrap} flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`}>
        <span className={PAGINATION_STYLE.meta}>
          Showing {fromRow} to {toRow} of {totalRows} employees
        </span>
        <div className={PAGINATION_STYLE.nav}>
          <button
            type="button"
            disabled={currentPage <= 1}
            className={PAGINATION_STYLE.link}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          {pageButtons.map((p, idx) => (
            <React.Fragment key={p}>
              {idx > 0 && p - pageButtons[idx - 1] > 1 && <span className={PAGINATION_STYLE.dots}>...</span>}
              <button
                type="button"
                onClick={() => setPage(p)}
                aria-current={paginationPageNum(p, 1) === currentPage ? 'page' : undefined}
                className={`${PAGINATION_STYLE.pageBtn} ${
                  paginationPageNum(p, 1) === currentPage
                    ? PAGINATION_STYLE.pageActive
                    : PAGINATION_STYLE.pageInactive
                }`}
              >
                {p}
              </button>
            </React.Fragment>
          ))}
          <button
            type="button"
            disabled={currentPage >= totalPages}
            className={PAGINATION_STYLE.link}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {passwordModal && selectedCustomer && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
          <div className={`max-w-md ${MODAL_SHELL}`}>
            <div className={`${MODAL_HEADER} flex items-start justify-between gap-2`}>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {selectedCustomer.hasPassword ? 'Reset password' : 'Set password'}
                </h2>
                <p className="text-base text-blue-100/95 mt-1 leading-snug">
                  {pickCustomerStr(selectedCustomer, ['companyName', 'company_name']) || 'Customer'} —{' '}
                  {pickCustomerStr(selectedCustomer, ['email']) || 'No email'}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                className="shrink-0 rounded-lg p-2 text-white/90 hover:bg-white/15"
                onClick={() => {
                  setPasswordModal(false);
                  setSelectedCustomer(null);
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto min-h-0">
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 space-y-4">
                <div>
                  <label className={`${MODAL_LABEL} block mb-1.5`} htmlFor="acm-password-email">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      id="acm-password-email"
                      type="email"
                      className={`${MODAL_FIELD} pl-11`}
                      value={passwordForm.email ?? ''}
                      onChange={(e) => setPasswordForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="Customer email"
                    />
                  </div>
                </div>
                <div>
                  <label className={`${MODAL_LABEL} block mb-1.5`} htmlFor="acm-password-new">
                    New password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      id="acm-password-new"
                      type="password"
                      className={`${MODAL_FIELD} pl-11`}
                      placeholder="At least 8 characters"
                      value={passwordForm.password ?? ''}
                      autoComplete="new-password"
                      onChange={(e) => setPasswordForm((f) => ({ ...f, password: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className={`${MODAL_LABEL} block mb-1.5`} htmlFor="acm-password-confirm">
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      id="acm-password-confirm"
                      type="password"
                      className={`${MODAL_FIELD} pl-11`}
                      placeholder="Re-enter password"
                      value={passwordForm.confirmPassword ?? ''}
                      autoComplete="new-password"
                      onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-100 px-5 py-4 flex justify-end gap-3 shrink-0 bg-white">
              <button
                type="button"
                className="px-5 py-3 rounded-xl border border-gray-300 bg-white text-base font-semibold text-gray-700 hover:bg-gray-50"
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
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-base font-semibold hover:from-blue-700 hover:to-violet-700 disabled:opacity-50"
                onClick={savePassword}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editModal && selectedCustomer && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
          <div className={`max-w-3xl ${MODAL_SHELL}`}>
            <div className={`${MODAL_HEADER} flex items-start justify-between gap-2`}>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Edit Agent Customer</h2>
                <p className="text-base text-blue-100/95 mt-1 leading-snug">
                  {pickCustomerStr(selectedCustomer, ['companyName', 'company_name']) || 'Customer'}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                className="shrink-0 rounded-lg p-2 text-white/90 hover:bg-white/15"
                onClick={() => {
                  setEditModal(false);
                  setSelectedCustomer(null);
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-5">
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-5 space-y-4">
                <h3 className="text-base font-semibold text-blue-900">Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {AGENT_CUSTOMER_EDIT_FIELDS.filter((f) => !f.multiline).map((f) => (
                    <div key={f.key}>
                      <label className={`${MODAL_LABEL} block mb-1.5`} htmlFor={`acm-edit-${f.key}`}>
                        {f.label}
                      </label>
                      <input
                        id={`acm-edit-${f.key}`}
                        className={MODAL_FIELD}
                        value={editForm[f.key] ?? ''}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  {AGENT_CUSTOMER_EDIT_FIELDS.filter((f) => f.multiline).map((f) => (
                    <div key={f.key}>
                      <label className={`${MODAL_LABEL} block mb-1.5`} htmlFor={`acm-edit-${f.key}-ta`}>
                        {f.label}
                      </label>
                      <textarea
                        id={`acm-edit-${f.key}-ta`}
                        rows={f.rows ?? 3}
                        className={`${MODAL_FIELD} resize-y min-h-[5rem] leading-relaxed`}
                        value={editForm[f.key] ?? ''}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t border-gray-100 px-5 py-4 flex justify-end gap-3 shrink-0 bg-white">
              <button
                type="button"
                className="px-5 py-3 rounded-xl border border-gray-300 bg-white text-base font-semibold text-gray-700 hover:bg-gray-50"
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
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-base font-semibold hover:from-blue-700 hover:to-violet-700 disabled:opacity-50"
                onClick={saveEdits}
              >
                {saving ? 'Saving…' : 'Save changes'}
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
        {/* <span className="text-xs text-gray-500 max-w-md leading-relaxed">
          Official CSV columns (UTF-8 BOM) from the server — use this for guaranteed header names.
        </span> */}
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
            <div className={TABLE_STYLE.shell}>
              <table className={TABLE_STYLE.table}>
                <thead className={`${TABLE_STYLE.head} sticky top-0 z-10`}>
                  <tr>
                    {IMPORT_FIELDS.map((f, idx) => (
                      <th
                        key={f.key}
                        className={`${TABLE_STYLE.th} ${idx === 0 ? TABLE_STYLE.tdStart : ''} ${
                          idx === IMPORT_FIELDS.length - 1 ? TABLE_STYLE.tdEnd : ''
                        }`}
                      >
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mappedPreview.map((c, i) => (
                    <tr key={i} className={TABLE_STYLE.row}>
                      {IMPORT_FIELDS.map((f) => (
                        <td
                          key={f.key}
                          className={`${TABLE_STYLE.td} text-gray-800 max-w-[140px] truncate ${
                            f.key === IMPORT_FIELDS[0].key ? TABLE_STYLE.tdStart : ''
                          } ${f.key === IMPORT_FIELDS[IMPORT_FIELDS.length - 1].key ? TABLE_STYLE.tdEnd : ''}`}
                        >
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
            className="px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
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
  const limit = 10;

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
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-blue-50/70 border-b border-gray-100">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-semibold text-slate-800">Filters</h3>
            {/* <span className="text-xs text-gray-500">Narrow by lead details, date, batch, or disposition</span> */}
          </div>
        </div>
        <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-600">Search</span>
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
            <span className="text-sm font-medium text-gray-600">Date</span>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-xl px-2.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
              value={filters.date}
              onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-600">Commodity</span>
            <input
              className="w-full border border-gray-200 rounded-xl px-2.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
              value={filters.commodity}
              onChange={(e) => setFilters((f) => ({ ...f, commodity: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-600">City</span>
            <input
              className="w-full border border-gray-200 rounded-xl px-2.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
              value={filters.city}
              onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-600">State</span>
            <input
              className="w-full border border-gray-200 rounded-xl px-2.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
              value={filters.state}
              onChange={(e) => setFilters((f) => ({ ...f, state: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-600">Country</span>
            <input
              className="w-full border border-gray-200 rounded-xl px-2.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
              value={filters.country}
              onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-600">Zip</span>
            <input
              className="w-full border border-gray-200 rounded-xl px-2.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
              value={filters.zipcode}
              onChange={(e) => setFilters((f) => ({ ...f, zipcode: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-600">Shipping to</span>
            <input
              className="w-full border border-gray-200 rounded-xl px-2.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400"
              value={filters.shippingTo}
              onChange={(e) => setFilters((f) => ({ ...f, shippingTo: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-600">Disposition</span>
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
            <span className="text-sm font-medium text-gray-600">Import batch</span>
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
            className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
            onClick={() => setDebouncedSearch(filters.search.trim())}
          >
            <RefreshCw size={16} />
            Apply search
          </button>
          <button
            type="button"
            className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
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
        <div className={TABLE_STYLE.shell}>
          <table className={TABLE_STYLE.table}>
            <thead className={`${TABLE_STYLE.head} sticky top-0 z-10`}>
              <tr>
                <th className={`${TABLE_STYLE.th} ${TABLE_STYLE.tdStart}`}>
                  Person
                </th>
                <th className={TABLE_STYLE.th}>
                  Company
                </th>
                <th className={TABLE_STYLE.th}>
                  Email
                </th>
                <th className={TABLE_STYLE.th}>
                  Phone
                </th>
                <th className={TABLE_STYLE.th}>
                  Commodity
                </th>
                <th className={TABLE_STYLE.th}>
                  City
                </th>
                <th className={TABLE_STYLE.th}>
                  St
                </th>
                <th className={TABLE_STYLE.th}>
                  Zip
                </th>
                <th className={TABLE_STYLE.th}>
                  Country
                </th>
                <th className={TABLE_STYLE.th}>
                  Address
                </th>
                <th className={TABLE_STYLE.th}>
                  Ship to
                </th>
                <th className={TABLE_STYLE.th}>
                  Batch
                </th>
                <th className={`${TABLE_STYLE.th} min-w-[11rem]`}>
                  Disposition
                </th>
                <th className={`${TABLE_STYLE.th} ${TABLE_STYLE.tdEnd} w-20 text-center`}>
                  Edit
                </th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c._id} className={`${TABLE_STYLE.row} hover:bg-blue-50/50 transition-colors`}>
                  <td className={`${TABLE_STYLE.td} ${TABLE_STYLE.tdStart} max-w-[8.5rem]`}>
                    <TruncTd title={c.personName}>{c.personName || '—'}</TruncTd>
                  </td>
                  <td className={`${TABLE_STYLE.td} max-w-[10rem]`}>
                    <TruncTd title={c.companyName}>{c.companyName || '—'}</TruncTd>
                  </td>
                  <td className={`${TABLE_STYLE.td} max-w-[11rem]`}>
                    <TruncTd title={c.email}>{c.email || '—'}</TruncTd>
                  </td>
                  <td className={`${TABLE_STYLE.td} whitespace-nowrap`}>{c.contactNumber || '—'}</td>
                  <td className={`${TABLE_STYLE.td} max-w-[100px] truncate`}>{c.commodity || '—'}</td>
                  <td className={TABLE_STYLE.td}>{c.city || '—'}</td>
                  <td className={TABLE_STYLE.td}>{c.state || '—'}</td>
                  <td className={TABLE_STYLE.td}>{c.zipcode || '—'}</td>
                  <td className={TABLE_STYLE.td}>{c.country || '—'}</td>
                  <td className={`${TABLE_STYLE.td} max-w-[12rem]`}>
                    <TruncTd title={[c.companyAddress, c.compAdd].filter(Boolean).join(' · ') || ''}>
                      {[c.companyAddress, c.compAdd].filter(Boolean).join(' · ') || '—'}
                    </TruncTd>
                  </td>
                  <td className={`${TABLE_STYLE.td} max-w-[100px] truncate`}>{c.shippingTo || '—'}</td>
                  <td className={`${TABLE_STYLE.td} max-w-[6.5rem]`}>
                    <TruncTd title={c.importBatchId}>{c.importBatchId || '—'}</TruncTd>
                  </td>
                  <td className={`${TABLE_STYLE.td} align-top min-w-[11rem]`}>
                    <div className="flex flex-col gap-1.5 max-w-[220px]">
                      <select
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-[16px] w-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400"
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
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-[14px] min-w-0 flex-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400"
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
                          className="shrink-0 px-2 py-1 rounded-lg border border-gray-200 bg-slate-50 text-[14px] font-semibold text-gray-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50"
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
                  <td className={`${TABLE_STYLE.td} ${TABLE_STYLE.tdEnd} text-center`}>
                    <button
                      type="button"
                      title="Edit fields"
                      className="cursor-pointer inline-flex items-center justify-center p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setEditCustomer(c)}
                    >
                      {/* <Pencil size={14} /> */}
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && customers.length > 0 && (
        <div className={`${PAGINATION_STYLE.wrap} flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`}>
          <span className={PAGINATION_STYLE.meta}>
            Showing {visibleFrom} to {visibleTo} of {total} employees
          </span>
          <div className={PAGINATION_STYLE.nav}>
            <button
              type="button"
              disabled={page <= 1}
              className={PAGINATION_STYLE.link}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            {pageButtons.map((p, idx) => (
              <React.Fragment key={p}>
                {idx > 0 && p - pageButtons[idx - 1] > 1 && <span className={PAGINATION_STYLE.dots}>...</span>}
                <button
                  type="button"
                  onClick={() => setPage(p)}
                  aria-current={paginationPageNum(p, 1) === paginationPageNum(page, 1) ? 'page' : undefined}
                  className={`${PAGINATION_STYLE.pageBtn} ${
                    paginationPageNum(p, 1) === paginationPageNum(page, 1)
                      ? PAGINATION_STYLE.pageActive
                      : PAGINATION_STYLE.pageInactive
                  }`}
                >
                  {p}
                </button>
              </React.Fragment>
            ))}
            <button
              type="button"
              disabled={page >= totalPages}
              className={PAGINATION_STYLE.link}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
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
          <div className={`max-w-md ${MODAL_SHELL}`}>
            <div className={`${MODAL_HEADER} flex items-start justify-between gap-2`}>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {followUpModalIsEdit ? 'Edit follow-up' : 'Follow-up'}
                </h2>
                <p className="text-base text-blue-100/95 mt-1 leading-snug">
                  {followUp.personName} — {followUp.companyName}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                className="shrink-0 rounded-lg p-2 text-white/90 hover:bg-white/15"
                onClick={() => {
                  setFollowUp(null);
                  setFollowUpModalIsEdit(false);
                  loadList();
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto min-h-0">
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 space-y-4">
                <div>
                  <label className={`${MODAL_LABEL} block mb-1.5`} htmlFor="follow-notes">
                    Notes (optional)
                  </label>
                  <textarea
                    id="follow-notes"
                    className={`${MODAL_FIELD} resize-y min-h-[6rem] leading-relaxed`}
                    rows={3}
                    placeholder="Notes (optional)"
                    value={followNotes}
                    onChange={(e) => setFollowNotes(e.target.value)}
                  />
                </div>
                <div>
                  <label className={`${MODAL_LABEL} block mb-1.5`} htmlFor="follow-at">
                    Date &amp; time
                  </label>
                  <input
                    id="follow-at"
                    type="datetime-local"
                    className={MODAL_FIELD}
                    value={followAt}
                    onChange={(e) => setFollowAt(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="border-t border-gray-100 px-5 py-4 flex justify-end gap-3 shrink-0 bg-white">
              <button
                type="button"
                className="px-5 py-3 rounded-xl border border-gray-300 bg-white text-base font-semibold text-gray-700 hover:bg-gray-50"
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
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-base font-semibold hover:from-blue-700 hover:to-violet-700 disabled:opacity-50"
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
