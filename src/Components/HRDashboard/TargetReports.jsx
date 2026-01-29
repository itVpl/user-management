import React, { useState, useEffect } from 'react';
import { Users, Clock, Target, CheckCircle, XCircle, Calendar, TrendingUp, BarChart3, Phone, Truck, RefreshCw, Paperclip, Eye, X } from 'lucide-react';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import API_CONFIG from '../../config/api.js';


export default function TargetReports() {
  const API_BASE_URL = `${API_CONFIG.BASE_URL}`;
  const [activeTab, setActiveTab] = useState('sales');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState(null);
  const [cmtData, setCmtData] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null); // For modal


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
        <div className="flex flex-col justify-center items-center h-96 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-purple-600 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-xl font-semibold text-gray-800 mb-2">Loading {activeTab === 'sales' ? 'Sales' : 'CMT'} Report...</p>
            <p className="text-sm text-gray-600">Please wait while we fetch the information</p>
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
                    <span className="font-medium">{currentData.summary.targets.talkTime.total.toFixed(2)}h</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Average:</span>
                    <span className="font-medium">{currentData.summary.targets.talkTime.avg.toFixed(2)}h</span>
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
                        ? (typeof currentData.summary.targets.deliveryOrders.avg === 'number' ? currentData.summary.targets.deliveryOrders.avg.toFixed(2) : currentData.summary.targets.deliveryOrders.avg)
                        : currentData.summary.targets.truckers.avg.toFixed(2)
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
                    <th className="text-left py-3 px-6 text-gray-700 font-semibold">Reason & Attachments</th>
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
                            {employee.targets.talkTime.current.toFixed(2)}/{employee.targets.talkTime.required}h
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
                      <td className="py-4 px-6">
                        {(employee.reason || (employee.attachments && Array.isArray(employee.attachments) && employee.attachments.length > 0)) ? (
                          <button
                            onClick={() => setSelectedEmployee({ ...employee })}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-colors text-sm font-medium"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
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

      {/* Reason & Attachments Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" aria-modal="true" role="dialog" style={{ zIndex: 9999 }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedEmployee(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ zIndex: 10000 }}>
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-purple-500 text-white p-6 rounded-t-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold">Reason & Attachments</h3>
                  <p className="text-blue-100 text-sm mt-1">
                    {selectedEmployee.employeeName} ({selectedEmployee.empId})
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="text-white hover:text-gray-200 transition-colors p-1"
                  aria-label="Close modal"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Reason Section */}
              {selectedEmployee?.reason && String(selectedEmployee.reason).trim().length > 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                      <Target className="w-4 h-4 text-amber-700" />
                    </div>
                    <h4 className="text-lg font-semibold text-amber-900">Reason</h4>
                  </div>
                  <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-wrap break-words">
                    {String(selectedEmployee.reason)}
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center">
                  <Target className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No reason provided</p>
                </div>
              )}

              {/* Attachments Section */}
              {selectedEmployee?.attachments && Array.isArray(selectedEmployee.attachments) && selectedEmployee.attachments.length > 0 ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Paperclip className="w-4 h-4 text-blue-700" />
                    </div>
                    <h4 className="text-lg font-semibold text-blue-900">
                      Attachments ({selectedEmployee.attachmentCount || selectedEmployee.attachments.length})
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {selectedEmployee.attachments.map((att, idx) => (
                      <a
                        key={att._id || idx}
                        href={att.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-4 bg-white border border-blue-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Paperclip className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate group-hover:text-blue-700">
                              {att.fileName || `Attachment ${idx + 1}`}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              {att.fileSize && (
                                <span className="text-xs text-gray-500">
                                  {(att.fileSize / 1024).toFixed(2)} KB
                                </span>
                              )}
                              {att.uploadedAt && (
                                <span className="text-xs text-gray-500">
                                  Uploaded: {new Date(att.uploadedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center">
                  <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No attachments uploaded</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 rounded-b-2xl flex justify-end">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

