import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Download, Search, Upload, FileSpreadsheet, Loader2, ChevronLeft, ChevronRight, Truck } from 'lucide-react';
import { toast } from 'react-toastify';
import API_CONFIG from '../../config/api.js';

const PAGE_LIMIT_OPTIONS = [25, 50, 100, 200];

const getToken = () =>
  sessionStorage.getItem('token') ||
  localStorage.getItem('token') ||
  sessionStorage.getItem('authToken') ||
  localStorage.getItem('authToken') ||
  null;

export default function ImportCarrierEmails() {
  const [file, setFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const [batches, setBatches] = useState([]);

  const [recordsLoading, setRecordsLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const token = useMemo(() => getToken(), []);

  const totalPages = useMemo(
    () => Math.max(1, totalCount > 0 ? Math.ceil(totalCount / limit) : 1),
    [totalCount, limit]
  );

  /** Page numbers + ellipsis for compact numbered pagination */
  const visiblePageItems = useMemo(() => {
    const t = totalPages;
    if (t <= 0) return [];
    if (t <= 9) {
      return Array.from({ length: t }, (_, i) => i + 1);
    }
    const set = new Set([1, t]);
    for (let i = page - 2; i <= page + 2; i++) {
      if (i >= 1 && i <= t) set.add(i);
    }
    const sorted = [...set].sort((a, b) => a - b);
    const out = [];
    let prev = 0;
    for (const n of sorted) {
      if (prev && n - prev > 1) out.push('ellipsis');
      out.push(n);
      prev = n;
    }
    return out;
  }, [page, totalPages]);

  const authHeaders = useMemo(() => {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }, [token]);

  const fetchBatches = useCallback(async () => {
    try {
      if (!token) return;
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/email-city-import/batches`, {
        headers: authHeaders,
        params: { limit: 100 },
        withCredentials: true
      });

      const data = res?.data?.data ?? res?.data ?? {};
      const list =
        data?.batches ??
        data?.items ??
        res?.data?.batches ??
        res?.data?.items ??
        [];

      setBatches(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('fetchBatches error:', err);
    }
  }, [authHeaders, token]);

  const fetchRecords = useCallback(async (overridePage) => {
    try {
      if (!token) return;
      setRecordsLoading(true);

      const effectivePage = typeof overridePage === 'number' ? overridePage : page;
      const params = { page: effectivePage, limit };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/email-city-import/records`, {
        headers: authHeaders,
        params,
        withCredentials: true
      });

      const root = res?.data ?? {};
      const data = root?.data ?? root;
      const pagination = data?.pagination ?? data?.meta?.pagination ?? root?.pagination ?? {};

      const items =
        data?.records ??
        data?.items ??
        (Array.isArray(data?.data) ? data.data : null) ??
        root?.records ??
        root?.items ??
        [];

      const count =
        typeof pagination?.total === 'number'
          ? pagination.total
          : typeof data?.total === 'number'
            ? data.total
            : typeof data?.count === 'number'
              ? data.count
              : typeof data?.totalRecords === 'number'
                ? data.totalRecords
                : typeof root?.total === 'number'
                  ? root.total
                  : Array.isArray(items)
                    ? items.length
                    : 0;

      setRecords(Array.isArray(items) ? items : []);
      setTotalCount(count);
    } catch (err) {
      console.error('fetchRecords error:', err);
    } finally {
      setRecordsLoading(false);
    }
  }, [authHeaders, debouncedSearch, limit, page, token]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(id);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const downloadTemplate = async () => {
    if (!token) {
      toast.error('Login required');
      return;
    }
    try {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/email-city-import/template`, {
        headers: authHeaders,
        withCredentials: true,
        responseType: 'blob'
      });

      const blob = res.data;
      if (!blob || blob.size === 0) throw new Error('Template is empty');

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'email-city-import-template.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('downloadTemplate error:', err);
      toast.error('Failed to download template');
    }
  };

  const importExcel = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select an Excel file');
      return;
    }
    if (!token) {
      toast.error('Login required');
      return;
    }

    setImportLoading(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('excelFile', file);

      const res = await axios.post(`${API_CONFIG.BASE_URL}/api/v1/email-city-import/import`, formData, {
        headers: {
          ...authHeaders,
          'Content-Type': 'multipart/form-data'
        },
        withCredentials: true
      });

      const data = res?.data?.data ?? res?.data ?? {};
      setImportResult(data);

      if (res?.data?.success || data?.success) {
        toast.success('Excel import completed');
        await fetchBatches();
        if (page !== 1) {
          setPage(1);
        } else {
          await fetchRecords(1);
        }
      } else {
        toast.error(data?.message || 'Import failed');
      }
    } catch (err) {
      console.error('importExcel error:', err);
      toast.error(err?.response?.data?.message || 'Import failed');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="flex flex-col gap-6 mb-6 border border-gray-200 rounded-xl p-6 bg-white">
        {/* Row 1: Stats */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center relative">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-gray-700 font-bold text-2xl">
              {totalCount}
            </div>
            <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold text-lg">
              Total Records
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center relative">
            <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center text-gray-700 font-bold text-2xl">
              {batches.length}
            </div>
            <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold text-lg">
              Import Batches
            </div>
          </div>
        </div>

        {/* Row 2: Template + Choose File + Excel Import (single line) */}
        <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-end">
          <button
            type="button"
            onClick={downloadTemplate}
            className="px-4 h-[45px] border border-gray-200 rounded-lg bg-white flex items-center justify-center gap-2 text-gray-700 font-medium hover:border-gray-300 transition-colors disabled:opacity-50 xl:w-[220px]"
            disabled={importLoading}
          >
            <Download size={18} />
            Template
          </button>

          <form onSubmit={importExcel} className="flex-1 flex flex-col md:flex-row gap-3 items-end">
            <label className="flex-1 h-[45px] px-4 border border-gray-200 rounded-lg bg-white min-w-0 flex items-center justify-between cursor-pointer hover:border-gray-300 transition-colors">
              <span className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-gray-300 bg-gray-50 text-sm text-gray-700">
                Choose File
              </span>
              <span className="ml-3 flex-1 text-sm text-gray-600 truncate text-center">
                {file?.name || 'No file chosen'}
              </span>
              <input
                type="file"
                accept=".xlsx,.xls,.xlsm"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
            <button
              type="submit"
              disabled={importLoading}
              className={`px-6 h-[45px] rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 md:w-[220px] ${
                importLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
              }`}
            >
              {importLoading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
              {importLoading ? 'Importing...' : 'Excel Import'}
            </button>
          </form>
        </div>

        {/* Row 3: Filter by City */}
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Filter by City"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-6 pr-12 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-colors text-gray-600 placeholder-gray-400"
          />
          <Search className="absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-400" size={24} />
        </div>

        {/* Import result */}
        {importResult && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <div className="text-xs text-gray-500">Batch ID</div>
                <div className="font-semibold text-gray-800 break-all">{importResult?.importBatchId || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Total Rows</div>
                <div className="font-semibold text-gray-800">{importResult?.totalRowsInFile ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Valid Rows</div>
                <div className="font-semibold text-gray-800">{importResult?.validRowsProcessed ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Errors</div>
                <div className="font-semibold text-gray-800 text-red-700">{importResult?.errorCount ?? 0}</div>
              </div>
            </div>

            {Array.isArray(importResult?.errors) && importResult.errors.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-semibold text-gray-800 mb-2">
                  First {Math.min(100, importResult.errors.length)} Errors
                </div>
                <div className="max-h-56 overflow-auto rounded-xl border border-red-100 bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-red-50 text-gray-700 sticky top-0">
                      <tr>
                        <th className="text-left px-4 py-2 border-b border-red-100">Row</th>
                        <th className="text-left px-4 py-2 border-b border-red-100">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.errors.slice(0, 100).map((er, idx) => (
                        <tr key={er?.rowNumber || idx} className="border-b border-gray-100">
                          <td className="px-4 py-2 font-medium text-gray-700">{er?.rowNumber ?? '—'}</td>
                          <td className="px-4 py-2 text-gray-700">{er?.reason || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {importResult?.errorsTruncated && (
                  <p className="text-xs text-gray-500 mt-2">Errors truncated (showing first 100).</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {recordsLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white border-b border-gray-200">
                  <tr>
                    <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Email</th>
                    <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">City</th>
                    <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-12">
                        <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">No records found</p>
                        <p className="text-gray-400 text-sm mt-1">Try importing a new Excel file</p>
                      </td>
                    </tr>
                  ) : (
                    records.map((r, idx) => {
                      const email = r?.email ?? r?.Email ?? r?.emailAddress ?? '—';
                      const city = r?.city ?? r?.City ?? r?.location ?? '—';
                      const createdAt = (r?.createdAt || r?.updatedAt || r?._id) ? (r?.createdAt || r?.updatedAt || null) : null;
                      const created = createdAt ? new Date(createdAt).toLocaleString() : '—';
                      return (
                        <tr
                          key={r?._id || r?.id || `${email}-${idx}`}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <span className="text-sm text-gray-800 font-medium break-all">{email}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm font-medium text-gray-800">{city}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-gray-600">{created}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination — single row: summary | rows per page | prev/next */}
            <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-3 sm:p-4">
              <div className="flex w-full min-w-0 flex-nowrap items-center justify-between gap-2 sm:gap-4 overflow-x-auto">
                <div className="shrink-0 text-sm text-gray-600 whitespace-nowrap">
                  Showing{' '}
                  {records.length ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, totalCount)} of {totalCount}
                  {totalCount > 0 && (
                    <span className="text-gray-500"> · Page {page} of {totalPages}</span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
                  <label htmlFor="email-import-page-limit" className="font-medium">
                    Rows per page
                  </label>
                  <select
                    id="email-import-page-limit"
                    value={limit}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      setLimit(n);
                      setPage(1);
                    }}
                    disabled={recordsLoading}
                    className="h-9 min-w-[88px] rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {PAGE_LIMIT_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex shrink-0 flex-nowrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || recordsLoading}
                    className="flex items-center gap-1 px-2 sm:px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    <ChevronLeft size={18} />
                    <span>Previous</span>
                  </button>
                  <div className="flex flex-nowrap items-center gap-1">
                    {visiblePageItems.map((item, idx) =>
                      item === 'ellipsis' ? (
                        <span
                          key={`ellipsis-${idx}`}
                          className="min-w-[28px] h-9 flex items-center justify-center text-gray-400 text-sm select-none"
                          aria-hidden
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setPage(item)}
                          disabled={recordsLoading || totalCount === 0}
                          className={`min-w-[36px] h-9 px-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            page === item
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-gray-700 hover:bg-gray-100 border border-gray-200 bg-white'
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages || totalCount === 0 || recordsLoading}
                    className="flex items-center gap-1 px-2 sm:px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    <span>Next</span>
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

