import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API_CONFIG from '../../config/api.js';
import { Search, Eye, FileText, Calendar, Building } from 'lucide-react';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import { DateRange } from 'react-date-range';
import { addDays, format } from 'date-fns';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

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

const Daybook = ({ selectedCompanyId }) => {
  // State Management
  const [loading, setLoading] = useState(false);
  const [vouchers, setVouchers] = useState([]);
  const [filteredVouchers, setFilteredVouchers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [voucherTypeFilter, setVoucherTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  
  // Stats for counts
  const [stats, setStats] = useState({ total: 0, posted: 0, unposted: 0 });

  // Modal States
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);

  // Date range state - Default: Jan 1 of previous year to Jan 1 of next year
  const getDefaultDateRange = () => {
    const currentYear = new Date().getFullYear();
    return {
      startDate: new Date(currentYear - 1, 0, 1), // Jan 1 of previous year
      endDate: new Date(currentYear + 1, 0, 1),   // Jan 1 of next year
      key: 'selection'
    };
  };

  const [range, setRange] = useState(getDefaultDateRange());
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [dateFilterApplied, setDateFilterApplied] = useState(true); // Default filter applied

  // Get Auth Token
  const getAuthToken = () => {
    return sessionStorage.getItem("token") || localStorage.getItem("token") || 
           sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
  };

  // Fetch Stats
  const fetchStats = async () => {
    if (!selectedCompanyId) {
      setStats({ total: 0, posted: 0, unposted: 0 });
      return;
    }

    try {
      const token = getAuthToken();
      const params = new URLSearchParams({
        includeInactive: false,
        includeUnposted: true,
        page: 1,
        limit: 1000
      });

      // Only add date filter if explicitly applied
      if (dateFilterApplied && range) {
        params.append('startDate', format(range.startDate, 'yyyy-MM-dd'));
        params.append('endDate', format(range.endDate, 'yyyy-MM-dd'));
      }

      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/tally/daybook/company/${selectedCompanyId}/date-range?${params}`,
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      const allVouchers = response.data?.vouchers || [];
      const total = response.data?.summary?.totalVouchers || allVouchers.length;
      const posted = response.data?.summary?.posted || allVouchers.filter(v => v.isPosted).length;
      const unposted = response.data?.summary?.unposted || allVouchers.filter(v => !v.isPosted).length;

      setStats({ total, posted, unposted });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({ total: 0, posted: 0, unposted: 0 });
    }
  };

  // Fetch Daybook
  const fetchDaybook = async (page = 1) => {
    if (!selectedCompanyId) {
      setVouchers([]);
      setFilteredVouchers([]);
      return;
    }

    try {
      setLoading(true);
      const token = getAuthToken();
      const params = new URLSearchParams({
        includeInactive: false,
        includeUnposted: true,
        page: page.toString(),
        limit: '10',
        sortBy: 'voucherDate',
        sortOrder: 'desc'
      });

      // Only add date filter if explicitly applied
      if (dateFilterApplied && range) {
        params.append('startDate', format(range.startDate, 'yyyy-MM-dd'));
        params.append('endDate', format(range.endDate, 'yyyy-MM-dd'));
      }

      if (searchTerm) params.append('search', searchTerm);
      if (voucherTypeFilter) params.append('voucherType', voucherTypeFilter);

      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/tally/daybook/company/${selectedCompanyId}/date-range?${params}`,
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      const vouchersList = response.data?.vouchers || response.data?.data || [];
      setVouchers(vouchersList);
      setFilteredVouchers(vouchersList);
      
      if (response.data?.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching daybook:', error);
      alertify.error(error.response?.data?.message || 'Failed to load daybook');
      setVouchers([]);
      setFilteredVouchers([]);
    } finally {
      setLoading(false);
    }
  };

  // Open View Modal
  const openViewModal = (voucher) => {
    setSelectedVoucher(voucher);
    setShowViewModal(true);
  };

  // Voucher type color helper
  const voucherTypeColor = (type) => {
    const colors = {
      'Contra': 'bg-blue-100 text-blue-700',
      'Payment': 'bg-red-100 text-red-700',
      'Receipt': 'bg-green-100 text-green-700',
      'Journal': 'bg-purple-100 text-purple-700',
      'Sales': 'bg-teal-100 text-teal-700',
      'Purchase': 'bg-orange-100 text-orange-700',
      'Credit Note': 'bg-pink-100 text-pink-700',
      'Debit Note': 'bg-indigo-100 text-indigo-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  // Effects
  useEffect(() => {
    if (selectedCompanyId) {
      fetchStats();
      fetchDaybook(currentPage);
    }
  }, [selectedCompanyId, currentPage, dateFilterApplied, voucherTypeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedCompanyId) {
        setCurrentPage(1);
        fetchDaybook(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Loading State
  if (loading && vouchers.length === 0) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading daybook...</p>
          </div>
        </div>
      </div>
    );
  }

  const voucherTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 'Contra', label: 'Contra' },
    { value: 'Payment', label: 'Payment' },
    { value: 'Receipt', label: 'Receipt' },
    { value: 'Journal', label: 'Journal' },
    { value: 'Sales', label: 'Sales' },
    { value: 'Purchase', label: 'Purchase' },
    { value: 'Credit Note', label: 'Credit Note' },
    { value: 'Debit Note', label: 'Debit Note' }
  ];

  return (
    <>
      <style>{`
        /* Hide scrollbar for specific elements */
        .hide-scrollbar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
          overflow: auto;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        
        /* Hide scrollbar globally for all elements */
        * {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
        *::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        
        /* Ensure body and html can still scroll */
        html, body {
          overflow: auto;
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
        html::-webkit-scrollbar, body::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `}</style>
      <div className="p-6 hide-scrollbar">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-6">
            {/* Total Vouchers Card */}
            <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <FileText className="text-green-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Vouchers</p>
                  <p className="text-xl font-bold text-gray-800">{stats.total}</p>
                </div>
              </div>
            </div>

            {/* Posted Card */}
            {/* <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Posted</p>
                  <p className="text-xl font-bold text-blue-600">{stats.posted}</p>
                </div>
              </div>
            </div> */}

            {/* Unposted Card */}
            {/* <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <XCircle className="text-red-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Unposted</p>
                  <p className="text-xl font-bold text-red-600">{stats.unposted}</p>
                </div>
              </div>
            </div> */}
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search vouchers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Voucher Type Filter */}
            <div className="relative">
              <SearchableDropdown
                value={voucherTypeFilter}
                onChange={(value) => {
                  setVoucherTypeFilter(value);
                  setCurrentPage(1);
                }}
                options={voucherTypeOptions}
                placeholder="All Types"
                searchPlaceholder="Search types..."
                className="w-48"
                compact={true}
              />
            </div>

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
                    // Reset to default range if cancelled
                    setRange(getDefaultDateRange());
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomRange(false);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Apply Filter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto hide-scrollbar">
            <table className="w-full">
              <thead className="bg-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 text-black font-semibold text-sm uppercase tracking-wider">Date</th>
                  <th className="text-left py-4 px-6 text-black font-semibold text-sm uppercase tracking-wider">Voucher No.</th>
                  <th className="text-left py-4 px-6 text-black font-semibold text-sm uppercase tracking-wider">Type</th>
                  <th className="text-left py-4 px-6 text-black font-semibold text-sm uppercase tracking-wider">Narration</th>
                  <th className="text-right py-4 px-6 text-black font-semibold text-sm uppercase tracking-wider">Debit</th>
                  <th className="text-right py-4 px-6 text-black font-semibold text-sm uppercase tracking-wider">Credit</th>
                  <th className="text-center py-4 px-6 text-black font-semibold text-sm uppercase tracking-wider">Status</th>
                  <th className="text-center py-4 px-6 text-black font-semibold text-sm uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-20 text-center">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : filteredVouchers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-20 text-center">
                      <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">No Vouchers Found</h3>
                      <p className="text-gray-500">No vouchers available for the selected criteria</p>
                    </td>
                  </tr>
                ) : (
                  filteredVouchers.map((voucher, index) => (
                    <tr 
                      key={voucher._id || index} 
                      className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-2">
                          <Calendar size={24} className="text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {voucher.voucherDate ? format(new Date(voucher.voucherDate), 'dd MMM yyyy') : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-mono text-sm font-semibold text-blue-600">
                          {voucher.voucherNumber || '-'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${voucherTypeColor(voucher.voucherType)}`}>
                          {voucher.voucherType || '-'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-gray-700 line-clamp-2">
                          {voucher.narration || '-'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="text-sm font-semibold text-green-600">
                          ₹{Number(voucher.debitAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="text-sm font-semibold text-red-600">
                          ₹{Number(voucher.creditAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                          voucher.isPosted ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {voucher.isPosted ? 'Posted' : 'Unposted'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => openViewModal(voucher)}
                          className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md"
                        >
                          <Eye size={16} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && !loading && filteredVouchers.length > 0 && (
            <div className="flex justify-center items-center gap-2 p-4 border-t border-gray-100">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg font-semibold ${currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
              >
                Previous
              </button>
              {[...Array(pagination.pages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-4 py-2 rounded-lg font-semibold ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                disabled={currentPage === pagination.pages}
                className={`px-4 py-2 rounded-lg font-semibold ${currentPage === pagination.pages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* View Modal */}
        {showViewModal && selectedVoucher && (
          <div 
            className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex justify-center items-center p-4"
            onClick={() => setShowViewModal(false)}
          >
            <div 
              className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto hide-scrollbar"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <Eye className="text-white" size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Voucher Details</h2>
                      <p className="text-blue-100">{selectedVoucher.voucherNumber}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="text-white hover:text-gray-200 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Information */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-800 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4 bg-white p-4 border border-blue-100 rounded-2xl">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Voucher Type</label>
                      <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${voucherTypeColor(selectedVoucher.voucherType)}`}>
                        {selectedVoucher.voucherType}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                      <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${selectedVoucher.isPosted ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {selectedVoucher.isPosted ? 'Posted' : 'Unposted'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Voucher Date</label>
                      <p className="text-gray-900 font-medium">
                        {selectedVoucher.voucherDate ? format(new Date(selectedVoucher.voucherDate), 'dd MMM yyyy') : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Voucher Number</label>
                      <p className="text-gray-900 font-medium">{selectedVoucher.voucherNumber || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Narration */}
                {selectedVoucher.narration && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    
                    <label className="block text-sm font-medium text-blue-700 mb-2">Narration</label>
                    <div className='bg-white p-4 rounded-2xl border border-blue-200'>
                    <p className="text-gray-900">{selectedVoucher.narration}</p>
                    </div>
                  </div>
                )}

                {/* Account Entries */}
                {selectedVoucher.accounts && selectedVoucher.accounts.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Account Entries</label>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-800 uppercase">Account</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-800 uppercase">Type</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-800 uppercase">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {selectedVoucher.accounts.map((acc, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {acc.account?.name || '-'}
                                {acc.account?.accountType && (
                                  <span className="ml-2 text-xs text-gray-500">({acc.account.accountType})</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  acc.type === 'Debit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {acc.type}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                                ₹{Number(acc.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Totals */}
                <div className="grid grid-cols-2 gap-6 bg-orange-50 p-6 rounded-lg border border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Total Debit</label>
                    <p className="text-2xl font-bold text-green-600">
                      ₹{Number(selectedVoucher.debitAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Total Credit</label>
                    <p className="text-2xl font-bold text-red-600">
                      ₹{Number(selectedVoucher.creditAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Created By */}
                {selectedVoucher.createdBy && (
                  <div className="border-t border-gray-200 pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Created By</label>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">
                          {selectedVoucher.createdBy.name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedVoucher.createdBy.name || '-'}</p>
                        <p className="text-xs text-gray-500">{selectedVoucher.createdBy.email || '-'}</p>
                      </div>
                    </div>
                    {selectedVoucher.createdAt && (
                      <p className="text-xs text-gray-500 mt-2">
                        Created on {format(new Date(selectedVoucher.createdAt), 'dd MMM yyyy, hh:mm a')}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 p-4 rounded-b-3xl flex justify-end gap-3">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Daybook;
