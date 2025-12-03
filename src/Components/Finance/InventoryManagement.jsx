import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, ChevronDown, ChevronRight, FileText, DollarSign, Receipt, ArrowLeftRight, CreditCard, ShoppingCart, Wallet, Calendar, TrendingUp, AlertCircle, Scale, Building } from 'lucide-react';
import LedgerManagement from './LedgerManagement.jsx';
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

export default function InventoryManagement() {
  const [activeSection, setActiveSection] = useState('ledger');
  const [isVoucherDropdownOpen, setIsVoucherDropdownOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

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

    // Render voucher components
    switch (activeSection) {
      case 'payment':
        return <PaymentVoucher selectedCompanyId={selectedCompanyId} />;
      case 'contra':
        return <ContraVoucher selectedCompanyId={selectedCompanyId} />;
      case 'receipt':
        return <ReceiptVoucher selectedCompanyId={selectedCompanyId} />;
      case 'journal':
        return <JournalVoucher selectedCompanyId={selectedCompanyId} />;
      case 'debit':
        return <DebitNoteVoucher selectedCompanyId={selectedCompanyId} />;
      case 'credit':
        return <CreditNoteVoucher selectedCompanyId={selectedCompanyId} />;
      case 'sale':
        return <SalesVoucher selectedCompanyId={selectedCompanyId} />;
      case 'purchase':
        return <PurchaseVoucher selectedCompanyId={selectedCompanyId} />;
      default:
        return <LedgerManagement selectedCompanyId={selectedCompanyId} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 shadow-lg flex-shrink-0">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600">
          <h2 className="text-xl font-bold text-white">Inventory</h2>
        </div>

        {/* Company Dropdown */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Select Company</label>
          {loadingCompanies ? (
            <div className="flex items-center justify-center py-2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
            </div>
          ) : (
            <select
              value={selectedCompanyId || ''}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
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
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
