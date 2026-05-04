import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  Building,
  ChevronDown,
  Download,
  Eye,
  FileSpreadsheet,
  Mail,
  MapPin,
  Phone,
  Plus,
  PlusCircle,
  Search,
  Truck,
  Upload,
  User,
  X,
} from 'lucide-react';
import { getUsCityOptions, getUsStateOptions, US_COUNTRY_OPTIONS } from '../../data/usStatesCities.js';
import { fetchSalesDayList } from '../../services/salesDayAgentService.js';
import {
  createSalesBuyer,
  fetchBuyerHandoffReceiverPool,
  fetchImportTemplateBlob,
  fetchMyForwardedBuyers,
  fetchMyPendingBuyers,
  forwardSalesBuyers,
  postImportExcel,
} from '../../services/salesBuyerHandoffService.js';
import {
  getUserFromStorage,
  isEmployeeActiveForHandoff,
  isSalesDayShiftTiming,
  isSalesDepartment,
} from '../../utils/salesDayAgentEligibility.js';
import usFlagImg from '../../assets/Flag_of_the_United_States.png';
import indiaFlagImg from '../../assets/Flag_of_India.png';

const PAGE_LIMIT = 50;
const EXCEL_MAX_BYTES = 10 * 1024 * 1024;
const EXCEL_NAME_RE = /\.(xlsx|xls|xlsm)$/i;

function FlagUs({ className = 'h-4 w-auto max-w-[1.375rem] rounded-sm border border-black/10 object-cover shrink-0' }) {
  return <img src={usFlagImg} alt="" width={22} height={14} className={className} aria-hidden draggable={false} />;
}

function FlagIn({ className = 'h-4 w-auto max-w-[1.375rem] rounded-sm border border-black/10 object-cover shrink-0' }) {
  return <img src={indiaFlagImg} alt="" width={22} height={14} className={className} aria-hidden draggable={false} />;
}

const ADD_BUYER_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** @returns {{ valid: boolean, errors: Record<string, string> }} */
function validateAddBuyerForm(form) {
  const errors = {};
  if (!form.agentId?.trim()) errors.agentId = 'Please select an Indian customer.';
  if (!form.buyerName?.trim()) errors.buyerName = 'US buyer name is required.';
  if (!form.buyerEmail?.trim()) errors.buyerEmail = 'Email is required.';
  else if (!ADD_BUYER_EMAIL_RE.test(form.buyerEmail.trim())) errors.buyerEmail = 'Enter a valid email address.';
  if (!form.buyerPhone?.trim()) errors.buyerPhone = 'Phone is required.';
  return { valid: Object.keys(errors).length === 0, errors };
}

function formatDt(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(iso);
  }
}

/** Forward history: prefer assigned/forward time, else updated / created */
function formatForwardHistoryDate(row) {
  const raw = row?.assignedAt || row?.updatedAt || row?.createdAt;
  return raw ? formatDt(raw) : '—';
}

function agentLabel(row) {
  if (!row || typeof row !== 'object') return '—';
  const co = row.companyName || row.customerId || '';
  const person = row.personName || row.contactPerson || '';
  const bits = [co, person].filter(Boolean);
  return bits.length ? bits.join(' · ') : row._id || '—';
}

function agentCompanyOnly(row) {
  if (!row || typeof row !== 'object') return '—';
  return row.companyName || '—';
}

function assignedCell(assignedTo) {
  if (!assignedTo || typeof assignedTo !== 'object') return { main: '—', sub: '' };
  const main = assignedTo.employeeName || assignedTo.email || '—';
  const parts = [];
  if (assignedTo.empId != null) parts.push(String(assignedTo.empId));
  if (assignedTo.salesShiftTiming) parts.push(String(assignedTo.salesShiftTiming).replace(/_/g, ' '));
  return { main, sub: parts.join(' · ') };
}

/** Same pattern as Loads.jsx SearchableDropdown */
function LoadsStyleSearchableDropdown({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  loading = false,
  searchPlaceholder = 'Search...',
  invalid = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredOptions(options);
    } else {
      setFilteredOptions(
        options.filter((option) => option.label.toLowerCase().includes(searchTerm.toLowerCase())),
      );
    }
  }, [searchTerm, options]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedOption = options.find((option) => option.value === value);

  const borderClass = invalid
    ? 'border-red-500 focus-within:ring-red-500/30 focus-within:border-red-500'
    : 'border-gray-300 focus-within:ring-blue-500 focus-within:border-transparent';

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={`w-full px-4 py-3 border rounded-lg bg-white focus-within:ring-2 cursor-pointer ${borderClass} ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : invalid ? '' : 'hover:border-gray-400'
        }`}
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled && !loading) setIsOpen(!isOpen);
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-expanded={isOpen}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={`truncate text-left text-sm ${selectedOption ? 'text-gray-900' : 'text-gray-500'}`}>
            {loading ? 'Loading...' : selectedOption ? selectedOption.label : placeholder}
          </span>
          <svg
            className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && !disabled && !loading && (
        <div className="absolute z-[300] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={`${String(option.value)}-${index}`}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-800"
                  onClick={() => handleSelect(option)}
                  role="option"
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-gray-500 text-sm text-center">No options found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const US_STATE_DROPDOWN_OPTIONS = getUsStateOptions();

/**
 * Searchable dropdown — options: { value: string, label: string }[]
 */
function SearchableSelect({
  id,
  options,
  value,
  onChange,
  disabled,
  searchPlaceholder = 'Type to search…',
  buttonClassName = '',
  allowEmptyOption,
  emptyOptionLabel = 'All',
  placeholder = 'Select…',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const displayLabel =
    value && selected ? selected.label : allowEmptyOption && !value ? emptyOptionLabel : placeholder;

  return (
    <div className={`relative min-w-[200px] ${buttonClassName}`} ref={rootRef}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => !disabled && setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-900 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="truncate font-medium">{displayLabel}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 z-[250] mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl ring-1 ring-black/5"
          role="listbox"
        >
          <div className="flex items-center gap-2 border-b border-gray-100 px-2 py-2">
            <Search className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
              autoComplete="off"
              autoFocus
            />
          </div>
          <ul className="max-h-52 overflow-y-auto py-1 [scrollbar-width:thin]">
            {allowEmptyOption && (
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={!value}
                  className={`flex w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${!value ? 'bg-blue-50/80 font-medium text-blue-900' : 'text-gray-700'}`}
                  onClick={() => {
                    onChange('');
                    setOpen(false);
                  }}
                >
                  {emptyOptionLabel}
                </button>
              </li>
            )}
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-xs text-gray-500">No matches</li>
            )}
            {filtered.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === o.value}
                  className={`flex w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${value === o.value ? 'bg-blue-50/80 font-medium text-blue-900' : 'text-gray-800'}`}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <span className="line-clamp-2">{o.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const emptyForm = () => ({
  agentId: '',
  buyerName: '',
  buyerEmail: '',
  buyerPhone: '',
  buyerAddress: '',
  buyerCity: '',
  buyerState: '',
  buyerCountry: 'United States',
});

export default function SalesBuyerHandoff() {
  const user = getUserFromStorage();
  const sales = isSalesDepartment(user);
  const active = isEmployeeActiveForHandoff(user);
  const dayShift = isSalesDayShiftTiming(user);
  const allowed = sales && active && dayShift;

  const [agents, setAgents] = useState([]);
  const [agentsLoading, setAgentsLoading] = useState(false);

  const [receiverCount, setReceiverCount] = useState(null);
  const [receiverGroup, setReceiverGroup] = useState(null);

  const [tab, setTab] = useState('pending');

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [addBuyerErrors, setAddBuyerErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const addBuyerFormRef = useRef(null);
  /** Pending / forwarded list row opened in detail sheet */
  const [detailRow, setDetailRow] = useState(null);

  const [pendingRows, setPendingRows] = useState([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingAgentFilter, setPendingAgentFilter] = useState('');
  const [pendingExcelBatchFilter, setPendingExcelBatchFilter] = useState('');
  const [pendingLoading, setPendingLoading] = useState(false);

  const excelImportInputRef = useRef(null);
  const [importTemplateLoading, setImportTemplateLoading] = useState(false);
  const [importUploading, setImportUploading] = useState(false);
  const [importResultOpen, setImportResultOpen] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const [fwdRows, setFwdRows] = useState([]);
  const [fwdTotal, setFwdTotal] = useState(0);
  const [fwdPage, setFwdPage] = useState(1);
  const [fwdAgentFilter, setFwdAgentFilter] = useState('');
  const [fwdLoading, setFwdLoading] = useState(false);

  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [forwarding, setForwarding] = useState(false);
  const selectAllRef = useRef(null);

  const agentOptions = useMemo(
    () =>
      agents.map((a) => ({
        value: a._id,
        label: agentLabel(a),
      })),
    [agents],
  );

  /** Add Buyer modal: dropdown shows company name only */
  const addBuyerAgentOptions = useMemo(
    () =>
      agents.map((a) => ({
        value: a._id,
        label: agentCompanyOnly(a),
      })),
    [agents],
  );

  const usCityOptions = useMemo(() => getUsCityOptions(form.buyerState), [form.buyerState]);

  const loadAgents = useCallback(async () => {
    if (!allowed) return;
    setAgentsLoading(true);
    try {
      const data = await fetchSalesDayList({ page: 1, limit: 100 });
      const list = data?.customers || data?.rows || [];
      setAgents(Array.isArray(list) ? list : []);
    } catch {
      setAgents([]);
      toast.error('Could not load your Indian customers list');
    } finally {
      setAgentsLoading(false);
    }
  }, [allowed]);

  const refreshPool = useCallback(async () => {
    if (!allowed) return;
    try {
      const poolRes = await fetchBuyerHandoffReceiverPool();
      setReceiverCount(poolRes?.data?.receiverCount ?? 0);
      setReceiverGroup(poolRes?.data?.receiverGroup ?? null);
    } catch {
      setReceiverCount(null);
      setReceiverGroup(null);
    }
  }, [allowed]);

  const loadPending = useCallback(
    async (opts) => {
      if (!allowed) return;
      const page = opts?.page ?? pendingPage;
      const excelBatch =
        opts?.excelBatchId !== undefined
          ? String(opts.excelBatchId || '').trim()
          : pendingExcelBatchFilter.trim();
      setPendingLoading(true);
      try {
        const res = await fetchMyPendingBuyers({
          page,
          limit: PAGE_LIMIT,
          ...(pendingAgentFilter ? { agentId: pendingAgentFilter } : {}),
          ...(excelBatch ? { excelImportBatchId: excelBatch } : {}),
        });
        setPendingRows(Array.isArray(res?.data) ? res.data : []);
        setPendingTotal(typeof res?.total === 'number' ? res.total : res?.count ?? 0);
        setSelectedIds(new Set());
      } catch (e) {
        toast.error(e.message || 'Failed to load pending buyers');
        setPendingRows([]);
        setPendingTotal(0);
      } finally {
        setPendingLoading(false);
      }
    },
    [allowed, pendingPage, pendingAgentFilter, pendingExcelBatchFilter],
  );

  const loadForwarded = useCallback(async () => {
    if (!allowed) return;
    setFwdLoading(true);
    try {
      const res = await fetchMyForwardedBuyers({
        page: fwdPage,
        limit: PAGE_LIMIT,
        ...(fwdAgentFilter ? { agentId: fwdAgentFilter } : {}),
      });
      setFwdRows(Array.isArray(res?.data) ? res.data : []);
      setFwdTotal(typeof res?.total === 'number' ? res.total : res?.count ?? 0);
    } catch (e) {
      toast.error(e.message || 'Failed to load forwarded buyers');
      setFwdRows([]);
      setFwdTotal(0);
    } finally {
      setFwdLoading(false);
    }
  }, [allowed, fwdPage, fwdAgentFilter]);

  useEffect(() => {
    loadAgents();
    refreshPool();
  }, [loadAgents, refreshPool]);

  useEffect(() => {
    if (tab === 'pending') loadPending();
  }, [tab, loadPending]);

  useEffect(() => {
    if (tab === 'forwarded') loadForwarded();
  }, [tab, loadForwarded]);

  const pendingTotalPages = Math.max(1, Math.ceil((pendingTotal || 0) / PAGE_LIMIT));
  const fwdTotalPages = Math.max(1, Math.ceil((fwdTotal || 0) / PAGE_LIMIT));

  useEffect(() => {
    setPendingPage((p) => Math.min(Math.max(1, p), pendingTotalPages));
  }, [pendingTotalPages]);

  useEffect(() => {
    setFwdPage((p) => Math.min(Math.max(1, p), fwdTotalPages));
  }, [fwdTotalPages]);

  const pagePendingRows = pendingRows;

  const allSelected =
    pagePendingRows.length > 0 && pagePendingRows.every((r) => selectedIds.has(r._id));
  const someSelected = pagePendingRows.some((r) => selectedIds.has(r._id));

  useEffect(() => {
    const el = selectAllRef.current;
    if (!el) return;
    el.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected, pagePendingRows.length]);

  const orderedSelectedIds = useMemo(
    () => pagePendingRows.filter((r) => selectedIds.has(r._id)).map((r) => r._id),
    [pagePendingRows, selectedIds],
  );

  const toggle = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) pagePendingRows.forEach((r) => next.delete(r._id));
      else pagePendingRows.forEach((r) => next.add(r._id));
      return next;
    });
  };

  const downloadImportTemplate = useCallback(async () => {
    if (!allowed) return;
    setImportTemplateLoading(true);
    try {
      const { blob, filename } = await fetchImportTemplateBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Template downloaded');
    } catch (e) {
      toast.error(e.message || 'Could not download template');
    } finally {
      setImportTemplateLoading(false);
    }
  }, [allowed]);

  const runExcelImport = useCallback(
    async (file) => {
      if (!allowed || !file) return;
      if (file.size > EXCEL_MAX_BYTES) {
        toast.error('File too large (max 10 MB).');
        return;
      }
      if (!EXCEL_NAME_RE.test(file.name)) {
        toast.error('Use .xlsx, .xls, or .xlsm only.');
        return;
      }
      setImportUploading(true);
      try {
        const parsed = await postImportExcel(file);
        if (!parsed.success) {
          toast.error(parsed.message || 'Import failed');
          return;
        }
        toast.success(parsed.message || 'Import finished');
        const data = parsed.data || {};
        setImportResult(data);
        setImportResultOpen(true);
        const batchId = data.excelImportBatchId ? String(data.excelImportBatchId) : '';
        if (batchId) {
          setPendingExcelBatchFilter(batchId);
          setPendingPage(1);
          await loadPending({ page: 1, excelBatchId: batchId });
        } else {
          await loadPending();
        }
      } catch (e) {
        toast.error(e.message || 'Import failed');
      } finally {
        setImportUploading(false);
      }
    },
    [allowed, loadPending],
  );

  const onExcelInputChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) runExcelImport(file);
  };

  const openAddBuyerModal = () => {
    setForm(emptyForm());
    setAddBuyerErrors({});
    setAddModalOpen(true);
  };

  const clearAddBuyerError = (key) => {
    setAddBuyerErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const closeAddBuyerModal = useCallback(() => {
    if (submitting) return;
    setAddBuyerErrors({});
    setAddModalOpen(false);
  }, [submitting]);

  const onCreate = async (e) => {
    e.preventDefault();
    const { valid, errors } = validateAddBuyerForm(form);
    if (!valid) {
      setAddBuyerErrors(errors);
      const firstKey = ['agentId', 'buyerName', 'buyerEmail', 'buyerPhone'].find((k) => errors[k]);
      if (firstKey) {
        queueMicrotask(() => {
          const el = addBuyerFormRef.current?.querySelector(`[data-add-buyer-field="${firstKey}"]`);
          el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
        });
      }
      return;
    }
    setAddBuyerErrors({});
    setSubmitting(true);
    try {
      await createSalesBuyer({
        agentId: form.agentId,
        buyerName: form.buyerName.trim(),
        buyerEmail: form.buyerEmail.trim(),
        buyerPhone: form.buyerPhone.trim(),
        buyerAddress: form.buyerAddress.trim() || undefined,
        buyerCity: form.buyerCity.trim() || undefined,
        buyerState: form.buyerState.trim() || undefined,
        buyerCountry: form.buyerCountry.trim() || undefined,
      });
      toast.success('US buyer created (pending forward).');
      setForm(emptyForm());
      setAddBuyerErrors({});
      setAddModalOpen(false);
      await loadPending();
      await refreshPool();
    } catch (err) {
      toast.error(err.message || 'Create failed');
    } finally {
      setSubmitting(false);
    }
  };

  const onForward = async () => {
    if (orderedSelectedIds.length === 0) {
      toast.info('Select at least one pending US buyer.');
      return;
    }
    if (!receiverCount) {
      toast.error('No receivers in the pool. Ask non–day-shift Sales colleagues to log in today.');
      return;
    }
    setForwarding(true);
    try {
      const res = await forwardSalesBuyers(orderedSelectedIds);
      toast.success(res.message || 'Forwarded');
      await loadPending();
      await refreshPool();
      setTab('forwarded');
      await loadForwarded();
    } catch (err) {
      if (err.status === 409) toast.warn(err.message || 'Conflict — try again');
      else toast.error(err.message || 'Forward failed');
    } finally {
      setForwarding(false);
    }
  };

  useEffect(() => {
    if (!addModalOpen && !detailRow && !importResultOpen) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (importResultOpen) {
        setImportResultOpen(false);
        return;
      }
      if (detailRow) {
        setDetailRow(null);
        return;
      }
      closeAddBuyerModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [addModalOpen, detailRow, importResultOpen, closeAddBuyerModal]);

  if (!sales) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-lg">
          <h1 className="text-lg font-semibold text-gray-900">Sales Buyer Handoff</h1>
          <p className="text-gray-600 text-sm mt-2">
            This screen is only for the <strong>Sales</strong> department.
          </p>
        </div>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-lg">
          <h1 className="text-lg font-semibold text-gray-900">Sales Buyer Handoff</h1>
          <p className="text-gray-600 text-sm mt-2">This account is not active.</p>
        </div>
      </div>
    );
  }

  if (!dayShift) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-lg shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900">Sales Buyer Handoff</h1>
          <p className="text-gray-600 text-sm mt-2 leading-relaxed">
            Creating and forwarding buyers is only for <strong>day-shift</strong> Sales. Incoming assignments for your
            account are on{' '}
            <Link to="/sales/my-incoming-buyers" className="text-blue-600 font-medium hover:underline">
              My Incoming Buyers
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-slate-50/90 to-white p-4 sm:p-6">
      <ToastContainer position="top-right" />

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8 mb-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Day shift · Buyer handoff</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Sales Buyer Handoff</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
                Add US buyers linked to Indian Customers, forward pending rows round-robin to non–day-shift colleagues
                logged in today. Receivers see assignments on{' '}
                <Link to="/sales/my-incoming-buyers" className="font-semibold text-blue-600 hover:underline">
                  My Incoming Buyers
                </Link>
                .
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm">
                Receivers online
                <span className="tabular-nums">
                  {receiverCount == null ? '—' : receiverCount}
                </span>
              </span>
              {receiverGroup === 'non_day_shift' && (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200/80">
                  Non–day shift pool
                </span>
              )}
            </div>
          </div>
          {receiverCount === 0 && (
            <p className="relative mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200/80">
              Forward stays disabled until at least one receiver is in the pool.
            </p>
          )}
        </div>
      </div>

      {/* Tabs + content */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md ring-1 ring-slate-900/5">
        <div
          className="flex gap-0 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-2 pt-2"
          role="tablist"
          aria-label="Buyer handoff"
        >
          {[
            { id: 'pending', label: 'Pending' },
            { id: 'forwarded', label: 'Forward History' },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`relative rounded-t-xl px-5 py-3 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                tab === id
                  ? 'bg-white text-blue-700 shadow-[0_1px_0_0_white] ring-1 ring-slate-200 ring-b-0'
                  : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
              }`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-5 sm:p-6">
          {tab === 'pending' && (
            <div className="space-y-5">
              {/* Toolbar: left = Forward + Refresh · right = Indian Customers filter + Add Buyer */}
              <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-40"
                    onClick={onForward}
                    disabled={pendingLoading || forwarding || orderedSelectedIds.length === 0 || !receiverCount}
                  >
                    {forwarding ? 'Forwarding…' : 'Forward selected'}
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-40"
                    onClick={() => {
                      refreshPool();
                      loadPending();
                    }}
                    disabled={pendingLoading}
                  >
                    Refresh
                  </button>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500 whitespace-nowrap">
                      Indian Customers filter
                    </span>
                    <SearchableSelect
                      options={agentOptions}
                      value={pendingAgentFilter}
                      onChange={(v) => {
                        setPendingAgentFilter(v);
                        setPendingPage(1);
                      }}
                      disabled={agentsLoading || agentOptions.length === 0}
                      allowEmptyOption
                      emptyOptionLabel="All Indian Customers"
                      placeholder={agentsLoading ? 'Loading…' : 'Select Indian Customers'}
                      searchPlaceholder="Search Indian Customers…"
                      buttonClassName="sm:min-w-[240px]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={openAddBuyerModal}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2.5} />
                    Add Buyer
                  </button>
                </div>
              </div>

              {pendingExcelBatchFilter.trim() && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50/90 px-4 py-2.5 text-sm text-blue-950">
                  <span>
                    Showing pending rows from Excel import batch{' '}
                    <code className="rounded bg-white px-1.5 py-0.5 text-xs font-mono ring-1 ring-blue-200">
                      {pendingExcelBatchFilter.trim().slice(0, 10)}…
                    </code>
                  </span>
                  <button
                    type="button"
                    className="font-semibold text-blue-700 underline-offset-2 hover:underline"
                    onClick={() => {
                      setPendingExcelBatchFilter('');
                      setPendingPage(1);
                      loadPending({ page: 1, excelBatchId: '' });
                    }}
                  >
                    Clear batch filter
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-3 rounded-xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/90 to-teal-50/50 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-emerald-950">
                  <FileSpreadsheet className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
                  <span className="text-sm font-semibold">Excel import (bulk pending)</span>
                  <span className="hidden text-xs text-emerald-800/90 sm:inline">
                    Template + upload · max 500 data rows · 10 MB
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={excelImportInputRef}
                    type="file"
                    accept=".xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    className="hidden"
                    onChange={onExcelInputChange}
                  />
                  <button
                    type="button"
                    disabled={importTemplateLoading || !allowed}
                    onClick={downloadImportTemplate}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 shadow-sm hover:bg-emerald-50 disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    {importTemplateLoading ? 'Downloading…' : 'Download template'}
                  </button>
                  <button
                    type="button"
                    disabled={importUploading || pendingLoading || !allowed}
                    onClick={() => excelImportInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4" />
                    {importUploading ? 'Uploading…' : 'Import Excel'}
                  </button>
                </div>
              </div>

              {pendingLoading && (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 py-12 text-center text-sm text-slate-500">
                  Loading pending US buyers…
                </div>
              )}

              {!pendingLoading && pagePendingRows.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
                  <p className="text-sm font-medium text-slate-800">No pending US buyers</p>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
                    Use <strong>Add Buyer</strong>, <strong>Import Excel</strong>, or download the template for bulk
                    rows—then forward when receivers are online.
                  </p>
                </div>
              )}

              {!pendingLoading && pagePendingRows.length > 0 && (
                <>
                  <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50/90">
                          <tr>
                            <th className="w-12 px-4 py-3">
                              <input
                                ref={selectAllRef}
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                checked={allSelected}
                                onChange={toggleSelectAll}
                                aria-label="Select all on this page"
                              />
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                              <span className="inline-flex items-center gap-1.5">
                                <FlagUs className="h-3.5 w-auto max-w-[1.2rem]" />
                                US buyer
                              </span>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                              <span className="inline-flex items-center gap-1.5">
                                <FlagIn className="h-3.5 w-auto max-w-[1.2rem]" />
                                Indian Customers
                              </span>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                              Created
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap w-28">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pagePendingRows.map((row, idx) => (
                            <tr
                              key={row._id}
                              className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}
                            >
                              <td className="px-4 py-3 align-middle">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  checked={selectedIds.has(row._id)}
                                  onChange={() => toggle(row._id)}
                                />
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-900">
                                <span className="inline-flex items-center gap-2 min-w-0">
                                  <FlagUs />
                                  <span className="truncate">{row.buyerName || '—'}</span>
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                <span className="inline-flex items-center gap-2 min-w-0">
                                  <FlagIn />
                                  <span className="truncate">
                                    {row.agentId && typeof row.agentId === 'object'
                                      ? agentCompanyOnly(row.agentId)
                                      : '—'}
                                  </span>
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-600">{formatDt(row.createdAt)}</td>
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-100"
                                  onClick={() => setDetailRow(row)}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                    <span>
                      Page <strong className="text-slate-900">{pendingPage}</strong> of {pendingTotalPages} ·{' '}
                      <strong className="text-slate-900">{pendingTotal}</strong> total ·{' '}
                      <strong className="text-blue-700">{orderedSelectedIds.length}</strong> selected
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-40"
                        disabled={pendingPage <= 1}
                        onClick={() => setPendingPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-40"
                        disabled={pendingPage >= pendingTotalPages}
                        onClick={() => setPendingPage((p) => p + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'forwarded' && (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500 whitespace-nowrap">
                    Indian Customers filter
                  </span>
                  <SearchableSelect
                    options={agentOptions}
                    value={fwdAgentFilter}
                    onChange={(v) => {
                      setFwdAgentFilter(v);
                      setFwdPage(1);
                    }}
                    disabled={agentsLoading || agentOptions.length === 0}
                    allowEmptyOption
                    emptyOptionLabel="All Indian Customers"
                    placeholder={agentsLoading ? 'Loading…' : 'Select Indian Customers'}
                    searchPlaceholder="Search Indian Customers…"
                    buttonClassName="sm:min-w-[240px]"
                  />
                </div>
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-40 sm:shrink-0 sm:ml-auto"
                  onClick={loadForwarded}
                  disabled={fwdLoading}
                >
                  Refresh
                </button>
              </div>

              {fwdLoading && (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 py-12 text-center text-sm text-slate-500">
                  Loading history…
                </div>
              )}

              {!fwdLoading && fwdRows.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center text-sm text-slate-600">
                  No forwarded records.
                </div>
              )}

              {!fwdLoading && fwdRows.length > 0 && (
                <>
                  <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50/90">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                              <span className="inline-flex items-center gap-1.5">
                                <FlagUs className="h-3.5 w-auto max-w-[1.2rem]" />
                                US buyer
                              </span>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                              Assigned to
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                              <span className="inline-flex items-center gap-1.5">
                                <FlagIn className="h-3.5 w-auto max-w-[1.2rem]" />
                                Indian Customers
                              </span>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap">
                              Forwarded date
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap w-28">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {fwdRows.map((row, idx) => {
                            const a = assignedCell(row.assignedTo);
                            return (
                              <tr key={row._id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                                <td className="px-4 py-3 font-semibold text-slate-900">
                                  <span className="inline-flex items-center gap-2 min-w-0">
                                    <FlagUs />
                                    <span className="truncate">{row.buyerName || '—'}</span>
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-slate-900">{a.main}</div>
                                  {a.sub && <div className="text-xs text-slate-500">{a.sub}</div>}
                                </td>
                                <td className="px-4 py-3 text-slate-700">
                                  <span className="inline-flex items-center gap-2 min-w-0">
                                    <FlagIn />
                                    <span className="truncate">
                                      {row.agentId && typeof row.agentId === 'object'
                                        ? agentCompanyOnly(row.agentId)
                                        : '—'}
                                    </span>
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-600 whitespace-nowrap" title={row.assignedAt || row.updatedAt || row.createdAt || ''}>
                                  {formatForwardHistoryDate(row)}
                                </td>
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-100"
                                    onClick={() => setDetailRow(row)}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    View
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                    <span>
                      Page <strong className="text-slate-900">{fwdPage}</strong> of {fwdTotalPages} ·{' '}
                      <strong className="text-slate-900">{fwdTotal}</strong> total
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-40"
                        disabled={fwdPage <= 1}
                        onClick={() => setFwdPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-40"
                        disabled={fwdPage >= fwdTotalPages}
                        onClick={() => setFwdPage((p) => p + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Buyer modal — same layout language as Loads.jsx “Add Load” */}
      {addModalOpen && (
        <div
          className="fixed inset-0 z-[200] flex justify-center items-center p-4 backdrop-blur-sm bg-black/30"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-buyer-title"
        >
          <style>{`
            .buyer-handoff-modal-scroll::-webkit-scrollbar { display: none; }
            .buyer-handoff-modal-scroll { scrollbar-width: none; -ms-overflow-style: none; }
          `}</style>
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close dialog"
            onClick={closeAddBuyerModal}
          />
          <div
            className="relative z-10 bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto buyer-handoff-modal-scroll shadow-2xl border border-gray-200"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                    <PlusCircle className="text-white" size={24} />
                  </div>
                  <div className="min-w-0">
                    <h2 id="add-buyer-title" className="text-xl font-bold truncate">
                      Add Buyer
                    </h2>
                    <p className="text-blue-100 text-sm">Create a pending buyer for handoff</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={closeAddBuyerModal}
                  className="text-white hover:text-gray-200 text-2xl font-bold leading-none px-2 shrink-0 disabled:opacity-50"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>

            <form ref={addBuyerFormRef} onSubmit={onCreate} noValidate className="p-6 space-y-6">
              {/* Indian Customers & US buyer */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                    <Building className="text-blue-600" size={20} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">US buyer &amp; Indian Customers</h3>
                </div>
                <div className="space-y-4">
                  <div data-add-buyer-field="agentId">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Select Indian Customers <span className="text-red-500">*</span>
                    </label>
                    <LoadsStyleSearchableDropdown
                      value={form.agentId}
                      onChange={(v) => {
                        clearAddBuyerError('agentId');
                        setForm((f) => ({ ...f, agentId: v }));
                      }}
                      options={addBuyerAgentOptions}
                      placeholder={agentsLoading ? 'Loading Indian Customers...' : 'Select Indian Customers'}
                      loading={agentsLoading}
                      searchPlaceholder="Search Indian Customers..."
                      invalid={Boolean(addBuyerErrors.agentId)}
                    />
                    {addBuyerErrors.agentId && (
                      <p className="mt-1.5 text-sm text-red-600" role="alert">
                        {addBuyerErrors.agentId}
                      </p>
                    )}
                  </div>
                  <div data-add-buyer-field="buyerName">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      US buyer name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.buyerName}
                      onChange={(e) => {
                        clearAddBuyerError('buyerName');
                        setForm((f) => ({ ...f, buyerName: e.target.value }));
                      }}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${
                        addBuyerErrors.buyerName
                          ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500'
                          : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                      }`}
                      placeholder="US buyer name *"
                      autoComplete="name"
                    />
                    {addBuyerErrors.buyerName && (
                      <p className="mt-1.5 text-sm text-red-600" role="alert">
                        {addBuyerErrors.buyerName}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact — required */}
              <div className="bg-teal-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="text-teal-700" size={18} />
                  <Phone className="text-teal-700" size={18} />
                  <h3 className="text-lg font-semibold text-teal-800">Contact information</h3>
                  {/* <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">Required</span> */}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div data-add-buyer-field="buyerEmail">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={form.buyerEmail}
                      onChange={(e) => {
                        clearAddBuyerError('buyerEmail');
                        setForm((f) => ({ ...f, buyerEmail: e.target.value }));
                      }}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 bg-white ${
                        addBuyerErrors.buyerEmail
                          ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500'
                          : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                      }`}
                      placeholder="Email *"
                      autoComplete="email"
                    />
                    {addBuyerErrors.buyerEmail && (
                      <p className="mt-1.5 text-sm text-red-600" role="alert">
                        {addBuyerErrors.buyerEmail}
                      </p>
                    )}
                  </div>
                  <div data-add-buyer-field="buyerPhone">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={form.buyerPhone}
                      onChange={(e) => {
                        clearAddBuyerError('buyerPhone');
                        setForm((f) => ({ ...f, buyerPhone: e.target.value }));
                      }}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 bg-white ${
                        addBuyerErrors.buyerPhone
                          ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500'
                          : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                      }`}
                      placeholder="Phone *"
                      autoComplete="tel"
                    />
                    {addBuyerErrors.buyerPhone && (
                      <p className="mt-1.5 text-sm text-red-600" role="alert">
                        {addBuyerErrors.buyerPhone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Location — US dropdowns */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                    <MapPin className="text-green-600" size={20} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">Location details</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Street address</label>
                    <input
                      type="text"
                      value={form.buyerAddress}
                      onChange={(e) => setForm((f) => ({ ...f, buyerAddress: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Address (optional)"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Country</label>
                      <LoadsStyleSearchableDropdown
                        value={form.buyerCountry}
                        onChange={(v) =>
                          setForm((f) => ({
                            ...f,
                            buyerCountry: v,
                            buyerState: v === 'United States' ? f.buyerState : '',
                            buyerCity: v === 'United States' ? f.buyerCity : '',
                          }))
                        }
                        options={US_COUNTRY_OPTIONS}
                        placeholder="Select country"
                        searchPlaceholder="Search country..."
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">State (US)</label>
                      <LoadsStyleSearchableDropdown
                        value={form.buyerState}
                        onChange={(v) => setForm((f) => ({ ...f, buyerState: v, buyerCity: '' }))}
                        options={US_STATE_DROPDOWN_OPTIONS}
                        placeholder="Select state"
                        searchPlaceholder="Search states..."
                        disabled={form.buyerCountry !== 'United States'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                      <LoadsStyleSearchableDropdown
                        value={form.buyerCity}
                        onChange={(v) => setForm((f) => ({ ...f, buyerCity: v }))}
                        options={usCityOptions}
                        placeholder={form.buyerState ? 'Select city' : 'Select state first'}
                        searchPlaceholder="Search cities..."
                        disabled={!form.buyerState || form.buyerCountry !== 'United States'}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeAddBuyerModal}
                  disabled={submitting}
                  className={`px-6 py-3 border border-gray-300 rounded-lg transition-colors ${
                    submitting ? 'opacity-50 cursor-not-allowed text-gray-400' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold transition-colors ${
                    submitting ? 'opacity-50 cursor-not-allowed' : 'hover:from-blue-600 hover:to-blue-700'
                  }`}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block" />
                      Creating...
                    </span>
                  ) : (
                    'Create buyer'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {importResultOpen && importResult && (
        <div className="fixed inset-0 z-[205] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-md transition-opacity"
            onClick={() => setImportResultOpen(false)}
            role="presentation"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="excel-import-result-title"
            className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-emerald-700/20 bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 text-white">
              <div className="min-w-0">
                <h2 id="excel-import-result-title" className="text-lg font-bold">
                  Excel import result
                </h2>
                {importResult.sourceFileName && (
                  <p className="mt-0.5 truncate text-sm text-emerald-100" title={String(importResult.sourceFileName)}>
                    {importResult.sourceFileName}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="shrink-0 rounded-lg p-1 text-2xl leading-none text-white hover:bg-white/20"
                aria-label="Close"
                onClick={() => setImportResultOpen(false)}
              >
                <X className="h-6 w-6" strokeWidth={2.5} />
              </button>
            </div>
            <div className="space-y-4 overflow-y-auto p-5 text-sm">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Rows in file</div>
                  <div className="text-lg font-semibold text-slate-900">{importResult.totalRowsInFile ?? '—'}</div>
                </div>
                <div className="rounded-lg bg-emerald-50 px-3 py-2 ring-1 ring-emerald-100">
                  <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">Created</div>
                  <div className="text-lg font-semibold text-emerald-900">{importResult.createdCount ?? 0}</div>
                </div>
                <div className="rounded-lg bg-amber-50 px-3 py-2 ring-1 ring-amber-100">
                  <div className="text-xs font-medium uppercase tracking-wide text-amber-800">Errors</div>
                  <div className="text-lg font-semibold text-amber-950">{importResult.errorCount ?? 0}</div>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Batch ID</div>
                  <div
                    className="truncate font-mono text-[11px] font-semibold text-slate-800"
                    title={importResult.excelImportBatchId ? String(importResult.excelImportBatchId) : ''}
                  >
                    {importResult.excelImportBatchId ? String(importResult.excelImportBatchId) : '—'}
                  </div>
                </div>
              </div>
              {Array.isArray(importResult.errors) && importResult.errors.length > 0 && (
                <div>
                  <h3 className="mb-2 font-semibold text-slate-800">Row errors</h3>
                  <div className="max-h-52 overflow-auto rounded-lg border border-slate-200">
                    <table className="min-w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-100">
                        <tr>
                          <th className="px-3 py-2 font-semibold text-slate-700">Row</th>
                          <th className="px-3 py-2 font-semibold text-slate-700">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importResult.errors.map((err, i) => (
                          <tr key={i} className="bg-white">
                            <td className="whitespace-nowrap px-3 py-2 font-mono text-slate-600">
                              {err.rowNumber ?? '—'}
                            </td>
                            <td className="px-3 py-2 text-slate-800">{err.reason || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {importResult.errorsTruncated && (
                    <p className="mt-2 text-xs text-amber-700">
                      Error list was truncated — fix your sheet and import again.
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-slate-50 px-5 py-3">
              <button
                type="button"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                onClick={() => setImportResultOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Row detail — shell matches CMT DODetails.jsx DetailsModal */}
      {detailRow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-md transition-opacity"
            onClick={() => setDetailRow(null)}
            role="presentation"
          />
          <div
            role="dialog"
            aria-labelledby="buyer-detail-title"
            aria-modal="true"
            className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden flex flex-col transform transition-all duration-300 scale-100"
          >
            <style>{`
              .sbh-do-detail-modal-scroll { scroll-behavior: smooth; }
              .sbh-do-detail-modal-scroll::-webkit-scrollbar { width: 6px; }
              .sbh-do-detail-modal-scroll::-webkit-scrollbar-track { background: transparent; }
              .sbh-do-detail-modal-scroll::-webkit-scrollbar-thumb {
                background: rgba(156, 163, 175, 0.2);
                border-radius: 3px;
                transition: background 0.2s;
              }
              .sbh-do-detail-modal-scroll:hover::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.4); }
              .sbh-do-detail-modal-scroll::-webkit-scrollbar-thumb:hover { background: rgba(156, 163, 175, 0.6); }
              .sbh-do-detail-modal-scroll { scrollbar-width: thin; scrollbar-color: rgba(156, 163, 175, 0.2) transparent; }
            `}</style>
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-3xl shrink-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                    <Truck className="text-white" size={24} />
                  </div>
                  <div className="min-w-0">
                    <h2 id="buyer-detail-title" className="text-xl font-bold truncate">
                      US buyer details
                    </h2>
                    <p className="text-blue-100 truncate" title={detailRow._id}>
                      {detailRow.buyerName || 'US buyer'} · Sales buyer handoff
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailRow(null)}
                  className="text-white hover:text-gray-200 text-2xl font-bold shrink-0"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="sbh-do-detail-modal-scroll overflow-y-auto flex-1 p-6 space-y-6 text-sm">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className="text-green-600" size={20} />
                  <FlagUs className="h-5 w-auto max-w-[1.6rem] rounded-sm border border-black/10 object-cover shadow-sm shrink-0" />
                  <h3 className="text-lg font-bold text-gray-800">US buyer information</h3>
                </div>
                <div className="bg-white rounded-xl p-4 border border-green-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium text-gray-800">{detailRow.buyerName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium text-gray-800">{detailRow.buyerEmail || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium text-gray-800">{detailRow.buyerPhone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className="font-medium text-gray-800">{detailRow.status || 'N/A'}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-sm text-gray-600">Address</p>
                      <p className="font-medium text-gray-800">{detailRow.buyerAddress || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">City</p>
                      <p className="font-medium text-gray-800">{detailRow.buyerCity || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">State</p>
                      <p className="font-medium text-gray-800">{detailRow.buyerState || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Country</p>
                      <p className="font-medium text-gray-800">{detailRow.buyerCountry || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {detailRow.agentId && typeof detailRow.agentId === 'object' && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Building className="text-purple-600" size={20} />
                    <FlagIn className="h-5 w-auto max-w-[1.6rem] rounded-sm border border-black/10 object-cover shadow-sm shrink-0" />
                    <h3 className="text-lg font-bold text-gray-800">Indian Customers</h3>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-purple-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Company</p>
                        <p className="font-medium text-gray-800">{detailRow.agentId.companyName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Person</p>
                        <p className="font-medium text-gray-800">
                          {detailRow.agentId.personName || detailRow.agentId.contactPerson || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium text-gray-800">{detailRow.agentId.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <p className="font-medium text-gray-800">{detailRow.agentId.contactNumber || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {detailRow.assignedTo && typeof detailRow.assignedTo === 'object' && (
                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="text-orange-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Assigned to</h3>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-orange-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className="font-medium text-gray-800">{detailRow.assignedTo.employeeName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Emp ID</p>
                        <p className="font-medium text-gray-800">{detailRow.assignedTo.empId || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium text-gray-800">{detailRow.assignedTo.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Shift</p>
                        <p className="font-medium text-gray-800">{detailRow.assignedTo.salesShiftTiming || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {detailRow.createdBy && typeof detailRow.createdBy === 'object' && (
                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="text-orange-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Created by</h3>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-orange-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className="font-medium text-gray-800">{detailRow.createdBy.employeeName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Emp ID</p>
                        <p className="font-medium text-gray-800">{detailRow.createdBy.empId || 'N/A'}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium text-gray-800">{detailRow.createdBy.email || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
