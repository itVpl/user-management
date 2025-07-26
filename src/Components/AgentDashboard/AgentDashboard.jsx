import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MoreHorizontal, Phone, Users, Calendar, FileText, Clock, CheckCircle, AlertCircle, TrendingUp, Award, Truck, DollarSign, Target } from 'lucide-react';

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

  const [cmtData, setCmtData] = useState({
    todayStats: {
      totalAdded: 0,
      approved: 0,
      pending: 0,
      rejected: 0
    },
    todayTruckers: []
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
      // Get user object from sessionStorage and extract aliasName
      const userStr = sessionStorage.getItem('user');
      if (!userStr) {
        console.log('No user found in sessionStorage');
        return;
      }
      
      const user = JSON.parse(userStr);
      const alias = user.aliasName;
      
      if (!alias) {
        console.log('No aliasName found in user object');
        return;
      }
      
      console.log('Using alias:', alias);

      // Get today's date range in local timezone (not UTC)
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      // Format dates as YYYY-MM-DD HH:mm:ss (local time)
      const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };
      
      const from = formatDate(startOfDay);
      const to = formatDate(endOfDay);
      
      console.log('Date range:', { from, to });

      try {
        const response = await axios.get(
          'https://vpl-liveproject-1.onrender.com/api/v1/analytics/8x8/call-records/filter',
          {
            params: { callerName: alias, calleeName: alias, from, to },
            withCredentials: true,
          }
        );

        console.log('API Response:', response.data);
        
        // Check if response.data is an array, if not, try to get the correct property
        let records = [];
        if (Array.isArray(response.data)) {
          records = response.data;
        } else if (response.data && Array.isArray(response.data.records)) {
          records = response.data.records;
        } else if (response.data && Array.isArray(response.data.data)) {
          records = response.data.data;
        } else {
          console.log('No records found in response:', response.data);
          records = [];
        }

        const total = records.length;
        const answered = records.filter(r => r.answered === 'Answered').length;
        const missed = records.filter(r => r.answered === 'No Answer' || r.answered === 'Busy' || r.answered === 'Failed').length;
        const totalDuration = records.reduce((sum, r) => sum + (r.talkTimeMS || 0), 0);
        const averageDuration = total ? (totalDuration / total).toFixed(2) : 0;

        setCallStats({
          total,
          answered,
          noAnswer: missed, // Changed to missed for clarity
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

  useEffect(() => {
    const fetchCmtData = async () => {
      try {
        const response = await axios.get(
          'https://vpl-liveproject-1.onrender.com/api/v1/shipper_driver/cmt/today-count',
          { withCredentials: true }
        );
        
        if (response.data.success) {
          setCmtData({
            todayStats: response.data.todayStats,
            todayTruckers: response.data.todayTruckers || []
          });
        }
      } catch (err) {
        console.error("Failed to fetch CMT data", err);
      }
    };

    fetchCmtData();
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
    { id: 'CNU1234567', status: 'Uploaded', statusColor: 'bg-gradient-to-r from-green-400 to-green-600' },
    { id: 'CNU1234567', status: 'Uploaded', statusColor: 'bg-gradient-to-r from-green-400 to-green-600' },
    { id: 'CNU1234568', status: 'Pending', statusColor: 'bg-gradient-to-r from-yellow-400 to-yellow-600' },
    { id: 'CNU1232558', status: 'Uploaded', statusColor: 'bg-gradient-to-r from-green-400 to-green-600' },
    { id: 'CNU1239996', status: 'Uploaded', statusColor: 'bg-gradient-to-r from-green-400 to-green-600' },
  ];

  const billingData = [
    { invoice: 'INV-1123', shipper: 'J.Traders', date: '10-Jun-2025', amount: '$25,000' },
    { invoice: 'INV-1153', shipper: 'J.Traders', date: '10-Jun-2025', amount: '$34,000' },
    { invoice: 'INV-4568', shipper: 'J.Traders', date: '10-Jun-2025', amount: '$5,000' },
    { invoice: 'INV-7896', shipper: 'J.Traders', date: '10-Jun-2025', amount: '$14,000' },
    { invoice: 'INV-8523', shipper: 'J.Traders', date: '10-Jun-2025', amount: '$55,000' },
  ];

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

  const StatCard = ({ title, value, icon: Icon, color, gradient, subtitle }) => (
    <div className={`bg-gradient-to-br ${gradient} rounded-xl shadow-lg p-6 border border-white/20 backdrop-blur-sm`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center shadow-lg`}>
          <Icon className="text-white" size={24} />
        </div>
        <div className="text-right">
          <p className="text-sm text-white/80 font-medium">{subtitle}</p>
        </div>
      </div>
      <div className="text-3xl font-bold text-white mb-2">{value || 0}</div>
      <p className="text-white/90 font-medium">{title}</p>
    </div>
  );

  // Add department variable at the top
  const department = 'CMT'; 

  // Format today's truckers data for display
  const recentCarriers = cmtData.todayTruckers.map(trucker => ({
    carrierId: trucker.mc_dot_no,
    name: trucker.compName,
    mc: trucker.mc_dot_no,
    phone: trucker.phoneNo,
    email: trucker.email,
    status: trucker.status,
    addedAt: new Date(trucker.addedAt).toLocaleDateString()
  }));

  // Add sample carrierDocs data above the return
  const carrierDocs = [
    { id: 'CR-1001', name: 'Transpo Logistics', status: 'Uploaded', statusColor: 'bg-gradient-to-r from-green-400 to-green-600' },
    { id: 'CR-1002', name: 'FastMove Carriers', status: 'Pending', statusColor: 'bg-gradient-to-r from-yellow-400 to-yellow-600' },
    { id: 'CR-1003', name: 'RoadRunner Freight', status: 'Uploaded', statusColor: 'bg-gradient-to-r from-green-400 to-green-600' },
  ];

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 min-h-screen">
      {department === 'CMT' ? (
        // --- CMT Dashboard (current layout) ---
        <>
          {/* Top Stats Cards */}
          <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 mb-8">
            <StatCard
              title="Present Days"
              value={presentDaysCount}
              icon={Calendar}
              color="bg-gradient-to-r from-blue-500 to-blue-600"
              gradient="from-blue-500 to-blue-600"
              subtitle="This Month"
            />
            <StatCard
              title="Today's Carriers"
              value={cmtData.todayStats.totalAdded}
              icon={Target}
              color="bg-gradient-to-r from-emerald-500 to-emerald-600"
              gradient="from-emerald-500 to-emerald-600"
              subtitle="Added Today"
            />
            <StatCard
              title="Total Calls"
              value={callStats.total}
              icon={Phone}
              color="bg-gradient-to-r from-orange-500 to-orange-600"
              gradient="from-orange-500 to-orange-600"
              subtitle="Today"
            />
            <StatCard
              title="Approved Carriers"
              value={cmtData.todayStats.approved}
              icon={Award}
              color="bg-gradient-to-r from-purple-500 to-purple-600"
              gradient="from-purple-500 to-purple-600"
              subtitle="Today"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-8 mb-8">
            {/* Call Performance Overview */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <Phone className="text-white" size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Call Performance</h3>
                </div>
                <MoreHorizontal className="text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" size={20} />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    <span className="text-gray-700 font-medium">Answered Calls</span>
                  </div>
                  <span className="font-bold text-emerald-600">{callStats.answered}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-gray-700 font-medium">Missed Calls</span>
                  </div>
                  <span className="font-bold text-red-600">{callStats.noAnswer}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-700 font-medium">Total Calls Today</span>
                  </div>
                  <span className="font-bold text-blue-600">{callStats.total}</span>
                </div>
              </div>
            </div>

            {/* Call Duration Stats */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                    <Clock className="text-white" size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Daily Call Target</h3>
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  Target: 1.5 Hours
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    <span className="text-gray-600">Today's Total</span>
                    <span className="font-bold text-emerald-600">{((callStats.totalDuration / 1000) / 60).toFixed(2)}m</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-600">Target Remaining</span>
                    <span className="font-bold text-blue-600">
                      {Math.max(0, (90 - (callStats.totalDuration / 1000 / 60))).toFixed(2)}m
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="text-gray-600">Average per Call</span>
                    <span className="font-bold text-purple-600">
                      {callStats.total > 0 ? ((callStats.totalDuration / 1000) / callStats.total / 60).toFixed(2) : 0}m
                    </span>
                  </div>
                </div>
                <div className="ml-6">
                  <CircularProgress 
                    percentage={Math.min(100, Math.round(((callStats.totalDuration / 1000) / 60 / 90) * 100)) || 0} 
                    color={((callStats.totalDuration / 1000) / 60 / 90) >= 1 ? "green" : "blue"}
                  />
                  <div className="text-center mt-2">
                    <p className="text-xs text-gray-600">Target Progress</p>
                    <p className="text-sm font-bold text-gray-800">
                      {Math.round(((callStats.totalDuration / 1000) / 60 / 90) * 100)}% Complete
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Carrier (instead of Recent Loads) */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                    <Truck className="text-white" size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Recent Carrier</h3>
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  {recentCarriers.length} carriers today
                </div>
              </div>
              <div className="relative">
                <div className="max-h-80 overflow-y-auto scrollbar-hide">
                  <div className="space-y-3 pr-2">
                    {recentCarriers.map((carrier, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-100 hover:shadow-sm transition-all duration-200">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {carrier.carrierId.slice(-2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 text-sm truncate">{carrier.name}</p>
                          <p className="text-xs text-gray-600">MC: {carrier.mc}</p>
                        </div>
                      </div>
                    ))}
                    {recentCarriers.length === 0 && (
                      <div className="text-center py-6">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Truck className="w-6 h-6 text-gray-400" size={20} />
                        </div>
                        <p className="text-gray-500 text-sm">No recent carriers</p>
                        <p className="text-gray-400 text-xs">Carrier data will appear here</p>
                      </div>
                    )}
                  </div>
                </div>
                {recentCarriers.length > 3 && (
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                )}
              </div>
            </div>
          </div>

          {/* Shippers Load Data Table */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <Truck className="text-white" size={20} />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Load Data</h3>
              </div>
              <MoreHorizontal className="text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" size={20} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 text-blue-600 font-semibold">Shipper ID</th>
                    <th className="text-left py-4 px-4 text-blue-600 font-semibold">Load ID</th>
                    <th className="text-left py-4 px-4 text-blue-600 font-semibold">Weight</th>
                    <th className="text-left py-4 px-4 text-blue-600 font-semibold">Vehicle</th>
                  </tr>
                </thead>
                <tbody>
                  {loadData.slice(0, 6).map((item, index) => (
                    <tr key={index} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}`}>
                      <td className="py-4 px-4 text-gray-800 font-medium">{item.shipperId}</td>
                      <td className="py-4 px-4 text-gray-800">{item.loadId}</td>
                      <td className="py-4 px-4 text-gray-800">{item.weight}</td>
                      <td className="py-4 px-4 text-gray-800">{item.vehicle}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Showing {Math.min(loadData.length, 6)} of {loadData.length} load records
              </div>
              <button className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium shadow-lg">
                View All Loads
              </button>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Carriers Documents (instead of Shippers Documents) */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                    <FileText className="text-white" size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Carriers Documents</h3>
                </div>
              </div>
              <div className="space-y-4">
                {carrierDocs.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {doc.id.slice(-2)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{doc.name}</p>
                        <p className="text-sm text-gray-600">Carrier ID: {doc.id}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${doc.statusColor} shadow-sm`}>
                      {doc.status}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center">
                <button className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 font-medium shadow-lg">
                  View All Documents
                </button>
              </div>
            </div>

            {/* Revenue Statistics */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                    <DollarSign className="text-white" size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Revenue Statistics</h3>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="mb-6">
                  <CircularProgress 
                    percentage={68.2} 
                    size={120} 
                    color="blue" 
                  />
                </div>
                <div className="text-center">
                  <h4 className="text-2xl font-bold text-gray-800 mb-2">Total Revenue</h4>
                  <p className="text-gray-600 mb-6">Current month performance</p>
                </div>
                <div className="flex justify-center space-x-6 text-sm mb-6">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mr-2"></div>
                    <span className="font-medium">68.2%</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-gradient-to-r from-red-500 to-red-600 rounded-full mr-2"></div>
                    <span className="font-medium">9.8%</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-green-600 rounded-full mr-2"></div>
                    <span className="font-medium">10%</span>
                  </div>
                </div>
                <button className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-3 rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 font-medium shadow-lg">
                  View Revenue Details
                </button>
              </div>
            </div>
          </div>

          {/* Billing Table */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mt-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <DollarSign className="text-white" size={20} />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Billing Overview</h3>
              </div>
              <MoreHorizontal className="text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" size={20} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 text-blue-600 font-semibold">Invoice No.</th>
                    <th className="text-left py-4 px-4 text-blue-600 font-semibold">Shipper</th>
                    <th className="text-left py-4 px-4 text-blue-600 font-semibold">Date</th>
                    <th className="text-left py-4 px-4 text-blue-600 font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {billingData.map((bill, index) => (
                    <tr key={index} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}`}>
                      <td className="py-4 px-4 text-gray-800 font-medium">{bill.invoice}</td>
                      <td className="py-4 px-4 text-gray-800">{bill.shipper}</td>
                      <td className="py-4 px-4 text-gray-800">{bill.date}</td>
                      <td className="py-4 px-4 text-gray-800 font-bold text-green-600">{bill.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Showing {billingData.length} billing records
              </div>
              <button className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg">
                View All Billings
              </button>
            </div>
          </div>
        </>
      ) : department === 'Sales' ? (
        // --- Sales Dashboard ---
        <>
          {/* Top Stats Cards for Sales */}
          <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 mb-8">
            <StatCard
              title="Leads Generated"
              value={120}
              icon={Users}
              color="bg-gradient-to-r from-blue-500 to-blue-600"
              gradient="from-blue-500 to-blue-600"
              subtitle="This Month"
            />
            <StatCard
              title="Deals Closed"
              value={32}
              icon={CheckCircle}
              color="bg-gradient-to-r from-green-500 to-green-600"
              gradient="from-green-500 to-green-600"
              subtitle="This Month"
            />
            <StatCard
              title="Revenue"
              value="$85,000"
              icon={DollarSign}
              color="bg-gradient-to-r from-orange-500 to-orange-600"
              gradient="from-orange-500 to-orange-600"
              subtitle="This Month"
            />
            <StatCard
              title="Calls Made"
              value={callStats.total}
              icon={Phone}
              color="bg-gradient-to-r from-purple-500 to-purple-600"
              gradient="from-purple-500 to-purple-600"
              subtitle="This Week"
            />
          </div>
          {/* Sales Table: Deals Overview */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <CheckCircle className="text-white" size={20} />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Deals Overview</h3>
              </div>
              <MoreHorizontal className="text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" size={20} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 text-blue-600 font-semibold">Deal ID</th>
                    <th className="text-left py-4 px-4 text-blue-600 font-semibold">Client</th>
                    <th className="text-left py-4 px-4 text-blue-600 font-semibold">Value</th>
                    <th className="text-left py-4 px-4 text-blue-600 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Example data, replace with real data as needed */}
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors bg-gray-50/50">
                    <td className="py-4 px-4 text-gray-800 font-medium">DL-1001</td>
                    <td className="py-4 px-4 text-gray-800">Acme Corp</td>
                    <td className="py-4 px-4 text-gray-800">$15,000</td>
                    <td className="py-4 px-4 text-green-600 font-bold">Closed</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors bg-white">
                    <td className="py-4 px-4 text-gray-800 font-medium">DL-1002</td>
                    <td className="py-4 px-4 text-gray-800">Beta Ltd</td>
                    <td className="py-4 px-4 text-gray-800">$22,000</td>
                    <td className="py-4 px-4 text-yellow-600 font-bold">Negotiation</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors bg-gray-50/50">
                    <td className="py-4 px-4 text-gray-800 font-medium">DL-1003</td>
                    <td className="py-4 px-4 text-gray-800">Gamma Inc</td>
                    <td className="py-4 px-4 text-gray-800">$48,000</td>
                    <td className="py-4 px-4 text-red-600 font-bold">Lost</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Showing 3 deals
              </div>
              <button className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium shadow-lg">
                View All Deals
              </button>
            </div>
          </div>
          {/* Sales Table: Leads Overview */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <Users className="text-white" size={20} />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Leads Overview</h3>
              </div>
              <MoreHorizontal className="text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" size={20} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 text-blue-600 font-semibold">Lead ID</th>
                    <th className="text-left py-4 px-4 text-blue-600 font-semibold">Contact</th>
                    <th className="text-left py-4 px-4 text-blue-600 font-semibold">Company</th>
                    <th className="text-left py-4 px-4 text-blue-600 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Example data, replace with real data as needed */}
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors bg-gray-50/50">
                    <td className="py-4 px-4 text-gray-800 font-medium">LD-2001</td>
                    <td className="py-4 px-4 text-gray-800">John Doe</td>
                    <td className="py-4 px-4 text-gray-800">Acme Corp</td>
                    <td className="py-4 px-4 text-green-600 font-bold">Contacted</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors bg-white">
                    <td className="py-4 px-4 text-gray-800 font-medium">LD-2002</td>
                    <td className="py-4 px-4 text-gray-800">Jane Smith</td>
                    <td className="py-4 px-4 text-gray-800">Beta Ltd</td>
                    <td className="py-4 px-4 text-yellow-600 font-bold">New</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors bg-gray-50/50">
                    <td className="py-4 px-4 text-gray-800 font-medium">LD-2003</td>
                    <td className="py-4 px-4 text-gray-800">Sam Wilson</td>
                    <td className="py-4 px-4 text-gray-800">Gamma Inc</td>
                    <td className="py-4 px-4 text-red-600 font-bold">Unresponsive</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Showing 3 leads
              </div>
              <button className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 font-medium shadow-lg">
                View All Leads
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default Dashboard;