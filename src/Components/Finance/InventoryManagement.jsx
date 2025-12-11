import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, ChevronDown, ChevronRight, FileText, DollarSign, Receipt, ArrowLeftRight, CreditCard, ShoppingCart, Wallet, Calendar, TrendingUp, AlertCircle, Scale, Building, ChartBar, Search } from 'lucide-react';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import LedgerManagement from './LedgerManagement.jsx';
import LedgerEntries from './LedgerEntries.jsx';
import PaymentVoucher from './Vouchers/PaymentVoucher.jsx';
import ContraVoucher from './Vouchers/ContraVoucher.jsx';
import ReceiptVoucher from './ReceiptVoucher.jsx';
import JournalVoucher from './Vouchers/JournalVoucher.jsx';
import DebitNoteVoucher from './Vouchers/DebitNoteVoucher.jsx';
import CreditNoteVoucher from './Vouchers/CreditNoteVoucher.jsx';
import SalesVoucher from './Vouchers/SalesVoucher.jsx';
import PurchaseVoucher from './Vouchers/PurchaseVoucher.jsx';
import Daybook from './Daybook.jsx';
import AccountSummary from './AccountSummary.jsx';
import StatutoryReports from './StatutoryReports.jsx';
import BalanceSheet from './BalanceSheet.jsx';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import Loader from '../common/Loader.jsx';
import ProfitandLoss from './ProfitandLoss.jsx';

export default function InventoryManagement() {
  const [activeSection, setActiveSection] = useState('ledger');
  const [isVoucherDropdownOpen, setIsVoucherDropdownOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [globalRange, setGlobalRange] = useState(null);

  const selectedCompany = companies.find(c => (c._id || c.id) === selectedCompanyId);

  const pageTitles = {
    ledger: 'Ledger',
    daybook: 'Daybook',
    accountSummary: 'Account Summary',
    statutoryReports: 'Statutory Reports',
    balanceSheet: 'Balance Sheet',
    ledgerEntries: 'Ledger Entries',
    payment: 'Payment Voucher',
    contra: 'Contra Voucher',
    receipt: 'Receipt Voucher',
    journal: 'Journal Voucher',
    debit: 'Debit Note',
    credit: 'Credit Note',
    sale: 'Sales Voucher',
    purchase: 'Purchase Voucher',
    profitandloss: 'Profit and Loss'
  };

  // Voucher types for dropdown
  const voucherTypes = [
    { id: 'payment', label: 'Payment', icon: DollarSign },
    { id: 'contra', label: 'Contra', icon: FileText },
    { id: 'receipt', label: 'Receipt', icon: Receipt },
    { id: 'journal', label: 'Journal', icon: BookOpen },
    { id: 'debit', label: 'Debit Note', icon: ArrowLeftRight },
    { id: 'credit', label: 'Credit Note', icon: CreditCard },
    { id: 'sale', label: 'Sales', icon: ShoppingCart },
    { id: 'purchase', label: 'Purchase', icon: Wallet },
  ];

  // Get Auth Token
  const getAuthToken = () => {
    return sessionStorage.getItem("token") || localStorage.getItem("token") || 
           sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
  };

  // Fetch Companies
  const fetchCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const token = getAuthToken();
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/tally/company/all?isActive=true&page=1&limit=100&sortBy=companyName&sortOrder=asc`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const companiesList = response.data?.companies || response.data?.data || [];
      setCompanies(companiesList);
      
      // Set default company
      const defaultCompany = companiesList.find(c => c.isDefault) || companiesList[0];
      if (defaultCompany) {
        const id = defaultCompany._id || defaultCompany.id;
        setSelectedCompanyId(id);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      alertify.error(error.response?.data?.message || 'Failed to load companies');
    } finally {
      setLoadingCompanies(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const renderContent = () => {
    if (!selectedCompanyId) {
      return (
        <div className="flex justify-center items-center h-full">
          <div className="text-center">
            <Building className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Company Selected</h3>
            <p className="text-gray-500">Please select a company from the sidebar</p>
          </div>
        </div>
      );
    }

    if (activeSection === 'ledger') {
      return <LedgerManagement selectedCompanyId={selectedCompanyId} />;
    }

    if (activeSection === 'daybook') {
      return <Daybook selectedCompanyId={selectedCompanyId} />;
    }

    if (activeSection === 'accountSummary') {
      return <AccountSummary selectedCompanyId={selectedCompanyId} />;
    }

    if (activeSection === 'statutoryReports') {
      return <StatutoryReports selectedCompanyId={selectedCompanyId} />;
    }

  if (activeSection === 'balanceSheet') {
    return <BalanceSheet selectedCompanyId={selectedCompanyId} />;
  }

  if (activeSection === 'profitandloss') {
    return <ProfitandLoss selectedCompanyId={selectedCompanyId} onNavigateSection={(id) => setActiveSection(id)} />;
  }

  if (activeSection === 'ledgerEntries') {
    return <LedgerEntries selectedCompanyId={selectedCompanyId} />;
  }

    // Render voucher components
    switch (activeSection) {
      case 'payment':
        return <PaymentVoucher selectedCompanyId={selectedCompanyId} globalRange={globalRange} />;
      case 'contra':
        return <ContraVoucher selectedCompanyId={selectedCompanyId} globalRange={globalRange} />;
      case 'receipt':
        return <ReceiptVoucher selectedCompanyId={selectedCompanyId} globalRange={globalRange} />;
      case 'journal':
        return <JournalVoucher selectedCompanyId={selectedCompanyId} globalRange={globalRange} />;
      case 'debit':
        return <DebitNoteVoucher selectedCompanyId={selectedCompanyId} globalRange={globalRange} />;
      case 'credit':
        return <CreditNoteVoucher selectedCompanyId={selectedCompanyId} globalRange={globalRange} />;
      case 'sale':
        return <SalesVoucher selectedCompanyId={selectedCompanyId} globalRange={globalRange} />;
      case 'purchase':
        return <PurchaseVoucher selectedCompanyId={selectedCompanyId} globalRange={globalRange} />;
      default:
        return <LedgerManagement selectedCompanyId={selectedCompanyId} />;
    }
  };

  const primarySections = [
    { id: 'ledger', label: 'Ledger', icon: BookOpen },
    { id: 'daybook', label: 'Daybook', icon: Calendar },
    { id: 'accountSummary', label: 'Account Summary', icon: TrendingUp },
    { id: 'statutoryReports', label: 'Statutory Reports', icon: AlertCircle },
    { id: 'balanceSheet', label: 'Balance Sheet', icon: Scale },
    { id: 'ledgerEntries', label: 'Ledger Entries', icon: FileText },
    { id: 'profitandloss', label: 'Profit and Loss', icon: ChartBar }
  ];

  const allActions = [
    ...primarySections,
    ...voucherTypes
  ];

  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
        setCommandQuery('');
        setHighlightIndex(0);
        return;
      }
      if (showCommandPalette) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowCommandPalette(false);
          setCommandQuery('');
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlightIndex((i) => i + 1);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightIndex((i) => Math.max(i - 1, 0));
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          const filtered = allActions.filter(a => a.label.toLowerCase().includes(commandQuery.toLowerCase()));
          const item = filtered[Math.min(highlightIndex, Math.max(filtered.length - 1, 0))];
          if (item) {
            setActiveSection(item.id);
            setIsVoucherDropdownOpen(false);
            setShowCommandPalette(false);
            setCommandQuery('');
            setHighlightIndex(0);
          }
          return;
        }
      }
      if (e.altKey && e.key === 'F2') {
        e.preventDefault();
        setShowPeriodModal(true);
        return;
      }
      if (e.key === 'F4') {
        e.preventDefault();
        setActiveSection('contra');
        setIsVoucherDropdownOpen(false);
        return;
      }
      if (e.key === 'F5') {
        e.preventDefault();
        setActiveSection('payment');
        setIsVoucherDropdownOpen(false);
        return;
      }
      if (e.key === 'F6') {
        e.preventDefault();
        setActiveSection('receipt');
        setIsVoucherDropdownOpen(false);
        return;
      }
      if (e.key === 'F7') {
        e.preventDefault();
        setActiveSection('journal');
        setIsVoucherDropdownOpen(false);
        return;
      }
      if (e.key === 'F8') {
        e.preventDefault();
        setActiveSection('sale');
        setIsVoucherDropdownOpen(false);
        return;
      }
      if (e.key === 'F9') {
        e.preventDefault();
        setActiveSection('purchase');
        setIsVoucherDropdownOpen(false);
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setActiveSection('ledger');
        setIsVoucherDropdownOpen(false);
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setActiveSection('daybook');
        setIsVoucherDropdownOpen(false);
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setActiveSection('accountSummary');
        setIsVoucherDropdownOpen(false);
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setActiveSection('balanceSheet');
        setIsVoucherDropdownOpen(false);
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setActiveSection('profitandloss');
        setIsVoucherDropdownOpen(false);
        return;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showCommandPalette, commandQuery, highlightIndex]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 shadow-lg flex-shrink-0">
        {/* <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="flex items-center gap-3">
            <Building className="text-white" size={24} />
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight truncate">
              {selectedCompanyId ? (selectedCompany?.companyName || selectedCompany?.name || 'Company') : 'Inventory'}
            </h2>
          </div>
        </div> */}

        {/* Company Dropdown */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Select Company</label>
          {loadingCompanies ? (
            <div className="flex items-center justify-center py-2">
              <Loader variant="inline" />
            </div>
          ) : (
            <select
              value={selectedCompanyId || ''}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${selectedCompanyId ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-white'}`}
            >
              <option value="">Select Company</option>
              {companies.map((company) => (
                <option key={company._id || company.id} value={company._id || company.id}>
                  {company.companyName || company.name || 'Unknown'}
                </option>
              ))}
            </select>
          )}
        </div>
        
        <nav className="p-4 space-y-2">
          {/* Ledger Option */}
          <button
            onClick={() => {
              setActiveSection('ledger');
              setIsVoucherDropdownOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              activeSection === 'ledger'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105'
                : 'text-gray-700 hover:bg-gray-100 hover:shadow-md'
            }`}
          >
            <BookOpen size={20} />
            <span className="font-medium">Ledger</span>
          </button>

          {/* Voucher Dropdown */}
          <div>
            <button
              onClick={() => setIsVoucherDropdownOpen(!isVoucherDropdownOpen)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                voucherTypes.some(v => v.id === activeSection)
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-gray-100 hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText size={20} />
                <span className="font-medium">Voucher</span>
              </div>
              {isVoucherDropdownOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>

            {/* Dropdown Items */}
            {isVoucherDropdownOpen && (
              <div className="mt-2 ml-4 space-y-1">
                {voucherTypes.map((voucher) => {
                  const Icon = voucher.icon;
                  return (
                    <button
                      key={voucher.id}
                      onClick={() => setActiveSection(voucher.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 text-sm ${
                        activeSection === voucher.id
                          ? 'bg-blue-100 text-blue-700 font-semibold'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon size={16} />
                      <span>{voucher.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Daybook Option */}
          <button
            onClick={() => {
              setActiveSection('daybook');
              setIsVoucherDropdownOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              activeSection === 'daybook'
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg transform scale-105'
                : 'text-gray-700 hover:bg-gray-100 hover:shadow-md'
            }`}
          >
            <Calendar size={20} />
            <span className="font-medium">Daybook</span>
          </button>

          {/* Account Summary Option */}
          <button
            onClick={() => {
              setActiveSection('accountSummary');
              setIsVoucherDropdownOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              activeSection === 'accountSummary'
                ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg transform scale-105'
                : 'text-gray-700 hover:bg-gray-100 hover:shadow-md'
            }`}
          >
            <TrendingUp size={20} />
            <span className="font-medium">Account Summary</span>
          </button>

          {/* Statutory Reports Option */}
        <button
            onClick={() => {
              setActiveSection('statutoryReports');
              setIsVoucherDropdownOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              activeSection === 'statutoryReports'
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg transform scale-105'
                : 'text-gray-700 hover:bg-gray-100 hover:shadow-md'
            }`}
          >
            <AlertCircle size={20} />
            <span className="font-medium">Statutory Reports</span>
          </button> 

        
          <button
            onClick={() => {
              setActiveSection('balanceSheet');
              setIsVoucherDropdownOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              activeSection === 'balanceSheet'
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg transform scale-105'
                : 'text-gray-700 hover:bg-gray-100 hover:shadow-md'
            }`}
          >
            <Scale size={20} />
            <span className="font-medium">Balance Sheet</span>
          </button>

          {/* Profit and Loss Option */}
          <button
            onClick={() => {
              setActiveSection('profitandloss');
              setIsVoucherDropdownOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              activeSection === 'profitandloss'
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg transform scale-105'
                : 'text-gray-700 hover:bg-gray-100 hover:shadow-md'
            }`}
          >
            <ChartBar size={20} />
            <span className="font-medium">Profit and Loss</span>
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="p-2">
          <div className="mb-4 px-4 py-3 rounded-lg border border-blue-200 bg-blue-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-blue-700" />
                <span className="text-lg font-semibold text-blue-700">{pageTitles[activeSection] || 'Inventory'}</span>
              </div>
              {selectedCompanyId && (
                <div className="flex items-center gap-2 text-blue-700">
                  <Building size={18} />
                  <span className="text-sm font-medium">{selectedCompany?.companyName || selectedCompany?.name || 'Company'}</span>
                </div>
              )}
            </div>
          </div>
          {activeSection === 'daybook' && (
            <Daybook selectedCompanyId={selectedCompanyId} globalRange={globalRange} applyGlobalRange={!!globalRange} />
          )}
          {activeSection === 'accountSummary' && (
            <AccountSummary selectedCompanyId={selectedCompanyId} globalRange={globalRange} />
          )}
          {activeSection === 'profitandloss' && (
            <ProfitandLoss selectedCompanyId={selectedCompanyId} globalRange={globalRange} onNavigateSection={(id) => setActiveSection(id)} />
          )}
          {activeSection !== 'daybook' && activeSection !== 'accountSummary' && activeSection !== 'profitandloss' && renderContent()}
        </div>
        {showCommandPalette && (
          <div className="absolute inset-0 z-20 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowCommandPalette(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 px-4 pt-4">
                <Search className="text-gray-400" size={18} />
                <input
                  autoFocus
                  value={commandQuery}
                  onChange={(e) => { setCommandQuery(e.target.value); setHighlightIndex(0); }}
                  placeholder="Go to... (Ledger, Payment, Sales, etc.)"
                  className="flex-1 px-2 py-2 border-b border-gray-200 focus:outline-none"
                />
              </div>
              <div className="max-h-64 overflow-y-auto p-2">
                {allActions
                  .filter(a => a.label.toLowerCase().includes(commandQuery.toLowerCase()))
                  .map((a, idx) => {
                    const Icon = a.icon;
                    const active = idx === Math.min(highlightIndex, allActions.filter(x => x.label.toLowerCase().includes(commandQuery.toLowerCase())).length - 1);
                    return (
                      <button
                        key={`${a.id}-${idx}`}
                        onClick={() => { setActiveSection(a.id); setIsVoucherDropdownOpen(false); setShowCommandPalette(false); setCommandQuery(''); setHighlightIndex(0); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${active ? 'bg-blue-100' : 'hover:bg-gray-50'}`}
                      >
                        <Icon size={16} />
                        <span className="text-sm font-medium">{a.label}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
        {showPeriodModal && (
          <div className="absolute inset-0 z-30 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowPeriodModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold text-gray-800">Set Period (Alt+F2)</h3>
              </div>
              <div className="p-4">
                <DateRange
                  ranges={[globalRange || { startDate: new Date(), endDate: new Date(), key: 'selection' }]}
                  onChange={(item) => setGlobalRange(item.selection)}
                  moveRangeOnFirstSelection={false}
                  months={2}
                  direction="horizontal"
                />
                <div className="flex justify-end gap-2 mt-3">
                  <button type="button" onClick={() => setShowPeriodModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="button" onClick={() => setShowPeriodModal(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Apply</button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="sticky bottom-0 z-10 bg-white/80 backdrop-blur border-t border-gray-200 px-4 py-2 text-xs text-gray-600 flex flex-wrap gap-3">
          <span>Ctrl+K Search</span>
          <span>Alt+F2 Period</span>
          <span>F4 Contra</span>
          <span>F5 Payment</span>
          <span>F6 Receipt</span>
          <span>F7 Journal</span>
          <span>F8 Sales</span>
          <span>F9 Purchase</span>
          <span>Alt+L Ledger</span>
          <span>Alt+D Daybook</span>
          <span>Alt+A Account Summary</span>
          <span>Alt+B Balance Sheet</span>
          <span>Alt+P Profit & Loss</span>
        </div>
      </div>
    </div>
  );
}
