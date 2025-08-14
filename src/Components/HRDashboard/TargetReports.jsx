import React, { useState, useEffect } from 'react';
import { Users, Clock, Target, CheckCircle, XCircle, Calendar, TrendingUp, BarChart3, Phone, Truck, RefreshCw } from 'lucide-react';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

export default function TargetReports() {
  const API_BASE_URL = 'https://vpl-liveproject-1.onrender.com';
  const [activeTab, setActiveTab] = useState('sales');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState(null);
  const [cmtData, setCmtData] = useState(null);

  // Check if user is logged in
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  
  if (!token) {
    return (
      <div className="p-6 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Authentication Required</h3>
          <p className="text-red-600 mb-4">Please login to access the target reports.</p>
          <button 
            onClick={() => window.location.href = '/login'} 
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Fetch Sales Report
  const fetchSalesReport = async (date) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/inhouseUser/sales/report?date=${date}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setSalesData(data.data);
      } else {
        alertify.error(data.message || 'Failed to fetch sales report');
      }
    } catch (error) {
      console.error('Error fetching sales report:', error);
      alertify.error('Failed to fetch sales report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch CMT Report
  const fetchCMTReport = async (date) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/inhouseUser/cmt/report?date=${date}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setCmtData(data.data);
      } else {
        alertify.error(data.message || 'Failed to fetch CMT report');
      }
    } catch (error) {
      console.error('Error fetching CMT report:', error);
      alertify.error('Failed to fetch CMT report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data based on active tab
  const fetchReport = async () => {
    if (activeTab === 'sales') {
      await fetchSalesReport(selectedDate);
    } else {
      await fetchCMTReport(selectedDate);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab, selectedDate]);

  // Get current data based on active tab
  const currentData = activeTab === 'sales' ? salesData : cmtData;

  // Helper function to get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'incomplete': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Helper function to get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} />;
      case 'incomplete': return <XCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
            <BarChart3 className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Target Reports</h1>
            <p className="text-gray-600">Monitor daily targets and performance</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="text-gray-500" size={18} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('sales')}
            className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
              activeTab === 'sales'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Phone size={18} />
              Sales Department
            </div>
          </button>
          <button
            onClick={() => setActiveTab('cmt')}
            className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
              activeTab === 'cmt'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Truck size={18} />
              CMT Department
            </div>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading {activeTab === 'sales' ? 'Sales' : 'CMT'} report...</p>
          </div>
        </div>
      ) : currentData ? (
        <>


          {/* Targets Summary */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Targets Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="text-blue-600" size={20} />
                  <h4 className="font-semibold text-blue-800">Talk Time Target</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Required:</span>
                    <span className="font-medium">{currentData.summary.targets.talkTime.required}h</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Achieved:</span>
                    <span className="font-medium">{currentData.summary.targets.talkTime.total.toFixed(1)}h</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Average:</span>
                    <span className="font-medium">{currentData.summary.targets.talkTime.avg.toFixed(1)}h</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  {activeTab === 'sales' ? (
                    <Target className="text-green-600" size={20} />
                  ) : (
                    <Truck className="text-green-600" size={20} />
                  )}
                  <h4 className="font-semibold text-green-800">
                    {activeTab === 'sales' ? 'Delivery Orders' : 'Truckers'} Target
                  </h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Required:</span>
                    <span className="font-medium">
                      {activeTab === 'sales' 
                        ? currentData.summary.targets.deliveryOrders.required
                        : currentData.summary.targets.truckers.required
                      }
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Achieved:</span>
                    <span className="font-medium">
                      {activeTab === 'sales' 
                        ? currentData.summary.targets.deliveryOrders.total
                        : currentData.summary.targets.truckers.total
                      }
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Average:</span>
                    <span className="font-medium">
                      {activeTab === 'sales' 
                        ? currentData.summary.targets.deliveryOrders.avg
                        : currentData.summary.targets.truckers.avg.toFixed(1)
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Employees Table */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Employee Performance</h3>
              <p className="text-gray-600 text-sm">Detailed breakdown for {currentData.date}</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-6 text-gray-700 font-semibold">Employee</th>
                    <th className="text-left py-3 px-6 text-gray-700 font-semibold">Designation</th>
                    <th className="text-left py-3 px-6 text-gray-700 font-semibold">Talk Time</th>
                    <th className="text-left py-3 px-6 text-gray-700 font-semibold">
                      {activeTab === 'sales' ? 'Orders' : 'Truckers'}
                    </th>
                    <th className="text-left py-3 px-6 text-gray-700 font-semibold">Status</th>
                    <th className="text-left py-3 px-6 text-gray-700 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.employees.map((employee, index) => (
                    <tr key={employee.empId} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="py-4 px-6">
                        <div>
                          <div className="font-medium text-gray-800">{employee.employeeName}</div>
                          <div className="text-sm text-gray-500">ID: {employee.empId}</div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-gray-700">{employee.designation}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <div className="font-medium text-gray-800">{employee.talkTime.formatted}</div>
                          <div className="text-xs text-gray-500">
                            {employee.targets.talkTime.current.toFixed(1)}/{employee.targets.talkTime.required}h
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <div className="font-medium text-gray-800">
                            {activeTab === 'sales' ? employee.deliveryOrdersCount : employee.truckerCount}
                          </div>
                          <div className="text-xs text-gray-500">
                            {activeTab === 'sales' 
                              ? `${employee.targets.deliveryOrders.current}/${employee.targets.deliveryOrders.required}`
                              : `${employee.targets.truckers.current}/${employee.targets.truckers.required}`
                            }
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(employee.status)}`}>
                          {getStatusIcon(employee.status)}
                          {employee.status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-600 max-w-xs">
                          {employee.statusMessage}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No data available for the selected date</p>
          <p className="text-gray-400 text-sm">Try selecting a different date</p>
        </div>
      )}
    </div>
  );
} 