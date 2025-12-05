import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API_CONFIG from '../../config/api.js';
import { Search, Calendar, Building, FileText, AlertCircle, CheckCircle, TrendingUp, DollarSign, Users } from 'lucide-react';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import { DateRange } from 'react-date-range';
import { format } from 'date-fns';
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

const StatutoryReports = ({ selectedCompanyId }) => {
  // State Management
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState('gst');
  
  // Report Data
  const [gstSummary, setGstSummary] = useState(null);
  const [tdsSummary, setTdsSummary] = useState(null);
  const [msmeReport, setMsmeReport] = useState(null);
  const [msmeForm1, setMsmeForm1] = useState(null);

  // Date range state - Default: Current financial year
  const getDefaultDateRange = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    const fyStartYear = currentMonth < 3 ? currentYear - 1 : currentYear;
    
    return {
      startDate: new Date(fyStartYear, 3, 1),
      endDate: new Date(fyStartYear + 1, 2, 31),
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

  // Fetch GST Summary
  const fetchGSTSummary = async () => {
    if (!selectedCompanyId) return;

    try {
      setLoading(true);
      const token = getAuthToken();
      const params = new URLSearchParams({
        fromDate: format(range.startDate, 'yyyy-MM-dd'),
        toDate: format(range.endDate, 'yyyy-MM-dd')
      });

      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/tally/statutory-reports/gst-summary/company/${selectedCompanyId}?${params}`,
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      setGstSummary(response.data);
    } catch (error) {
      console.error('Error fetching GST summary:', error);
      alertify.error(error.response?.data?.message || 'Failed to load GST summary');
      setGstSummary(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch TDS Summary
  const fetchTDSSummary = async () => {
    if (!selectedCompanyId) return;

    try {
      setLoading(true);
      const token = getAuthToken();
      const params = new URLSearchParams({
        fromDate: format(range.startDate, 'yyyy-MM-dd'),
        toDate: format(range.endDate, 'yyyy-MM-dd')
      });

      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/tally/statutory-reports/tds-summary/company/${selectedCompanyId}?${params}`,
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      setTdsSummary(response.data);
    } catch (error) {
      console.error('Error fetching TDS summary:', error);
      alertify.error(error.response?.data?.message || 'Failed to load TDS summary');
      setTdsSummary(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch MSME Outstanding
  const fetchMSMEOutstanding = async () => {
    if (!selectedCompanyId) return;

    try {
      setLoading(true);
      const token = getAuthToken();

      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/tally/statutory-reports/msme-outstanding/company/${selectedCompanyId}`,
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      setMsmeReport(response.data);
    } catch (error) {
      console.error('Error fetching MSME report:', error);
      alertify.error(error.response?.data?.message || 'Failed to load MSME report');
      setMsmeReport(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch MSME Form 1
  const fetchMSMEForm1 = async () => {
    if (!selectedCompanyId) return;

    try {
      setLoading(true);
      const token = getAuthToken();

      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/tally/statutory-reports/msme-form1-annexure/company/${selectedCompanyId}`,
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      setMsmeForm1(response.data);
    } catch (error) {
      console.error('Error fetching MSME Form 1:', error);
      alertify.error(error.response?.data?.message || 'Failed to load MSME Form 1');
      setMsmeForm1(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch report based on selection
  const fetchReport = () => {
    switch (selectedReport) {
      case 'gst':
        fetchGSTSummary();
        break;
      case 'tds':
        fetchTDSSummary();
        break;
      case 'msme':
        fetchMSMEOutstanding();
        break;
      case 'msmeForm1':
        fetchMSMEForm1();
        break;
      default:
        break;
    }
  };

  // Effects
  useEffect(() => {
    if (selectedCompanyId) {
      fetchReport();
    }
  }, [selectedCompanyId, range, selectedReport]);

  // Loading State (tab-specific)
  if (loading) {
    const loadingMessage =
      selectedReport === 'gst' ? 'Loading GST summary...' :
      selectedReport === 'tds' ? 'Loading TDS summary...' :
      selectedReport === 'msme' ? 'Loading MSME outstanding...' :
      'Loading MSME Form 1...';
    return <Loader variant="section" message={loadingMessage} />;
  }

  const reportTypes = [
    { key: 'gst', label: 'GST Summary', icon: FileText },
    { key: 'tds', label: 'TDS Summary', icon: DollarSign },
    { key: 'msme', label: 'MSME Outstanding', icon: Users },
    { key: 'msmeForm1', label: 'MSME Form 1', icon: FileText }
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
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Statutory Reports</h1>
          <p className="text-gray-600">Compliance reports for GST, TDS, and MSME regulations</p>
        </div> */}

       

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

        {/* Report Type Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar">
          {reportTypes.map(report => {
            const Icon = report.icon;
            return (
              <button
                key={report.key}
                onClick={() => setSelectedReport(report.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                  selectedReport === report.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Icon size={18} />
                {report.label}
              </button>
            );
          })}
           {/* Filters */}
        <div className="flex justify-between items-center mb-6 ml-32">
          <div className="flex items-center gap-4">
            {/* Date Range Button (only for GST and TDS) */}
            {(selectedReport === 'gst' || selectedReport === 'tds') && (
              <button
                onClick={() => setShowCustomRange(true)}
                className="flex items-center gap-2 px-4 py-2 border border-blue-500 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
              >
                <Calendar size={18} className="text-blue-600" />
                <span className="text-sm font-medium">
                  {format(range.startDate, 'dd MMM yyyy')} - {format(range.endDate, 'dd MMM yyyy')}
                </span>
              </button>
            )}
          </div>
        </div>
        </div>

        {/* Report Content */}
        {selectedCompanyId && (
          <>
            {/* GST Summary Report */}
            {selectedReport === 'gst' && gstSummary && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <TrendingUp className="text-green-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Sales</p>
                        <p className="text-xl font-bold text-green-600">
                          ₹{Number(gstSummary.summary?.sales?.totalSales || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <DollarSign className="text-blue-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Output GST</p>
                        <p className="text-xl font-bold text-blue-600">
                          ₹{Number(gstSummary.summary?.sales?.totalOutputGST || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-purple-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <DollarSign className="text-purple-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Input GST</p>
                        <p className="text-xl font-bold text-purple-600">
                          ₹{Number(gstSummary.summary?.purchase?.totalInputGST || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-red-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                        <AlertCircle className="text-red-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Net GST Payable</p>
                        <p className="text-xl font-bold text-red-600">
                          ₹{Number(gstSummary.summary?.gstPayable?.netGSTPayable || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Breakdown */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Sales & Output GST</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Sales:</span>
                        <span className="font-semibold">₹{Number(gstSummary.summary?.sales?.totalSales || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">CGST:</span>
                        <span className="font-semibold">₹{Number(gstSummary.summary?.sales?.cgst || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">SGST:</span>
                        <span className="font-semibold">₹{Number(gstSummary.summary?.sales?.sgst || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">IGST:</span>
                        <span className="font-semibold">₹{Number(gstSummary.summary?.sales?.igst || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between pt-3 border-t border-gray-200">
                        <span className="text-gray-800 font-bold">Total Output GST:</span>
                        <span className="font-bold text-green-600">₹{Number(gstSummary.summary?.sales?.totalOutputGST || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Purchase & Input GST</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Purchase:</span>
                        <span className="font-semibold">₹{Number(gstSummary.summary?.purchase?.totalPurchase || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between pt-3 border-t border-gray-200">
                        <span className="text-gray-800 font-bold">Total Input GST:</span>
                        <span className="font-bold text-purple-600">₹{Number(gstSummary.summary?.purchase?.totalInputGST || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TDS Summary Report */}
            {selectedReport === 'tds' && tdsSummary && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <DollarSign className="text-blue-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total TDS Deducted</p>
                        <p className="text-xl font-bold text-blue-600">
                          ₹{Number(tdsSummary.summary?.totalTDSDeducted || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <TrendingUp className="text-green-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Amount on which TDS</p>
                        <p className="text-xl font-bold text-green-600">
                          ₹{Number(tdsSummary.summary?.totalAmountOnWhichTDS || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-purple-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <FileText className="text-purple-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Transactions</p>
                        <p className="text-xl font-bold text-purple-600">
                          {tdsSummary.summary?.totalTransactions || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* TDS by Section */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-4">
                    <h3 className="text-lg font-bold text-gray-800">TDS by Section</h3>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-3 px-4 text-gray-700 font-semibold text-sm">Section</th>
                          <th className="text-right py-3 px-4 text-gray-700 font-semibold text-sm">Rate (%)</th>
                          <th className="text-right py-3 px-4 text-gray-700 font-semibold text-sm">Total Amount</th>
                          <th className="text-right py-3 px-4 text-gray-700 font-semibold text-sm">Total TDS</th>
                          <th className="text-right py-3 px-4 text-gray-700 font-semibold text-sm">Transactions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tdsSummary.summary?.tdsBySection?.map((section, index) => (
                          <tr key={index} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                            <td className="py-3 px-4">
                              <span className="font-medium text-gray-800">{section.section}</span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="text-gray-700">{section.rate}%</span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="font-medium text-gray-700">
                                ₹{Number(section.totalAmount || 0).toLocaleString('en-IN')}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="font-bold text-blue-600">
                                ₹{Number(section.totalTDS || 0).toLocaleString('en-IN')}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="text-gray-700">{section.count}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* MSME Outstanding Report */}
            {selectedReport === 'msme' && msmeReport && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Users className="text-blue-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Suppliers</p>
                        <p className="text-xl font-bold text-blue-600">
                          {msmeReport.report?.totals?.totalSuppliers || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-orange-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                        <DollarSign className="text-orange-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Outstanding</p>
                        <p className="text-xl font-bold text-orange-600">
                          ₹{Number(msmeReport.report?.totals?.totalOutstanding || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-red-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                        <AlertCircle className="text-red-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Non-Compliant</p>
                        <p className="text-xl font-bold text-red-600">
                          {msmeReport.report?.totals?.nonCompliantCount || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-purple-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <DollarSign className="text-purple-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Interest</p>
                        <p className="text-xl font-bold text-purple-600">
                          ₹{Number(msmeReport.report?.totals?.totalInterest || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compliance Summary */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Compliance Summary</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="text-green-600" size={24} />
                      <div>
                        <p className="text-sm text-gray-600">Compliant</p>
                        <p className="text-xl font-bold text-green-600">
                          {msmeReport.report?.complianceSummary?.compliant || 0}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <AlertCircle className="text-red-600" size={24} />
                      <div>
                        <p className="text-sm text-gray-600">High Risk</p>
                        <p className="text-xl font-bold text-red-600">
                          {msmeReport.report?.complianceSummary?.highRisk || 0}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <AlertCircle className="text-yellow-600" size={24} />
                      <div>
                        <p className="text-sm text-gray-600">Medium Risk</p>
                        <p className="text-xl font-bold text-yellow-600">
                          {msmeReport.report?.complianceSummary?.mediumRisk || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Suppliers Table */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-4">
                    <h3 className="text-lg font-bold text-gray-800">MSME Suppliers</h3>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-3 px-4 text-gray-700 font-semibold text-sm">Supplier Name</th>
                          <th className="text-right py-3 px-4 text-gray-700 font-semibold text-sm">Total Purchase</th>
                          <th className="text-right py-3 px-4 text-gray-700 font-semibold text-sm">Outstanding</th>
                          <th className="text-right py-3 px-4 text-gray-700 font-semibold text-sm">Overdue</th>
                          <th className="text-right py-3 px-4 text-gray-700 font-semibold text-sm">Interest</th>
                          <th className="text-center py-3 px-4 text-gray-700 font-semibold text-sm">Status</th>
                          <th className="text-center py-3 px-4 text-gray-700 font-semibold text-sm">Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {msmeReport.report?.suppliers?.map((supplier, index) => (
                          <tr key={supplier.supplierId || index} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                            <td className="py-3 px-4">
                              <span className="font-medium text-gray-800">{supplier.supplierName}</span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="text-gray-700">
                                ₹{Number(supplier.totalPurchase || 0).toLocaleString('en-IN')}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="font-medium text-orange-600">
                                ₹{Number(supplier.outstanding || 0).toLocaleString('en-IN')}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="font-medium text-red-600">
                                ₹{Number(supplier.overdueAmount || 0).toLocaleString('en-IN')}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="text-purple-600">
                                ₹{Number(supplier.totalInterest || 0).toLocaleString('en-IN')}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                                supplier.complianceStatus === 'Compliant' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {supplier.complianceStatus}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                                supplier.riskLevel === 'High' 
                                  ? 'bg-red-100 text-red-700' 
                                  : supplier.riskLevel === 'Medium'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {supplier.riskLevel}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* MSME Form 1 Report */}
            {selectedReport === 'msmeForm1' && msmeForm1 && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-red-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                        <FileText className="text-red-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Overdue Bills</p>
                        <p className="text-xl font-bold text-red-600">
                          {msmeForm1.form1Annexure?.totalOverdueBills || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-orange-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                        <DollarSign className="text-orange-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Overdue Amount</p>
                        <p className="text-xl font-bold text-orange-600">
                          ₹{Number(msmeForm1.form1Annexure?.totalOverdueAmount || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-purple-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <AlertCircle className="text-purple-600" size={20} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Interest Payable</p>
                        <p className="text-xl font-bold text-purple-600">
                          ₹{Number(msmeForm1.form1Annexure?.totalInterestPayable || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bills Table */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-4">
                    <h3 className="text-lg font-bold text-gray-800">Bills Exceeding 45 Days</h3>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-3 px-4 text-gray-700 font-semibold text-sm">Supplier</th>
                          <th className="text-left py-3 px-4 text-gray-700 font-semibold text-sm">Bill Number</th>
                          <th className="text-left py-3 px-4 text-gray-700 font-semibold text-sm">Bill Date</th>
                          <th className="text-right py-3 px-4 text-gray-700 font-semibold text-sm">Bill Amount</th>
                          <th className="text-right py-3 px-4 text-gray-700 font-semibold text-sm">Outstanding</th>
                          <th className="text-right py-3 px-4 text-gray-700 font-semibold text-sm">Days Overdue</th>
                          <th className="text-right py-3 px-4 text-gray-700 font-semibold text-sm">Interest</th>
                        </tr>
                      </thead>
                      <tbody>
                        {msmeForm1.form1Annexure?.bills?.map((bill, index) => (
                          <tr key={index} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                            <td className="py-3 px-4">
                              <span className="font-medium text-gray-800">{bill.supplierName}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-gray-700">{bill.billNumber}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-gray-700">
                                {bill.billDate ? format(new Date(bill.billDate), 'dd MMM yyyy') : '-'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="text-gray-700">
                                ₹{Number(bill.billAmount || 0).toLocaleString('en-IN')}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="font-medium text-orange-600">
                                ₹{Number(bill.outstandingAmount || 0).toLocaleString('en-IN')}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="font-bold text-red-600">
                                {bill.daysOverdue} days
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="text-purple-600">
                                ₹{Number(bill.interestAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

export default StatutoryReports;
