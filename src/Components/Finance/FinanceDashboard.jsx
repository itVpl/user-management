import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { MoreHorizontal, DollarSign, TrendingUp, TrendingDown, CreditCard, Receipt, PieChart, BarChart3, Calendar, Users, FileText, CheckCircle, AlertCircle, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import UpcomingBirthdays from '../UpcomingBirthdays';

const FinanceDashboard = () => {
  const [financialData, setFinancialData] = useState({
    presentDays: 0,
    totalBilling: 0,
    pendingBilling: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    pendingInvoices: 0,
    paidInvoices: 0,
    overdueInvoices: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    cashFlow: 0,
    accountsReceivable: 0,
    accountsPayable: 0
  });
  
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [invoiceData, setInvoiceData] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [budgetData, setBudgetData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(5);

  useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        setLoading(true);
        
        // Fetch financial overview data
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        
        // Mock data for demonstration - replace with actual API calls
        const mockFinancialData = {
          presentDays: 22,
          totalBilling: 125000,
          pendingBilling: 18000,
          totalRevenue: 125000,
          totalExpenses: 85000,
          netProfit: 40000,
          pendingInvoices: 12,
          paidInvoices: 45,
          overdueInvoices: 3,
          monthlyRevenue: 15000,
          monthlyExpenses: 12000,
          cashFlow: 3000,
          accountsReceivable: 25000,
          accountsPayable: 18000
        };
        
        setFinancialData(mockFinancialData);

        // Mock recent transactions
        const mockTransactions = [
          {
            id: 1,
            type: 'revenue',
            description: 'Load Delivery - ABC Transport',
            amount: 2500,
            date: '2024-01-15',
            status: 'completed'
          },
          {
            id: 2,
            type: 'expense',
            description: 'Fuel Cost - Fleet Maintenance',
            amount: -1200,
            date: '2024-01-14',
            status: 'completed'
          },
          {
            id: 3,
            type: 'revenue',
            description: 'Freight Service - XYZ Logistics',
            amount: 3200,
            date: '2024-01-13',
            status: 'pending'
          },
          {
            id: 4,
            type: 'expense',
            description: 'Office Rent - January',
            amount: -2000,
            date: '2024-01-12',
            status: 'completed'
          },
          {
            id: 5,
            type: 'revenue',
            description: 'Container Shipping - DEF Corp',
            amount: 1800,
            date: '2024-01-11',
            status: 'completed'
          }
        ];
        
        setRecentTransactions(mockTransactions);

        // Mock invoice data
        const mockInvoices = [
          {
            id: 'INV-001',
            client: 'ABC Transport',
            amount: 2500,
            dueDate: '2024-01-20',
            status: 'pending',
            createdDate: '2024-01-15'
          },
          {
            id: 'INV-002',
            client: 'XYZ Logistics',
            amount: 3200,
            dueDate: '2024-01-18',
            status: 'overdue',
            createdDate: '2024-01-10'
          },
          {
            id: 'INV-003',
            client: 'DEF Corp',
            amount: 1800,
            dueDate: '2024-01-25',
            status: 'paid',
            createdDate: '2024-01-12'
          }
        ];
        
        setInvoiceData(mockInvoices);

        // Mock expense data
        const mockExpenses = [
          {
            id: 1,
            category: 'Fuel',
            amount: 1200,
            description: 'Fleet fuel costs',
            date: '2024-01-14',
            vendor: 'Shell Gas Station'
          },
          {
            id: 2,
            category: 'Rent',
            amount: 2000,
            description: 'Office rent for January',
            date: '2024-01-12',
            vendor: 'Property Management'
          },
          {
            id: 3,
            category: 'Maintenance',
            amount: 800,
            description: 'Vehicle maintenance',
            date: '2024-01-10',
            vendor: 'Auto Repair Shop'
          }
        ];
        
        setExpenseData(mockExpenses);

        // Mock budget data
        const mockBudget = [
          {
            category: 'Revenue',
            budgeted: 150000,
            actual: 125000,
            variance: -25000
          },
          {
            category: 'Fuel',
            budgeted: 15000,
            actual: 12000,
            variance: 3000
          },
          {
            category: 'Maintenance',
            budgeted: 10000,
            actual: 8000,
            variance: 2000
          },
          {
            category: 'Office',
            budgeted: 25000,
            actual: 20000,
            variance: 5000
          }
        ];
        
        setBudgetData(mockBudget);

      } catch (error) {
        console.error('Error fetching financial data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFinancialData();
  }, []);

  const CircularProgress = ({ percentage, size = 120, strokeWidth = 8, color = "green" }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    const colorClass = color === "green" ? "stroke-emerald-500" : color === "blue" ? "stroke-blue-500" : "stroke-red-500";

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-gray-100"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`transition-all duration-500 ease-out ${colorClass}`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-xl font-bold text-gray-800">
          {percentage}%
        </span>
      </div>
    );
  };

  const StatCard = ({ title, value, icon: Icon, color, gradient, subtitle, trend, trendValue }) => (
    <div className={`bg-gradient-to-br ${gradient} rounded-xl shadow-lg p-6 border border-white/20 backdrop-blur-sm`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center shadow-lg`}>
          <Icon className="text-white" size={24} />
        </div>
        <div className="text-right">
          <p className="text-sm text-white/80 font-medium">{subtitle}</p>
          {trend && (
            <div className={`flex items-center gap-1 mt-1 ${trend === 'up' ? 'text-green-200' : 'text-red-200'}`}>
              {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              <span className="text-xs">{trendValue}</span>
            </div>
          )}
        </div>
      </div>
      <div className="text-3xl font-bold text-white mb-2">
        {title === 'Present Days' ? 
          `${value || 0}` :
          typeof value === 'number' && value >= 1000 ? 
            `$${(value / 1000).toFixed(1)}K` : 
            `$${value?.toLocaleString() || 0}`
        }
      </div>
      <p className="text-white/90 font-medium">{title}</p>
    </div>
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(amount || 0);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'paid':
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'overdue':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'paid':
        return 'Paid';
      case 'pending':
        return 'Pending';
      case 'overdue':
        return 'Overdue';
      case 'completed':
        return 'Completed';
      default:
        return status || 'Unknown';
    }
  };

  // Pagination logic
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = recentTransactions.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(recentTransactions.length / recordsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const Pagination = () => {
    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex items-center justify-center gap-2 mt-4">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            currentPage === 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
          }`}
        >
          Previous
        </button>
        
        {pageNumbers.map((number) => (
          <button
            key={number}
            onClick={() => handlePageChange(number)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              currentPage === number
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {number}
          </button>
        ))}
        
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            currentPage === totalPages
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
          }`}
        >
          Next
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Finance Dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 min-h-screen">

      {/* Top Stats Cards */}
      <div className="grid lg:grid-cols-3 md:grid-cols-1 gap-6 mb-8">
        <StatCard
          title="Present Days"
          value={financialData.presentDays}
          icon={Calendar}
          color="bg-gradient-to-r from-blue-500 to-blue-600"
          gradient="from-blue-500 to-blue-600"
          subtitle="Working Days"
          trend="up"
          trendValue="+2"
        />
        <StatCard
          title="Total Billing"
          value={financialData.totalBilling}
          icon={DollarSign}
          color="bg-gradient-to-r from-emerald-500 to-emerald-600"
          gradient="from-emerald-500 to-emerald-600"
          subtitle="This Month"
          trend="up"
          trendValue="+12%"
        />
        <StatCard
          title="Pending Billing"
          value={financialData.pendingBilling}
          icon={Receipt}
          color="bg-gradient-to-r from-orange-500 to-orange-600"
          gradient="from-orange-500 to-orange-600"
          subtitle="Awaiting Payment"
          trend="down"
          trendValue="-5%"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        {/* Upcoming Birthdays */}
        <div className="lg:col-span-1">
          <UpcomingBirthdays limit={3} />
        </div>
        
        {/* Placeholder for additional content */}
        <div className="lg:col-span-2">
          {/* Additional finance content can go here */}
        </div>
      </div>

      {/* Billing Table */}
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Receipt className="text-white" size={20} />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Billing Details</h3>
          </div>
          <MoreHorizontal className="text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" size={20} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-4 px-4 text-blue-600 font-semibold">Invoice ID</th>
                <th className="text-left py-4 px-4 text-blue-600 font-semibold">Client</th>
                <th className="text-left py-4 px-4 text-blue-600 font-semibold">Amount</th>
                <th className="text-left py-4 px-4 text-blue-600 font-semibold">Due Date</th>
                <th className="text-left py-4 px-4 text-blue-600 font-semibold">Status</th>
                <th className="text-left py-4 px-4 text-blue-600 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {invoiceData.map((invoice, index) => (
                <tr key={invoice.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}`}>
                  <td className="py-4 px-4 text-gray-800 font-medium">{invoice.id}</td>
                  <td className="py-4 px-4 text-gray-800">{invoice.client}</td>
                  <td className="py-4 px-4 text-gray-800 font-medium">{formatCurrency(invoice.amount)}</td>
                  <td className="py-4 px-4 text-gray-800 text-sm">
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoice.status)}`}>
                      {getStatusText(invoice.status)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-gray-800 text-sm">
                    {new Date(invoice.createdDate).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboard;
