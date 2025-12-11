import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import API_CONFIG from '../../config/api.js';
import { TrendingUp, FileText, TrendingDown, Calendar } from 'lucide-react';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import Loader from '../common/Loader.jsx';
import { DateRange } from 'react-date-range';
import { format } from 'date-fns';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

const ProfitandLoss = ({ selectedCompanyId, globalRange, onNavigateSection }) => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [receiptsTotal, setReceiptsTotal] = useState(0);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [purchasesTotal, setPurchasesTotal] = useState(0);
  const [range, setRange] = useState(() => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const fyStartYear = currentMonth < 3 ? currentYear - 1 : currentYear;
    return {
      startDate: new Date(fyStartYear, 3, 1),
      endDate: new Date(fyStartYear + 1, 2, 31),
      key: 'selection'
    };
  });
  const [showCustomRange, setShowCustomRange] = useState(false);

  const getAuthToken = () => {
    return (
      sessionStorage.getItem('token') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('authToken') ||
      localStorage.getItem('authToken')
    );
  };

  useEffect(() => {
    if (globalRange && globalRange.startDate && globalRange.endDate) {
      setRange({ startDate: new Date(globalRange.startDate), endDate: new Date(globalRange.endDate), key: 'selection' });
    }
  }, [globalRange]);

  const fetchSummary = async () => {
    if (!selectedCompanyId) {
      setSummary(null);
      return;
    }
    try {
      setLoading(true);
      const token = getAuthToken();
      const fromDate = format(range.startDate, 'yyyy-MM-dd');
      const toDate = format(range.endDate, 'yyyy-MM-dd');
      const params = new URLSearchParams({
        startDate: fromDate,
        endDate: toDate
      });
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/tally/financial-reports/company/${selectedCompanyId}/sales-expenses-profit?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const data = res.data?.data || res.data;
      const summaryData = data?.summary || data || null;
      setSummary(summaryData || {});
      setReceiptsTotal(
        Number(
          data?.receipts?.totalReceipts ??
          summaryData?.totalReceipts ??
          data?.receiptsTotal ??
          0
        )
      );
      setPaymentsTotal(
        Number(
          data?.payments?.totalPayments ??
          summaryData?.totalPayments ??
          data?.paymentsTotal ??
          0
        )
      );
      setPurchasesTotal(
        Number(
          data?.expenses?.purchases?.totalPurchases ??
          summaryData?.expenses?.purchases?.totalPurchases ??
          summaryData?.totalPurchases ??
          summaryData?.purchasesTotal ??
          0
        )
      );
    } catch (error) {
      console.error('Error fetching Profit & Loss:', error);
      alertify.error(error.response?.data?.message || 'Failed to load Profit & Loss');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId, range]);

  const totals = useMemo(() => {
    const salesIncome = Number((summary && (summary.totalSales ?? summary.totalIncome)) || 0);
    const income = salesIncome;
    const payments = Number(paymentsTotal || 0);
    const purchases = Number(purchasesTotal || 0);
    const totalExpenses = Number(summary?.expenses?.totalExpenses ?? summary?.totalExpenses ?? 0);
    const expenses = Math.max(0, totalExpenses - (purchases || 0));
    const receiptIncome = Number(receiptsTotal || 0);
    const diff = receiptIncome - payments;
    return { income, payments, purchases, expenses, diff };
  }, [summary, receiptsTotal, paymentsTotal, purchasesTotal]);

  return (
    <div className="p-6 relative">
      {loading && (
        <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm flex items-center justify-center">
          <Loader variant="inline" message="Loading Profit & Loss..." />
        </div>
      )}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Profit and Loss</h2>
          <p className="text-gray-600">Current financial year overview</p>
        </div>
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
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCustomRange(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      )}

      {!summary ? (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-20 text-center">
          <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Data Available</h3>
          <p className="text-gray-500">No Profit & Loss data available for the selected company</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-green-200 cursor-pointer" onClick={() => onNavigateSection && onNavigateSection('sale')}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="text-green-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Income</p>
                  <p className="text-2xl font-bold text-green-700">
                    ₹{totals.income.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-blue-200 cursor-pointer" onClick={() => onNavigateSection && onNavigateSection('receipt')}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FileText className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Received Income</p>
                  <p className="text-2xl font-bold text-blue-700">
                    ₹{Number(receiptsTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-orange-200 cursor-pointer" onClick={() => onNavigateSection && onNavigateSection('payment')}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <FileText className="text-orange-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payments</p>
                  <p className="text-2xl font-bold text-orange-700">
                    ₹{totals.payments.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>


            

            <div className="bg-white rounded-2xl shadow-xl p-4 border-2 border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  {totals.diff >= 0 ? (
                    <TrendingUp className="text-green-600" size={20} />
                  ) : (
                    <TrendingDown className="text-red-600" size={20} />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600">{totals.diff >= 0 ? 'Profit' : 'Loss'}</p>
                  <p className={`text-2xl font-bold ${totals.diff >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    ₹{Math.abs(totals.diff).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl shadow-xl border-2 border-green-200 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                  <TrendingUp className="text-green-600" size={20} />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Assets (Income)</h3>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-2">Total</p>
                <p className="text-xl font-bold text-green-700">
                  ₹{totals.income.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border-2 border-orange-200 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                  <FileText className="text-orange-600" size={20} />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Payments</h3>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-2">Total</p>
                <p className="text-xl font-bold text-orange-700">
                  ₹{totals.payments.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border-2 border-pink-200 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                  <FileText className="text-pink-600" size={20} />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Purchases</h3>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-2">Total</p>
                <p className="text-xl font-bold text-pink-700">
                  ₹{Number(totals.purchases || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border-2 border-yellow-200 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                  <FileText className="text-yellow-600" size={20} />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Expenses</h3>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-2">Total</p>
                <p className="text-xl font-bold text-yellow-700">
                  ₹{Number(totals.expenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfitandLoss;
