import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MoreHorizontal, Phone, Users, Calendar, FileText, Clock, CheckCircle, AlertCircle, TrendingUp, Award, Truck, DollarSign, Target } from 'lucide-react';
import UpcomingBirthdays from '../UpcomingBirthdays';
import DailyFollowNotification from '../DailyFollowNotification';
import API_CONFIG from '../../config/api';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [attendanceData, setAttendanceData] = useState(null);
  const [presentDaysCount, setPresentDaysCount] = useState(0);
   const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  

  // Add formatSeconds function
  const formatSeconds = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };
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

  const [doData, setDoData] = useState({
    todayStats: {
      totalAdded: 0,
      approved: 0,
      pending: 0,
      rejected: 0
    },
    todayDOs: []
  });

  const [pendingLoads, setPendingLoads] = useState([]);

  const totalTalkMS = Number(callStats.totalDuration || 0);
  const totalTalkSecondsRaw = totalTalkMS / 1000;
  const totalTalkSeconds = Math.floor(totalTalkSecondsRaw);
  const totalTalkMinutes = totalTalkMS / 60000;
  const averageCallMinutes = callStats.total > 0 ? totalTalkMinutes / callStats.total : 0;

  const CMT_TARGET_MINUTES = 90;
  const cmtTargetRemainingMinutes = Math.max(CMT_TARGET_MINUTES - totalTalkMinutes, 0);
  const cmtTargetProgress = CMT_TARGET_MINUTES > 0
    ? Math.min(100, Math.round((totalTalkMinutes / CMT_TARGET_MINUTES) * 100))
    : 0;
  const cmtTargetColor = cmtTargetProgress >= 100 ? "green" : "blue";

  const SALES_TARGET_SECONDS = 3 * 60 * 60;
  const salesTargetRemainingSeconds = Math.max(SALES_TARGET_SECONDS - totalTalkSeconds, 0);
  const salesTargetProgress = SALES_TARGET_SECONDS > 0
    ? Math.min(100, Math.round((totalTalkSecondsRaw / SALES_TARGET_SECONDS) * 100))
    : 0;
  const salesTargetColor = salesTargetProgress >= 100 ? "green" : "blue";

  useEffect(() => {
    const fetchMonthlyPresentCount = async () => {
      try {
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        const response = await axios.get(
          `${API_CONFIG.BASE_URL}/api/v1/attendance/my/present-count-current-month`,
          { 
            withCredentials: true,
            headers: { Authorization: `Bearer ${token}` }
          }
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

        return;
      }
      
      const user = JSON.parse(userStr);
      const alias = user.aliasName;
      
      if (!alias) {

        return;
      }

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

      try {
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        const response = await axios.get(
          `${API_CONFIG.BASE_URL}/api/v1/analytics/8x8/call-records/filter`,
          {
            params: { callerName: alias, calleeName: alias, from, to },
            withCredentials: true,
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        // Check if response.data is an array, if not, try to get the correct property
        let records = [];
        if (Array.isArray(response.data)) {
          records = response.data;
        } else if (response.data && Array.isArray(response.data.records)) {
          records = response.data.records;
        } else if (response.data && Array.isArray(response.data.data)) {
          records = response.data.data;
        } else {

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
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        const response = await axios.get(
          `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/cmt/today-count`,
          { 
            withCredentials: true,
            headers: { Authorization: `Bearer ${token}` }
          }
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

  useEffect(() => {
    const fetchDoData = async () => {
      try {
        // Get user data to extract empId
        const userStr = sessionStorage.getItem('user');
        if (!userStr) {

          return;
        }
        
        const user = JSON.parse(userStr);
        const empId = user.empId;
        
        if (!empId) {

          return;
        }

        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        const response = await axios.get(
          `${API_CONFIG.BASE_URL}/api/v1/do/do/employee/${empId}`,
          { 
            withCredentials: true,
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        if (response.data.success) {
          // Filter today's DOs - check createdAt or date field
          const today = new Date().toISOString().split('T')[0];
          const todayDOs = response.data.data.filter(deliveryOrder => {
            // Check multiple possible date fields
            const orderDate = deliveryOrder.date || 
                            deliveryOrder.createdAt || 
                            deliveryOrder.createdDate ||
                            deliveryOrder.assignedToCMT?.assignedAt;
            
            if (!orderDate) return true; // If no date, include it
            
            try {
              const dateStr = new Date(orderDate).toISOString().split('T')[0];
              return dateStr === today;
            } catch {
              return true; // If date parsing fails, include it
            }
          });

          // Calculate stats based on status field
          const totalAdded = todayDOs.length;
          const approved = todayDOs.filter(deliveryOrder => deliveryOrder.status === 'approved' || deliveryOrder.status === 'open').length;
          const pending = todayDOs.filter(deliveryOrder => deliveryOrder.status === 'pending').length;
          const rejected = todayDOs.filter(deliveryOrder => deliveryOrder.status === 'rejected').length;

          setDoData({
            todayStats: {
              totalAdded,
              approved,
              pending,
              rejected
            },
            todayDOs: todayDOs.slice(0, 10) // Show first 10 recent DOs for better scrolling
          });
        }
      } catch (err) {
        console.error("Failed to fetch DO data", err);
      }
    };

    fetchDoData();
  }, []);

  useEffect(() => {
    const fetchPendingLoads = async () => {
      try {
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        const response = await axios.get(
          `${API_CONFIG.BASE_URL}/api/v1/load-approval/pending`,
          { 
            withCredentials: true,
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        if (response.data.success) {
          setPendingLoads(response.data.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch pending loads", err);
      }
    };

    fetchPendingLoads();
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

  // Get department from user data
  const userData = sessionStorage.getItem("user") || localStorage.getItem("user");
  const user = userData ? JSON.parse(userData) : {};
  const department = user?.department || 'CMT';

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

  const data = [
    { id: 'EMP101', name: 'Rahul Sharma', orders: 15, status: 'Completed' },
    { id: 'EMP102', name: 'Anjali Verma', orders: 8, status: 'Pending' },
    { id: 'EMP103', name: 'Mohit Kumar', orders: 0, status: 'Not Started' },
    { id: 'EMP104', name: 'Neha Singh', orders: 21, status: 'Completed' },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'text-green-600';
      case 'Pending':
        return 'text-yellow-500';
      case 'Not Started':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const filteredData = data.filter((row) => {
    return (
      row.name.toLowerCase().includes(search.toLowerCase()) ||
      row.id.toLowerCase().includes(search.toLowerCase())
    );
  });
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
                  Target: {(CMT_TARGET_MINUTES / 60).toFixed(1)} Hours
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    <span className="text-gray-600">Today's Total</span>
                    <span className="font-bold text-emerald-600">{totalTalkMinutes.toFixed(2)}m</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-600">Target Remaining</span>
                    <span className="font-bold text-blue-600">
                      {cmtTargetRemainingMinutes.toFixed(2)}m
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="text-gray-600">Average per Call</span>
                    <span className="font-bold text-purple-600">
                      {averageCallMinutes.toFixed(2)}m
                    </span>
                  </div>
                </div>
                <div className="ml-6">
                  <CircularProgress 
                    percentage={cmtTargetProgress}
                    color={cmtTargetColor}
                  />
                  {/* <div className="text-center mt-2">
                    <p className="text-xs text-gray-600">Target Progress</p>
                    <p className="text-sm font-bold text-gray-800">
                      {Math.round(((callStats.totalDuration / 1000) / 60 / 90) * 100)}% Complete
                    </p>
                  </div> */}
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

          {/* Upcoming Birthdays */}
          <div className="mb-8">
            <UpcomingBirthdays limit={3}  />
          </div>

                     {/* Pending Load Table */}
           <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100">
             <div className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                   <Truck className="text-white" size={20} />
                 </div>
                 <h3 className="text-xl font-bold text-gray-800">Pending Load</h3>
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
                    {pendingLoads.length > 0 ? (
                      pendingLoads.slice(0, 6).map((load, index) => (
                        <tr key={index} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}`}>
                          <td className="py-4 px-4 text-gray-800 font-medium">{load.shipperId || 'N/A'}</td>
                          <td className="py-4 px-4 text-gray-800">{load.loadId || 'N/A'}</td>
                          <td className="py-4 px-4 text-gray-800">{load.weight || 'N/A'}</td>
                          <td className="py-4 px-4 text-gray-800">{load.vehicle || 'N/A'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-b border-gray-100">
                        <td colSpan="4" className="py-8 px-4 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <Truck className="w-8 h-8 text-gray-300 mb-2" />
                            <p>No pending loads available</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
               </table>
             </div>
                           <div className="mt-6">
                <div className="text-sm text-gray-600">
                  Showing {Math.min(pendingLoads.length, 6)} of {pendingLoads.length} pending load records
                </div>
              </div>
           </div>
        </>
      ) : department === 'Sales' ? (
        // --- Sales Dashboard (Same design as CMT) ---
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
              title="Total DO"
              value={doData.todayStats.totalAdded}
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
              title="Today’s DO"
              value={doData.todayStats.approved}
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
                  Target: {(SALES_TARGET_SECONDS / 3600).toFixed(1)} Hours
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    <span className="text-gray-600">Today's Total</span>
                    <span className="font-bold text-emerald-600">{formatSeconds(totalTalkSeconds)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-600">Target Remaining</span>
                    <span className="font-bold text-blue-600">
                      {formatSeconds(salesTargetRemainingSeconds)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="text-gray-600">Average per Call</span>
                    <span className="font-bold text-purple-600">
                      {averageCallMinutes.toFixed(2)}m
                    </span>
                  </div>
                </div>
                <div className="ml-6">
                  <CircularProgress 
                    percentage={salesTargetProgress}
                    color={salesTargetColor}
                  />
                  {/* <div className="text-center mt-2">
                    <p className="text-xs text-gray-600">Target Progress</p>
                    <p className="text-sm font-bold text-gray-800">
                      {Math.round((callStats.totalDuration / 10800) * 100)}% Complete
                    </p>
                  </div> */}
                </div>
              </div>
            </div>
            

            {/* Recent DO (instead of Recent Carrier) */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                    <Truck className="text-white" size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Recent DO</h3>
                </div>
                <div className="text-sm text-gray-500 font-medium">
                  {doData.todayDOs.length} DO today
                </div>
              </div>
              <div className="relative">
                <div className="max-h-64 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  <div className="space-y-2 pr-2">
                    {doData.todayDOs.map((deliveryOrder, index) => {
                      // Extract data from API response structure (new format)
                      const loadNo = deliveryOrder.loadNo || 'N/A';
                      const billTo = deliveryOrder.billTo || 'N/A';
                      const shipperName = deliveryOrder.shipper?.compName || 'N/A';
                      
                      return (
                        <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-100 hover:shadow-sm transition-all duration-200">
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {loadNo !== 'N/A' ? loadNo.slice(-2) : (deliveryOrder._id || '').slice(-2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 text-sm truncate">{loadNo}</p>
                            <p className="text-xs text-gray-600">{billTo}</p>
                          </div>
                        </div>
                      );
                    })}
                    {doData.todayDOs.length === 0 && (
                      <div className="text-center py-6">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Truck className="w-6 h-6 text-gray-400" size={20} />
                        </div>
                        <p className="text-gray-500 text-sm">No recent DO</p>
                        <p className="text-gray-400 text-xs">DO data will appear here</p>
                      </div>
                    )}
                  </div>
                </div>
                {doData.todayDOs.length > 3 && (
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                )}
              </div>
            </div>
          </div>

          {/* Upcoming Birthdays and Daily Follow Notification */}
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            <UpcomingBirthdays limit={3} />
            <DailyFollowNotification limit={3} />
          </div>

          {/* DO Data Table */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <Truck className="text-white" size={20} />
                </div>
                <h3 className="text-xl font-bold text-gray-800">DO Data</h3>
              </div>
              {/* <button className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium shadow-lg">
                Create New DO
              </button> */}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 text-blue-600 font-semibold">Load No</th>
                    <th className="text-left py-4 px-4 text-blue-600 font-semibold">Bill To</th>
                    <th className="text-left py-4 px-4 text-blue-600 font-semibold">Shipper Name</th>
                    <th className="text-left py-4 px-4 text-blue-600 font-semibold">Carrier Name</th>
                    <th className="text-left py-4 px-4 text-blue-600 font-semibold">Carrier Fees</th>
                  </tr>
                </thead>
                <tbody>
                  {doData.todayDOs.length > 0 ? (
                    doData.todayDOs.map((deliveryOrder, index) => {
                      // Extract data from API response structure (new format)
                      const loadNo = deliveryOrder.loadNo || 'N/A';
                      const billTo = deliveryOrder.billTo || 'N/A';
                      const shipperName = deliveryOrder.shipper?.compName || 'N/A';
                      const carrierName = deliveryOrder.carrier?.compName || 'N/A';
                      
                      // Calculate total carrier fees from lineHaul, fsc, and other charges
                      const lineHaul = Number(deliveryOrder.lineHaul) || 0;
                      const fsc = Number(deliveryOrder.fsc) || 0;
                      const otherTotal = Array.isArray(deliveryOrder.other) 
                        ? deliveryOrder.other.reduce((sum, item) => sum + (Number(item.total) || 0), 0)
                        : 0;
                      const carrierFees = lineHaul + fsc + otherTotal;
                      
                      return (
                        <tr key={index} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}`}>
                          <td className="py-4 px-4 text-gray-800 font-medium">{loadNo}</td>
                          <td className="py-4 px-4 text-gray-800">{billTo}</td>
                          <td className="py-4 px-4 text-gray-800">{shipperName}</td>
                          <td className="py-4 px-4 text-gray-800">{carrierName}</td>
                          <td className="py-4 px-4 text-gray-800 font-bold text-green-600">${carrierFees.toLocaleString()}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr className="border-b border-gray-100">
                      <td colSpan="5" className="py-8 px-4 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <Truck className="w-8 h-8 text-gray-300 mb-2" />
                          <p>No DO data available for today</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
           
           {/* Team DO Records */}
          {/* <div className="bg-white rounded-2xl shadow-md p-6">
      
      <div className="flex flex-row md:flex-row md:items-center md:justify-between gap-4 mb-6">
       
        <div className="flex items-center gap-3">
          <div className="bg-green-500 p-2 rounded-lg shadow-sm text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none"
              viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 17v-2h6v2h5v-6.586a1 1 0 00-.293-.707l-3.414-3.414A1 1 0 0015.586 6H15V5a1 1 0 00-1-1H5a1 1 0 00-1 1v12h5zm0 0v2a2 2 0 104 0v-2m4-7l3 3" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Team DO Records</h2>
        </div>

       
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Search by Name or ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

     
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 rounded-md overflow-hidden text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="px-5 py-3 text-left font-medium text-blue-600">Emp ID</th>
              <th className="px-5 py-3 text-left font-medium text-blue-600">Name</th>
              <th className="px-5 py-3 text-left font-medium text-blue-600">Total Delivery Orders</th>
              <th className="px-5 py-3 text-left font-medium text-blue-600">Status</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {filteredData.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50 border-t border-gray-100">
                <td className="px-5 py-3 font-medium">{row.id}</td>
                <td className="px-5 py-3">{row.name}</td>
                <td className="px-5 py-3">{row.orders}</td>
                <td className={`px-5 py-3 font-semibold ${getStatusColor(row.status)}`}>{row.status}</td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center px-5 py-6 text-gray-400 italic">
                  No matching records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div> */}


        </>
      ) : null}
    </div>
  );
};

export default Dashboard;