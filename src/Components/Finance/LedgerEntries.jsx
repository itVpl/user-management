import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API_CONFIG from '../../config/api.js';
import { Search, FileText, Calendar, Filter, ArrowUpDown } from 'lucide-react';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import { DateRange } from 'react-date-range';
import { format } from 'date-fns';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import Loader from '../common/Loader.jsx';

const SearchableDropdown = ({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  loading = false,
  className = "",
  searchPlaceholder = "Search...",
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOptions(filtered);
    }
  }, [searchTerm, options]);

  useEffect(() => { if (isOpen) setHighlightIndex(0); }, [isOpen]);

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

  const selectedOption = options.find(option => option.value === value);
  const paddingClass = compact ? 'px-3 py-2' : 'px-3 py-2';
  const borderClass = 'border-gray-300';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className={`w-full ${paddingClass} border ${borderClass} rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent ${disabled ? 'bg-gray-100' : ''}`}>
        <div className="relative flex items-center">
          <input
            type="text"
            value={searchTerm !== '' ? searchTerm : (selectedOption ? selectedOption.label : '')}
            onChange={(e) => { setSearchTerm(e.target.value); if (!disabled && !loading) setIsOpen(true); }}
            onFocus={() => !disabled && !loading && setIsOpen(true)}
            onKeyDown={(e) => {
              if (!isOpen) return;
              if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex(prev => Math.min(prev + 1, filteredOptions.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIndex(prev => Math.max(prev - 1, 0)); }
              else if (e.key === 'Enter') { e.preventDefault(); const opt = filteredOptions[highlightIndex]; if (opt) handleSelect(opt); }
              else if (e.key === 'Escape') { setIsOpen(false); setSearchTerm(''); }
            }}
            placeholder={loading ? 'Loading...' : placeholder}
            disabled={disabled || loading}
            className={`w-full bg-transparent outline-none ${compact ? 'text-sm' : ''} p-0 text-gray-900`}
          />
          <Search className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} absolute right-3 text-gray-400`} />
        </div>
      </div>
      {isOpen && !disabled && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={index}
                  className={`px-4 py-2 cursor-pointer text-sm ${index === highlightIndex ? 'bg-blue-100' : 'hover:bg-blue-50'}`}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => handleSelect(option)}
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
};

const LedgerEntries = ({ selectedCompanyId, initialLedgerId }) => {
  const [loading, setLoading] = useState(false);
  const [ledgers, setLedgers] = useState([]);
  const [selectedLedgerId, setSelectedLedgerId] = useState('');
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });
  const [voucherType, setVoucherType] = useState('all');
  const [isPosted, setIsPosted] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('voucherDate');
  const [sortOrder, setSortOrder] = useState('desc');

  const getAuthToken = () => {
    return (
      sessionStorage.getItem('token') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('authToken') ||
      localStorage.getItem('authToken')
    );
  };

  const getDefaultDateRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    return { startDate: start, endDate: end, key: 'selection' };
  };
  const [range, setRange] = useState(getDefaultDateRange());
  const [showCustomRange, setShowCustomRange] = useState(false);

  const fetchLedgers = async () => {
    if (!selectedCompanyId) return;
    try {
      const token = getAuthToken();
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/tally/ledger/all?company=${selectedCompanyId}&page=1&limit=1000&sortBy=name&sortOrder=asc&isActive=true`,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      const list = res.data?.ledgers || res.data?.data || [];
      setLedgers(list);
      if (!selectedLedgerId && list.length) {
        if (initialLedgerId) {
          setSelectedLedgerId(initialLedgerId);
        } else {
          setSelectedLedgerId(list[0]._id || list[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching ledgers:', error);
      alertify.error(error.response?.data?.message || 'Failed to load ledgers');
    }
  };

  const fetchEntries = async (page = 1) => {
    if (!selectedLedgerId) {
      setEntries([]);
      setSummary(null);
      return;
    }
    try {
      setLoading(true);
      const token = getAuthToken();
      const params = new URLSearchParams({
        startDate: format(range.startDate, 'yyyy-MM-dd'),
        endDate: format(range.endDate, 'yyyy-MM-dd'),
        page: page.toString(),
        limit: pagination.limit.toString()
      });
      if (voucherType && voucherType !== 'all') params.append('voucherType', voucherType);
      if (isPosted !== 'all') params.append('isPosted', isPosted);
      if (searchTerm) params.append('search', searchTerm);

      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/tally/financial-reports/ledger/${selectedLedgerId}/entries?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      const dataEntries = res.data?.entries || res.data?.data?.entries || [];
      const dataSummary = res.data?.summary || res.data?.data?.summary || null;
      setEntries(dataEntries);
      setSummary(dataSummary);
      if (res.data?.pagination) setPagination(res.data.pagination);
    } catch (error) {
      console.error('Error fetching ledger entries:', error);
      alertify.error(error.response?.data?.message || 'Failed to load ledger entries');
      setEntries([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLedgers(); }, [selectedCompanyId, initialLedgerId]);
  useEffect(() => { if (initialLedgerId) setSelectedLedgerId(initialLedgerId); }, [initialLedgerId]);
  useEffect(() => { if (selectedLedgerId) fetchEntries(1); }, [selectedLedgerId, voucherType, isPosted, range]);

  const voucherTypes = [
    { value: 'all', label: 'All' },
    { value: 'contra', label: 'Contra' },
    { value: 'payment', label: 'Payment' },
    { value: 'receipt', label: 'Receipt' },
    { value: 'journal', label: 'Journal' },
    { value: 'sales', label: 'Sales' },
    { value: 'purchase', label: 'Purchase' },
    { value: 'creditNote', label: 'Credit Note' },
    { value: 'debitNote', label: 'Debit Note' }
  ];

  return (
    <div className="p-6">
      {loading && <Loader variant="section" message="Loading ledger entries..." />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Ledger Entries</h2>
          <p className="text-gray-600">View all vouchers that include the selected ledger</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 mb-4">
        <div className="grid grid-cols-3 md:grid-cols-4 gap-4 items-center">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Ledger</label>
          <SearchableDropdown
            value={selectedLedgerId}
            onChange={setSelectedLedgerId}
            options={ledgers.map(l => ({ value: l._id || l.id, label: l.name || 'Unknown' }))}
            placeholder="Select ledger"
            loading={!ledgers.length}
            disabled={!!initialLedgerId}
          />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Voucher Type</label>
            <SearchableDropdown
              value={voucherType}
              onChange={setVoucherType}
              options={voucherTypes}
              placeholder="All types"
              compact
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Posted Status</label>
            <SearchableDropdown
              value={isPosted}
              onChange={setIsPosted}
              options={[{ value: 'all', label: 'All' }, { value: 'true', label: 'Posted' }, { value: 'false', label: 'Unposted' }]}
              placeholder="All"
              compact
            />
          </div>
          <div className="flex flex-col">
            <label className="block text-sm text-gray-600 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onBlur={() => fetchEntries(1)}
                placeholder="Search narration or number..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <button
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
            onClick={() => setShowCustomRange(!showCustomRange)}
          >
            <Calendar size={16} />
            {format(range.startDate, 'yyyy-MM-dd')} to {format(range.endDate, 'yyyy-MM-dd')}
          </button>
          {showCustomRange && (
            <div className="mt-2">
              <DateRange
                ranges={[range]}
                onChange={(item) => setRange(item.selection)}
                showDateDisplay={false}
              />
            </div>
          )}
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-blue-200">
            <p className="text-sm text-gray-600">Total Entries</p>
            <p className="text-2xl font-bold text-blue-700">{summary.totalEntries || 0}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-green-200">
            <p className="text-sm text-gray-600">Debit Total</p>
            <p className="text-2xl font-bold text-green-700">₹{Number(summary.debitTotal || 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-orange-200">
            <p className="text-sm text-gray-600">Credit Total</p>
            <p className="text-2xl font-bold text-orange-700">₹{Number(summary.creditTotal || 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-gray-200">
            <p className="text-sm text-gray-600">Balance</p>
            <p className="text-2xl font-bold text-gray-700">₹{Number(summary.balance || 0).toLocaleString('en-IN')}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-700">
            <FileText size={18} />
            <span className="font-semibold">Entries</span>
          </div>
          <button
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            <ArrowUpDown size={16} />
            Sort by {sortBy} ({sortOrder})
          </button>
        </div>
        <div>
          <div className="px-4 py-2 grid grid-cols-12 gap-2 bg-gray-100 text-xs font-semibold text-gray-700">
            <div className="col-span-2">Type/Number</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-2">Debit</div>
            <div className="col-span-2">Credit</div>
            <div className="col-span-4">Narration</div>
          </div>
          <div className="divide-y">
            {entries.length === 0 ? (
              <div className="p-10 text-center text-gray-500">No entries found</div>
            ) : (
              entries.map((e, idx) => (
                <div key={idx} className="px-4 py-3 grid grid-cols-12 gap-2 items-center hover:bg-gray-50">
                  <div className="col-span-2">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{e.voucherType}</span>
                    <div className="text-sm text-gray-800 font-semibold">{e.voucherNumber || e.invoiceNumber || '-'}</div>
                  </div>
                  <div className="col-span-2 text-sm text-gray-700">{e.voucherDate ? new Date(e.voucherDate).toLocaleDateString('en-IN') : '-'}</div>
                  <div className="col-span-2 text-sm">
                    <span className="text-green-700 font-semibold">{e.entryType === 'Debit' ? `₹${Number(e.amount || 0).toLocaleString('en-IN')}` : '-'}</span>
                  </div>
                  <div className="col-span-2 text-sm">
                    <span className="text-orange-700 font-semibold">{e.entryType === 'Credit' ? `₹${Number(e.amount || 0).toLocaleString('en-IN')}` : '-'}</span>
                  </div>
                  <div className="col-span-4 text-sm text-gray-700 truncate">{e.narration || '-'}</div>
                </div>
              ))
            )}
          </div>
        </div>
        {pagination.pages > 1 && (
          <div className="px-4 py-3 flex items-center justify-between bg-gray-50">
            <button
              className="px-3 py-1 rounded bg-gray-100 text-gray-700 disabled:opacity-50"
              disabled={pagination.page <= 1}
              onClick={() => fetchEntries(pagination.page - 1)}
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">Page {pagination.page} of {pagination.pages}</span>
            <button
              className="px-3 py-1 rounded bg-gray-100 text-gray-700 disabled:opacity-50"
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchEntries(pagination.page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LedgerEntries;
