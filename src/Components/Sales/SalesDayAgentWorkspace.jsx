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
import SalesDayCustomerEditModal from './SalesDayCustomerEditModal.jsx';

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
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Upload a CSV or Excel on <strong className="font-medium text-gray-800">Import file</strong>, then use{' '}
        <strong className="font-medium text-gray-800">Review &amp; filter</strong> to search, edit fields, and set
        dispositions.
      </p>
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          type="button"
          onClick={() => setTab('import')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            tab === 'import' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Import file
        </button>
        <button
          type="button"
          onClick={() => setTab('browse')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            tab === 'browse' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Review &amp; filter
        </button>
      </div>
      {tab === 'import' ? <ImportPanel /> : <BrowsePanel onGoImport={() => setTab('import')} />}
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
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={templateBusy}
          onClick={onDownloadTemplate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 hover:border-blue-300 hover:bg-blue-50/40 disabled:opacity-50"
        >
          <Download size={18} className="text-blue-600" />
          {templateBusy ? 'Downloading…' : 'Download template'}
        </button>
        <span className="text-xs text-gray-500">Official CSV columns (UTF-8 BOM) from the server</span>
      </div>
      <div>
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl py-10 cursor-pointer hover:border-blue-400 transition-colors">
          <Upload className="text-gray-400 mb-2" size={36} />
          <span className="text-sm text-gray-600">CSV or Excel — first row headers</span>
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
            <label className="text-xs font-medium text-gray-600">Optional batch id (group this file)</label>
            <input
              className="mt-1 w-full md:w-96 border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={importBatchId}
              onChange={(e) => setImportBatchId(e.target.value)}
              placeholder="e.g. campaign_april"
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Preview (first 8 rows)</h3>
            <div className="overflow-x-auto border rounded-lg text-xs">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr>
                    {IMPORT_FIELDS.map((f) => (
                      <th key={f.key} className="px-2 py-2 text-left font-medium text-gray-700">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mappedPreview.map((c, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      {IMPORT_FIELDS.map((f) => (
                        <td key={f.key} className="px-2 py-1.5 text-gray-800 max-w-[140px] truncate">
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
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
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
        const t = data.total ?? data.count ?? data.totalCount;
        setTotal(typeof t === 'number' ? t : (data.customers || []).length);
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
      setFollowUpModalIsEdit(false);
      setFollowUp(row);
      setFollowNotes('');
      setFollowAt(defaultFollowUpDatetimeLocal());
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
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">Search</span>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              className="pl-8 pr-2 py-2 border border-gray-200 rounded-lg text-sm w-48"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Name, email…"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">Date</span>
          <input
            type="date"
            className="border border-gray-200 rounded-lg px-2 py-2 text-sm"
            value={filters.date}
            onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">Commodity</span>
          <input
            className="border border-gray-200 rounded-lg px-2 py-2 text-sm w-32"
            value={filters.commodity}
            onChange={(e) => setFilters((f) => ({ ...f, commodity: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">City</span>
          <input
            className="border border-gray-200 rounded-lg px-2 py-2 text-sm w-28"
            value={filters.city}
            onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">State</span>
          <input
            className="border border-gray-200 rounded-lg px-2 py-2 text-sm w-24"
            value={filters.state}
            onChange={(e) => setFilters((f) => ({ ...f, state: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">Country</span>
          <input
            className="border border-gray-200 rounded-lg px-2 py-2 text-sm w-28"
            value={filters.country}
            onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">Zip</span>
          <input
            className="border border-gray-200 rounded-lg px-2 py-2 text-sm w-24"
            value={filters.zipcode}
            onChange={(e) => setFilters((f) => ({ ...f, zipcode: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">Shipping to</span>
          <input
            className="border border-gray-200 rounded-lg px-2 py-2 text-sm w-32"
            value={filters.shippingTo}
            onChange={(e) => setFilters((f) => ({ ...f, shippingTo: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">Disposition</span>
          <select
            className="border border-gray-200 rounded-lg px-2 py-2 text-sm min-w-[140px]"
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
          <span className="text-xs text-gray-600">Import batch</span>
          <select
            className="border border-gray-200 rounded-lg px-2 py-2 text-sm min-w-[160px]"
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
        <button
          type="button"
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm"
          onClick={() => setDebouncedSearch(filters.search.trim())}
        >
          <RefreshCw size={16} />
          Apply search
        </button>
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
        <div className="overflow-x-auto border rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2">Person</th>
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Commodity</th>
                <th className="px-3 py-2">City</th>
                <th className="px-3 py-2">St</th>
                <th className="px-3 py-2">Zip</th>
                <th className="px-3 py-2">Country</th>
                <th className="px-3 py-2">Address</th>
                <th className="px-3 py-2">Ship to</th>
                <th className="px-3 py-2">Batch</th>
                <th className="px-3 py-2">Disposition</th>
                <th className="px-3 py-2 w-20">Edit</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c._id} className="border-t border-gray-100">
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
                  <td className="px-3 py-2 align-top">
                    {/* Disposition field UI commented out as requested */}
                    {/* <div className="flex flex-col gap-1 max-w-[160px]">
                      <select
                        className="border border-gray-200 rounded-lg px-1 py-1 text-xs w-full"
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
                      <input
                        type="text"
                        className="border border-gray-200 rounded px-1 py-0.5 text-[11px] w-full"
                        placeholder="Notes (optional)"
                        value={dispositionNotesById[c._id] ?? ''}
                        disabled={savingId === c._id}
                        onChange={(e) =>
                          setDispositionNotesById((m) => ({ ...m, [c._id]: e.target.value }))
                        }
                      />
                    </div> */}
                    <span className="text-xs text-gray-500">—</span>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      title="Edit fields"
                      className="inline-flex items-center justify-center p-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
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
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {page} of {totalPages} ({total} rows)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              className="px-3 py-1 rounded border disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              className="px-3 py-1 rounded border disabled:opacity-40"
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
