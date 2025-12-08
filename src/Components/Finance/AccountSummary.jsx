import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API_CONFIG from '../../config/api.js';
import { Search, Calendar, Building, Wallet, TrendingUp, TrendingDown, DollarSign, FileText } from 'lucide-react';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import { DateRange } from 'react-date-range';
import { addDays, format } from 'date-fns';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import Loader from '../common/Loader.jsx';

// Searchable Dropdown Component
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

  useEffect(() => {
    if (isOpen) {
      setHighlightIndex(0);
    }
  }, [isOpen]);

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
  const textSizeClass = compact ? 'text-sm' : '';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className={`w-full ${paddingClass} border ${borderClass} rounded-lg bg-white ${compact ? 'focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent' : 'focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent'} ${disabled ? 'bg-gray-100' : ''}`}>
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
              <div className="px-4 py-2 text-gray-500 text-sm text-center">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AccountSummary = ({ selectedCompanyId }) => {
  // State Management
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [includeZeroBalance, setIncludeZeroBalance] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Date range state - Default: Current financial year (Apr 1 to Mar 31)
  const getDefaultDateRange = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // If current month is Jan-Mar, financial year started last year
    const fyStartYear = currentMonth < 3 ? currentYear - 1 : currentYear;
    
    return {
      startDate: new Date(fyStartYear, 3, 1), // April 1
      endDate: new Date(fyStartYear + 1, 2, 31), // March 31 next year
      key: 'selection'
    };
  };

  const [range, setRange] = useState(getDefaultDateRange());
  const [showCustomRange, setShowCustomRange] = useState(false);

  // Get Auth Token
  const getAuthToken = () => {
    return sessionStorage.getItem("token") || localStorage.getItem("token") || 
           sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
  };

  // Fetch Account Summary
  const fetchAccountSummary = async () => {
    if (!selectedCompanyId) {
      setSummary(null);
      return;
    }

    try {
      setLoading(true);
      const token = getAuthToken();
      const params = new URLSearchParams({
        fromDate: format(range.startDate, 'yyyy-MM-dd'),
        toDate: format(range.endDate, 'yyyy-MM-dd'),
        includeZeroBalance: includeZeroBalance.toString(),
        groupBy: 'type'
      });

      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/tally/account-summary/company/${selectedCompanyId}?${params}`,
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      setSummary(response.data?.summary || null);
    } catch (error) {
      console.error('Error fetching account summary:', error);
      alertify.error(error.response?.data?.message || 'Failed to load account summary');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  // Filter accounts by search term
  const filterAccounts = (accounts) => {
    if (!searchTerm.trim()) return accounts;
    return accounts.filter(acc => 
      acc.accountName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.accountType?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Get category icon
  const getCategoryIcon = (category) => {
    const icons = {
      assets: <TrendingUp className="text-green-600" size={20} />,
      liabilities: <TrendingDown className="text-red-600" size={20} />,
      capital: <Wallet className="text-purple-600" size={20} />,
      income: <DollarSign className="text-teal-600" size={20} />,
      expenses: <FileText className="text-orange-600" size={20} />
    };
    return icons[category] || <FileText className="text-gray-600" size={20} />;
  };

  // Get category color
  const getCategoryColor = (category) => {
    const colors = {
      assets: 'bg-green-100 border-green-300',
      liabilities: 'bg-red-100 border-red-300',
      capital: 'bg-purple-100 border-purple-300',
      income: 'bg-teal-100 border-teal-300',
      expenses: 'bg-orange-100 border-orange-300'
    };
    return colors[category] || 'bg-gray-100 border-gray-300';
  };

  // Effects
  useEffect(() => {
    if (selectedCompanyId) {
      fetchAccountSummary();
    }
  }, [selectedCompanyId, range, includeZeroBalance]);

  // Loading State
  if (loading && !summary) {
    return <Loader variant="section" message="Loading account summary..." />;
  }

  const categories = [
    { key: 'all', label: 'All Categories', count: summary?.totalAccounts || 0 },
    { key: 'assets', label: 'Assets', count: summary?.assets?.length || 0 },
    { key: 'liabilities', label: 'Liabilities', count: summary?.liabilities?.length || 0 },
    { key: 'capital', label: 'Capital', count: summary?.capital?.length || 0 },
    { key: 'income', label: 'Income', count: summary?.income?.length || 0 },
    { key: 'expenses', label: 'Expenses', count: summary?.expenses?.length || 0 }
  ];

  return (
    <>
      <style>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="p-6 hide-scrollbar">
        {/* Header */}
        {/* <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Account Summary</h1>
          <p className="text-gray-600">Comprehensive summary of all ledger accounts with balances</p>
        </div> */}

        {/* Filters */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Include Zero Balance */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeZeroBalance}
                onChange={(e) => setIncludeZeroBalance(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Include Zero Balance</span>
            </label>
          </div>

          <div className="flex items-center gap-4">
            {/* Date Range Button */}
            <button
              onClick={() => setShowCustomRange(true)}
              className="flex items-center gap-2 px-4 py-2 border border-blue-500 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
            >
              <Calendar size={18} className="text-blue-600" />
              <span className="text-sm font-medium">
                {format(range.startDate, 'dd MMM yyyy')} - {format(range.endDate, 'dd MMM yyyy')}
              </span>
            </button>
          </div>
        </div>

        {/* Custom Date Range Modal */}
        {showCustomRange && (
          <div 
            className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4"
            onClick={() => setShowCustomRange(false)}
          >
            <div 
              className="bg-white rounded-xl shadow-2xl p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Date Range</h3>
              <DateRange
                ranges={[range]}
                onChange={(item) => setRange(item.selection)}
                moveRangeOnFirstSelection={false}
                months={2}
                direction="horizontal"
              />
              <div className="flex justify-end gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomRange(false);
                    setRange(getDefaultDateRange());
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomRange(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Apply Filter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-green-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="text-green-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Assets</p>
                  <p className="text-xl font-bold text-green-600">
                    ₹{Number(summary.totals?.totalAssets || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-red-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <TrendingDown className="text-red-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Liabilities</p>
                  <p className="text-xl font-bold text-red-600">
                    ₹{Number(summary.totals?.totalLiabilities || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-purple-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Wallet className="text-purple-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Capital</p>
                  <p className="text-xl font-bold text-purple-600">
                    ₹{Number(summary.totals?.totalCapital || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-teal-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="text-teal-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Income</p>
                  <p className="text-xl font-bold text-teal-600">
                    ₹{Number(summary.totals?.totalIncome || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-orange-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <FileText className="text-orange-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Expenses</p>
                  <p className="text-xl font-bold text-orange-600">
                    ₹{Number(summary.totals?.totalExpenses || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar">
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                selectedCategory === cat.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>

        {/* Accounts Table */}
        {!summary ? (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-20 text-center">
            <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Data Available</h3>
            <p className="text-gray-500">No account summary data available for the selected period</p>
          </div>
        ) : (
          <div className="space-y-6">
            {['assets', 'liabilities', 'capital', 'income', 'expenses'].map(category => {
              if (selectedCategory !== 'all' && selectedCategory !== category) return null;
              
              const accounts = filterAccounts(summary[category] || []);
              if (accounts.length === 0) return null;

              return (
                <div key={category} className={`bg-white rounded-2xl shadow-xl border-2 ${getCategoryColor(category)} overflow-hidden`}>
                  <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                      {getCategoryIcon(category)}
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 capitalize">{category} ({accounts.length})</h3>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-3 px-4 text-gray-700 font-semibold text-sm">Account Name</th>
                          <th className="text-left py-3 px-4 text-gray-700 font-semibold text-sm">Type</th>
                          <th className="text-right py-3 px-4 text-gray-700 font-semibold text-sm">Opening Balance</th>
                          <th className="text-right py-3 px-4 text-gray-700 font-semibold text-sm">Debit</th>
                          <th className="text-right py-3 px-4 text-gray-700 font-semibold text-sm">Credit</th>
                          <th className="text-right py-3 px-4 text-gray-700 font-semibold text-sm">Closing Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accounts.map((account, index) => (
                          <tr key={account.accountId || index} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                            <td className="py-3 px-4">
                              <span className="font-medium text-gray-800">{account.accountName || '-'}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-gray-600">{account.accountType || '-'}</span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="font-medium text-gray-700">
                                ₹{Number(account.openingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="font-medium text-green-600">
                                ₹{Number(account.periodDebit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="font-medium text-red-600">
                                ₹{Number(account.periodCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className={`font-bold ${account.isDebit ? 'text-green-700' : 'text-red-700'}`}>
                                ₹{Number(account.absoluteBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                <span className="text-xs ml-1">({account.isDebit ? 'Dr' : 'Cr'})</span>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default AccountSummary;
