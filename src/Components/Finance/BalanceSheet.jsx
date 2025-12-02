import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API_CONFIG from '../../config/api.js';
import { Search, Calendar, Building, TrendingUp, TrendingDown, Wallet, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import { format } from 'date-fns';

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
  
  const paddingClass = compact ? 'px-3 py-2' : 'px-4 py-3';
  const borderClass = 'border-gray-300';
  const textSizeClass = compact ? 'text-sm' : '';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className={`w-full ${paddingClass} border ${borderClass} rounded-lg bg-white ${compact ? 'focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent' : 'focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent'} cursor-pointer ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400'
        }`}
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <span className={`${selectedOption ? 'text-gray-900' : 'text-gray-500'} ${textSizeClass}`}>
            {loading ? 'Loading...' : selectedOption ? selectedOption.label : placeholder}
          </span>
          <svg
            className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && !disabled && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
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
                  key={index}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
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

const BalanceSheet = ({ selectedCompanyId }) => {
  // State Management
  const [loading, setLoading] = useState(false);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [asOnDate, setAsOnDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [includeZeroBalance, setIncludeZeroBalance] = useState(false);

  // Get Auth Token
  const getAuthToken = () => {
    return sessionStorage.getItem("token") || localStorage.getItem("token") || 
           sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
  };

  // Fetch Balance Sheet
  const fetchBalanceSheet = async () => {
    if (!selectedCompanyId) {
      setBalanceSheet(null);
      return;
    }

    try {
      setLoading(true);
      const token = getAuthToken();
      const params = new URLSearchParams({
        asOnDate,
        includeZeroBalance: includeZeroBalance.toString()
      });

      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/tally/balance-sheet/company/${selectedCompanyId}?${params}`,
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      setBalanceSheet(response.data);
    } catch (error) {
      console.error('Error fetching balance sheet:', error);
      alertify.error(error.response?.data?.message || 'Failed to load balance sheet');
      setBalanceSheet(null);
    } finally {
      setLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    if (selectedCompanyId) {
      fetchBalanceSheet();
    }
  }, [selectedCompanyId, asOnDate, includeZeroBalance]);

  // Loading State
  if (loading && !balanceSheet) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading balance sheet...</p>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Balance Sheet</h1>
          <p className="text-gray-600">Financial position statement showing Assets, Liabilities, and Capital</p>
        </div>

        {/* Filters */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            {/* Date Selection */}
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-gray-600" />
              <input
                type="date"
                value={asOnDate}
                onChange={(e) => setAsOnDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
        </div>

        {/* Balance Sheet Content */}
        {!balanceSheet ? (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-20 text-center">
            <XCircle className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Data Available</h3>
            <p className="text-gray-500">No balance sheet data available for the selected date</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-green-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="text-green-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Assets</p>
                    <p className="text-xl font-bold text-green-600">
                      ₹{Number(balanceSheet.summary?.totalAssets || 0).toLocaleString('en-IN')}
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
                      ₹{Number(balanceSheet.summary?.totalLiabilities || 0).toLocaleString('en-IN')}
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
                      ₹{Number(balanceSheet.summary?.totalCapital || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`bg-white rounded-2xl shadow-xl p-4 border-2 ${balanceSheet.summary?.isBalanced ? 'border-green-200' : 'border-red-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${balanceSheet.summary?.isBalanced ? 'bg-green-100' : 'bg-red-100'}`}>
                    {balanceSheet.summary?.isBalanced ? (
                      <CheckCircle className="text-green-600" size={20} />
                    ) : (
                      <XCircle className="text-red-600" size={20} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Balance Status</p>
                    <p className={`text-xl font-bold ${balanceSheet.summary?.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                      {balanceSheet.summary?.isBalanced ? 'Balanced' : 'Unbalanced'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Balance Sheet Grid */}
            <div className="grid grid-cols-2 gap-6">
              {/* Left Side - Assets */}
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-t-2xl">
                  <h2 className="text-xl font-bold">ASSETS</h2>
                  <p className="text-sm text-green-100">What the company owns</p>
                </div>

                {/* Fixed Assets */}
                {balanceSheet.balanceSheet?.assets?.fixedAssets?.accounts?.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="bg-gray-100 p-3">
                      <h3 className="font-bold text-gray-800">Fixed Assets</h3>
                    </div>
                    <div className="p-4 space-y-2">
                      {balanceSheet.balanceSheet.assets.fixedAssets.accounts.map((account, index) => (
                        <div key={account.accountId || index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                          <span className="text-gray-700">{account.accountName}</span>
                          <span className="font-semibold text-gray-800">
                            ₹{Number(account.balance || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
                        <span className="font-bold text-gray-800">Total Fixed Assets</span>
                        <span className="font-bold text-green-600">
                          ₹{Number(balanceSheet.balanceSheet.assets.fixedAssets.total || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Current Assets */}
                {balanceSheet.balanceSheet?.assets?.currentAssets?.accounts?.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="bg-gray-100 p-3">
                      <h3 className="font-bold text-gray-800">Current Assets</h3>
                    </div>
                    <div className="p-4 space-y-2">
                      {balanceSheet.balanceSheet.assets.currentAssets.accounts.map((account, index) => (
                        <div key={account.accountId || index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                          <span className="text-gray-700">{account.accountName}</span>
                          <span className="font-semibold text-gray-800">
                            ₹{Number(account.balance || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
                        <span className="font-bold text-gray-800">Total Current Assets</span>
                        <span className="font-bold text-green-600">
                          ₹{Number(balanceSheet.balanceSheet.assets.currentAssets.total || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Investments */}
                {balanceSheet.balanceSheet?.assets?.investments?.accounts?.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="bg-gray-100 p-3">
                      <h3 className="font-bold text-gray-800">Investments</h3>
                    </div>
                    <div className="p-4 space-y-2">
                      {balanceSheet.balanceSheet.assets.investments.accounts.map((account, index) => (
                        <div key={account.accountId || index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                          <span className="text-gray-700">{account.accountName}</span>
                          <span className="font-semibold text-gray-800">
                            ₹{Number(account.balance || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
                        <span className="font-bold text-gray-800">Total Investments</span>
                        <span className="font-bold text-green-600">
                          ₹{Number(balanceSheet.balanceSheet.assets.investments.total || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Loans & Advances */}
                {balanceSheet.balanceSheet?.assets?.loansAndAdvances?.accounts?.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="bg-gray-100 p-3">
                      <h3 className="font-bold text-gray-800">Loans & Advances</h3>
                    </div>
                    <div className="p-4 space-y-2">
                      {balanceSheet.balanceSheet.assets.loansAndAdvances.accounts.map((account, index) => (
                        <div key={account.accountId || index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                          <span className="text-gray-700">{account.accountName}</span>
                          <span className="font-semibold text-gray-800">
                            ₹{Number(account.balance || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
                        <span className="font-bold text-gray-800">Total Loans & Advances</span>
                        <span className="font-bold text-green-600">
                          ₹{Number(balanceSheet.balanceSheet.assets.loansAndAdvances.total || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Total Assets */}
                <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-2xl">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">TOTAL ASSETS</span>
                    <span className="text-2xl font-bold">
                      ₹{Number(balanceSheet.balanceSheet?.assets?.total || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side - Liabilities & Capital */}
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 rounded-t-2xl">
                  <h2 className="text-xl font-bold">LIABILITIES & CAPITAL</h2>
                  <p className="text-sm text-red-100">What the company owes</p>
                </div>

                {/* Capital */}
                {balanceSheet.balanceSheet?.capital?.accounts?.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="bg-purple-100 p-3">
                      <h3 className="font-bold text-purple-800">Capital</h3>
                    </div>
                    <div className="p-4 space-y-2">
                      {balanceSheet.balanceSheet.capital.accounts.map((account, index) => (
                        <div key={account.accountId || index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                          <span className="text-gray-700">{account.accountName}</span>
                          <span className="font-semibold text-gray-800">
                            ₹{Number(account.balance || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
                        <span className="font-bold text-gray-800">Total Capital</span>
                        <span className="font-bold text-purple-600">
                          ₹{Number(balanceSheet.balanceSheet.capital.total || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Long-term Liabilities */}
                {balanceSheet.balanceSheet?.liabilities?.longTermLiabilities?.accounts?.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="bg-gray-100 p-3">
                      <h3 className="font-bold text-gray-800">Long-term Liabilities</h3>
                    </div>
                    <div className="p-4 space-y-2">
                      {balanceSheet.balanceSheet.liabilities.longTermLiabilities.accounts.map((account, index) => (
                        <div key={account.accountId || index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                          <span className="text-gray-700">{account.accountName}</span>
                          <span className="font-semibold text-gray-800">
                            ₹{Number(account.balance || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
                        <span className="font-bold text-gray-800">Total Long-term Liabilities</span>
                        <span className="font-bold text-red-600">
                          ₹{Number(balanceSheet.balanceSheet.liabilities.longTermLiabilities.total || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Current Liabilities */}
                {balanceSheet.balanceSheet?.liabilities?.currentLiabilities?.accounts?.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="bg-gray-100 p-3">
                      <h3 className="font-bold text-gray-800">Current Liabilities</h3>
                    </div>
                    <div className="p-4 space-y-2">
                      {balanceSheet.balanceSheet.liabilities.currentLiabilities.accounts.map((account, index) => (
                        <div key={account.accountId || index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                          <span className="text-gray-700">{account.accountName}</span>
                          <span className="font-semibold text-gray-800">
                            ₹{Number(account.balance || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
                        <span className="font-bold text-gray-800">Total Current Liabilities</span>
                        <span className="font-bold text-red-600">
                          ₹{Number(balanceSheet.balanceSheet.liabilities.currentLiabilities.total || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Total Liabilities & Capital */}
                <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 rounded-2xl">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">TOTAL LIABILITIES & CAPITAL</span>
                    <span className="text-2xl font-bold">
                      ₹{Number(balanceSheet.summary?.totalLiabilitiesAndCapital || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Balance Check Alert */}
            {!balanceSheet.summary?.isBalanced && (
              <div className="mt-6 bg-red-50 border-2 border-red-300 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <XCircle className="text-red-600" size={24} />
                  <div>
                    <h3 className="font-bold text-red-800">Balance Sheet is Unbalanced!</h3>
                    <p className="text-red-700">
                      Difference: ₹{Number(balanceSheet.summary?.difference || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-sm text-red-600 mt-1">
                      Please check your voucher entries. Assets should equal Liabilities + Capital.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default BalanceSheet;
