  import React, { useState,useEffect } from 'react';
  import axios from 'axios';
  // import { Search, Bell, Calendar, Target, Truck, ClipboardList, BarChart3, Users, FileText, MessageCircle, LogOut, MoreHorizontal, CheckCircle, Laptop, Eye } from 'lucide-react';

  const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [attendanceData, setAttendanceData] = useState(null);
    const [presentDaysCount, setPresentDaysCount] = useState(0);
    const [callStats, setCallStats] = useState({
      total: 0,
      answered: 0,
      noAnswer: 0,
      totalDuration: 0,
      averageDuration: 0,
      emails: 0,
      conversionRate: 0,
    });

useEffect(() => {
  const fetchMonthlyPresentCount = async () => {
    try {
      const response = await axios.get(
        'https://vpl-liveproject-1.onrender.com/api/v1/attendance/my/present-count-current-month',
        { withCredentials: true }
      );
      const totalPresent = response.data.attendance?.totalPresentDays || 0;
      setPresentDaysCount(totalPresent);
    } catch (err) {
      console.error("Failed to fetch present count", err);
    }
  };

  fetchMonthlyPresentCount();
}, []);

  useEffect(() => {
      const fetchCallRecords = async () => {
        const alias = sessionStorage.getItem('alias');
        if (!alias) return;

        const today = new Date();
        const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7).toISOString();
        const to = today.toISOString();

        try {
          const response = await axios.get(
            'https://vpl-liveproject-1.onrender.com/api/v1/analytics/8x8/call-records/filter',
            {
              params: { callerName: alias, calleeName: alias, from, to },
              withCredentials: true,
            }
          );

          const records = response.data || [];

          const total = records.length;
          const answered = records.filter(r => r.disposition === 'ANSWERED').length;
          const noAnswer = total - answered;
          const totalDuration = records.reduce((sum, r) => sum + (r.duration || 0), 0);
          const averageDuration = total ? (totalDuration / total).toFixed(2) : 0;

          setCallStats({
            total,
            answered,
            noAnswer,
            totalDuration,
            averageDuration,
            emails: 4, // placeholder
            conversionRate: ((answered / total) * 100).toFixed(2) || 0,
          });
        } catch (err) {
          console.error('Failed to fetch call records:', err);
        }
      };

      fetchCallRecords();
    }, []);



    const loadData = [
      { shipperId: 'CNU1234567', loadId: 'L00331', weight: '300 Lbs', vehicle: 'Flatbed' },
      { shipperId: 'CNU1234567', loadId: 'L00331', weight: '300 Lbs', vehicle: 'Flatbed' },
      { shipperId: 'CNU1234567', loadId: 'L00331', weight: '300 Lbs', vehicle: 'Flatbed' },
      { shipperId: 'CNU1234567', loadId: 'L00331', weight: '300 Lbs', vehicle: 'Flatbed' },
      { shipperId: 'CNU1234567', loadId: 'L00331', weight: '300 Lbs', vehicle: 'Flatbed' },
      { shipperId: 'CNU1234567', loadId: 'L00331', weight: '300 Lbs', vehicle: 'Flatbed' },
      { shipperId: 'CNU1234567', loadId: 'L00331', weight: '300 Lbs', vehicle: 'Flatbed' },
      { shipperId: 'CNU1234567', loadId: 'L00331', weight: '300 Lbs', vehicle: 'Flatbed' },
    ];

    const shipperDocs = [
      { id: 'CNU1234567', status: 'Uploaded', statusColor: 'bg-green-500' },
      { id: 'CNU1234567', status: 'Uploaded', statusColor: 'bg-green-500' },
      { id: 'CNU1234568', status: 'Pending', statusColor: 'bg-yellow-500' },
      { id: 'CNU1232558', status: 'Uploaded', statusColor: 'bg-green-500' },
      { id: 'CNU1239996', status: 'Uploaded', statusColor: 'bg-green-500' },
    ];

    const billingData = [
      { invoice: 'INV-1123', shipper: 'J.Traders', date: '10-Jun-2025', amount: '$25,000' },
      { invoice: 'INV-1153', shipper: 'J.Traders', date: '10-Jun-2025', amount: '$34,000' },
      { invoice: 'INV-4568', shipper: 'J.Traders', date: '10-Jun-2025', amount: '$5,000' },
      { invoice: 'INV-7896', shipper: 'J.Traders', date: '10-Jun-2025', amount: '$14,000' },
      { invoice: 'INV-8523', shipper: 'J.Traders', date: '10-Jun-2025', amount: '$55,000' },
    ];

    return (
      <div className="min-h-screen bg-gray-50 flex">

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">

          {/* Dashboard Content */}
          <div className="p-6 overflow-y-auto h-full">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
  <div className="text-2xl font-bold text-gray-900">
    {presentDaysCount}
  </div>
  <div className="text-sm text-gray-600 mt-1">
    Present in {new Date().toLocaleString('default', { month: 'long' })}
  </div>
                  </div>
                  {/* <Calendar className="text-blue-600" size={32} /> */}
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">100</div>
                    <div className="text-sm text-gray-600 mt-1">Daily Targets</div>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    {/* <CheckCircle className="text-green-600" size={24} /> */}
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">45%</div>
                    <div className="text-sm text-gray-600 mt-1">Personal Hygiene</div>
                  </div>
                  {/* <Laptop className="text-blue-600" size={32} /> */}
                </div>
              </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              {/* Calling Reports */}
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Calling Reports</h3>
                  {/* <MoreHorizontal className="text-gray-400 cursor-pointer" size={20} /> */}
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Calls</span>
                    <span className="font-medium">{callStats.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Answered Calls</span>
                    <span className="font-medium">{callStats.answered}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">No answered Calls</span>
                    <span className="font-medium">{callStats.noAnswer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Call Durations</span>
                    <span className="font-medium">{callStats.averageDuration} sec</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Call Durations</span>
                    <span className="font-medium">{(callStats.totalDuration / 60).toFixed(2)} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Conversion Rate</span>
                    <span className="font-medium">{callStats.conversionRate}%</span>
                  </div>
                </div>
              </div>

              {/* Shippers Load Data */}
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Shippers Load Data</h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">Shipper ID</th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">Load ID</th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">Weight</th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">Vehicle</th>
                      </tr>
                    </thead>
                    <tbody className="space-y-2">
                      {loadData.slice(0, 6).map((item, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-2 text-sm">{item.shipperId}</td>
                          <td className="py-2 text-sm">{item.loadId}</td>
                          <td className="py-2 text-sm">{item.weight}</td>
                          <td className="py-2 text-sm">{item.vehicle}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-4 text-center">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    View all
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              {/* Revenue Stats */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="font-semibold text-gray-900 mb-4">Revenue Statics</h3>
                
                <div className="flex items-center justify-center mb-4">
                  <div className="relative w-40 h-40">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8"/>
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#3b82f6" strokeWidth="8"
                              strokeDasharray="175" strokeDashoffset="45" transform="rotate(-90 50 50)"/>
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#ef4444" strokeWidth="8"
                              strokeDasharray="25" strokeDashoffset="0" transform="rotate(130 50 50)"/>
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#22c55e" strokeWidth="8"
                              strokeDasharray="30" strokeDashoffset="0" transform="rotate(155 50 50)"/>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">68.2%</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-center space-x-4 text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-600 rounded-full mr-1"></div>
                    <span>68.2%</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                    <span>9.8%</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                    <span>10%</span>
                  </div>
                </div>
                
                <div className="mt-4 text-center">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    View all
                  </button>
                </div>
              </div>

              {/* Shippers Docs */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="font-semibold text-gray-900 mb-4">Shippers Docs</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Shipper ID</span>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</span>
                  </div>
                  
                  {shipperDocs.map((doc, index) => (
                    <div key={index} className="flex justify-between items-center py-1">
                      <span className="text-sm text-gray-600">{doc.id}</span>
                      <span className={`px-2 py-1 rounded text-xs text-white ${doc.statusColor}`}>
                        {doc.status}
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 text-center">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    View all
                  </button>
                </div>
              </div>
            </div>

            {/* Billings Table */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold text-gray-900 mb-4">Billings</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Invoice No.</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Shipper</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Date</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingData.map((bill, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-3 text-sm text-gray-900">{bill.invoice}</td>
                        <td className="py-3 text-sm text-gray-900">{bill.shipper}</td>
                        <td className="py-3 text-sm text-gray-900">{bill.date}</td>
                        <td className="py-3 text-sm text-gray-900 font-medium">{bill.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 text-center">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  View all
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  export default Dashboard;