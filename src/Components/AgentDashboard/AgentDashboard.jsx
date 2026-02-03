import React, { useState, useEffect } from 'react';
import axios from 'axios';
import GroupIcon from '@mui/icons-material/Group';
import InfoOutlineSharpIcon from '@mui/icons-material/InfoOutlineSharp';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import CheckCircleOutlineSharpIcon from '@mui/icons-material/CheckCircleOutlineSharp';
import { MoreHorizontal, Phone, Users, Calendar, FileText, Clock, CheckCircle, AlertCircle, TrendingUp, Award, Truck, DollarSign, Target, UserPlus, AlertTriangle, User, Info } from 'lucide-react';
import UpcomingBirthdays from '../UpcomingBirthdays';
import { IoCall } from "react-icons/io5";
import DailyFollowNotification from '../DailyFollowNotification';
import API_CONFIG from '../../config/api';
// import firstIcon from "../../assets/Icon.svg"

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [attendanceData, setAttendanceData] = useState(null);
  const [presentDaysCount, setPresentDaysCount] = useState(0);
   const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Helper function to convert status display text
  const getStatusDisplayText = (status) => {
    if (!status) return 'Pending';
    
    switch(status.toLowerCase()) {
      case 'delivered':
      case 'completed':
        return 'Delivered';
      case 'pending':
        return 'Pending';
      case 'rejected':
      case 'cancelled':
        return 'Rejected';
      case 'approved':
        return 'Approved';
      case 'open':
        return 'Open';
      case 'in-progress':
      case 'in_progress':
        return 'In Progress';
      case 'on-hold':
      case 'on_hold':
        return 'On Hold';
      default:
        // Return the original status with proper capitalization
        return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    }
  };

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
          // Debug: Log the API response to see the actual data structure
          console.log('DO API Response:', response.data.data);
          
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

          // Debug: Log filtered data
          console.log('Today\'s DOs:', todayDOs);
          console.log('Sample DO structure:', todayDOs[0]);

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

  const StatCard = ({ title, value, icon: Icon, color, subtitle, trend, trendValue, showTitle = false, noBackground = false, iconColor = null, backgroundColor = null }) => (
    <div className="bg-white rounded-2xl p-3 border-2 border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <div className="text-left">
          <p className="text-base text-gray-500 font-medium">{subtitle}</p>
        </div>
        <div 
          className={`w-12 h-12 ${noBackground ? '' : (backgroundColor ? '' : color)} rounded-xl flex items-center justify-center`}
          style={backgroundColor ? { backgroundColor } : {}}
        >
          <Icon 
            className={noBackground ? "" : "text-white"} 
            style={noBackground ? { color: iconColor || '#8280FF' } : {}} 
            size={20} 
          />
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value?.toLocaleString() || 0}</div>
      <div className="flex items-center justify-between">
        {trend && trendValue && !showTitle ? (
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="#00B69B" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-sm font-medium">
              <span style={{ color: '#00B69B' }}>{trendValue}</span>
              <span className="text-gray-500"> Up from yesterday</span>
            </span>
          </div>
        ) : showTitle ? (
          <p className="font-medium" style={{ color: '#00B69B' }}>{title}</p>
        ) : (
          <div></div>
        )}
        <div></div>
      </div>
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
    <div className="p-6 bg-white min-h-screen">
      {department === 'CMT' ? (
        // --- CMT Dashboard (current layout) ---
        <>
          {/* Top Stats Cards */}
          <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 mb-3">
            <StatCard
              title="Present Days"
              value={presentDaysCount}
              icon={Calendar}
              color="bg-blue-500"
              subtitle="This Month"
              showTitle={true}
            />
            <StatCard
              title="Today's Carriers"
              value={cmtData.todayStats.totalAdded}
              icon={Users}
              color="bg-blue-500"
              subtitle="Added Today"
              trend="up"
              trendValue="8.5%"
              noBackground={true}
            />
            <StatCard
              title="Total Calls"
              value={callStats.total}
              icon={IoCall}
              color="bg-yellow-500"
              subtitle="Total Calls"
              trend="up"
              trendValue="8.5%"
            />
            <StatCard
              title="Approved Carriers"
              value={cmtData.todayStats.approved}
              icon={CheckCircle}
              color="bg-green-500"
              subtitle="Approved Carriers"
              trend="up"
              trendValue="8.5%"
            />
          </div>

          {/* New Section - Add your content here */}
          {/* <div className="bg-white rounded-2xl p-6 mb-3 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <FileText className="text-white" size={20} />
                </div>
                <h3 className="text-xl font-bold text-gray-800">New Section</h3>
              </div>
              <MoreHorizontal className="text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" size={20} />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-700 font-medium">Sample Item 1</span>
                </div>
                <span className="font-bold text-blue-600">100</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700 font-medium">Sample Item 2</span>
                </div>
                <span className="font-bold text-green-600">75</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-gray-700 font-medium">Sample Item 3</span>
                </div>
                <span className="font-bold text-orange-600">25</span>
              </div>
            </div>
          </div> */}

          {/* Pending Load */}
<div className="bg-white border border-[#C8C8C8] rounded-[17.59px] p-6 mb-3"
     style={{
       boxShadow: '7.54px 7.54px 67.85px 0px rgba(0, 0, 0, 0.05)',
       borderWidth: '1.31px'
     }}>
  <div className="flex items-center justify-between mb-6">
    <h3 className="text-xl font-bold text-gray-800">Pending Loads</h3>
    <button className="text-gray-500 hover:text-gray-700 text-sm font-medium px-4 py-2 border border-gray-300 rounded-lg">
      View All
    </button>
  </div>

  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-200">
          <th className="text-left py-4 px-6 text-gray-600 font-medium text-base">Shipper ID</th>
          <th className="text-left py-4 px-6 text-gray-600 font-medium text-base">Load ID</th>
          <th className="text-left py-4 px-6 text-gray-600 font-medium text-base">Weight</th>
          <th className="text-left py-4 px-6 text-gray-600 font-medium text-base">Vehicle</th>
        </tr>
      </thead>
      <tbody>
        {pendingLoads.length > 0 ? (
          pendingLoads.slice(0, 6).map((load, index) => (
            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <td className="py-4 px-6 text-gray-800 font-medium">{load.shipperId || 'N/A'}</td>
              <td className="py-4 px-6 text-gray-800">{load.loadId || 'N/A'}</td>
              <td className="py-4 px-6 text-gray-800">{load.weight || 'N/A'}</td>
              <td className="py-4 px-6 text-gray-800">{load.vehicle || 'N/A'}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="4" className="py-8 px-6 text-center text-gray-500">
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
</div>
          {/* Main Content Grid - Daily Call Target and Call Performance */}
          <div className="grid lg:grid-cols-2 gap-8 mb-3">

  {/* ================= Daily Call Target ================= */}
  <div className="bg-white border border-[#C8C8C8] rounded-[17.59px]">

    {/* Header */}
    <div className="flex items-center justify-between px-6 pt-4 mb-3">
      <h3 className="text-lg font-bold text-gray-800">Daily Call Target</h3>
    </div>

    {/* Content */}
    <div className="flex items-center justify-between px-6 pb-4">

      {/* Bigger Pie Chart */}
      <div className="flex items-center justify-center flex-1">
        <div className="relative">
          <svg width="160" height="160" className="-rotate-90">

            <circle
              cx="80"
              cy="80"
              r="65"
              stroke="#10b981"
              strokeWidth="30"
              fill="none"
              strokeDasharray={`${24 * 4.08} ${76 * 4.08}`}
            />

            <circle
              cx="80"
              cy="80"
              r="65"
              stroke="#3b82f6"
              strokeWidth="30"
              fill="none"
              strokeDasharray={`${48 * 4.08} ${52 * 4.08}`}
              strokeDashoffset={`-${25 * 4.08}`}
            />

            <circle
              cx="80"
              cy="80"
              r="65"
              stroke="#8b5cf6"
              strokeWidth="30"
              fill="none"
              strokeDasharray={`${25 * 4.08} ${81 * 4.08}`}
              strokeDashoffset={`-${74 * 4.08}`}
            />
          </svg>

          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-gray-800">
              {cmtTargetProgress}%
            </span>
          </div>
        </div>
      </div>

      {/* Bigger Right Stats */}
      <div className="flex-1 flex flex-col justify-center gap-2">

        {/* Today's Total */}
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-gray-600 text-sm font-medium">Today's Total</p>
              <p className="text-lg font-bold text-gray-800">
                {Math.floor(totalTalkMinutes / 60).toString().padStart(2, '0')}:
                {Math.floor(totalTalkMinutes % 60).toString().padStart(2, '0')}:00
              </p>
            </div>
            <div className="w-10 h-10 bg-emerald-500 rounded-full"></div>
          </div>
        </div>

        {/* Target Remaining */}
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-gray-600 text-sm font-medium">Target Remaining</p>
              <p className="text-lg font-bold text-gray-800">
                {Math.floor(cmtTargetRemainingMinutes / 60).toString().padStart(2, '0')}:
                {Math.floor(cmtTargetRemainingMinutes % 60).toString().padStart(2, '0')}:00
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-500 rounded-full"></div>
          </div>
        </div>

        {/* Average per Calls */}
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-gray-600 text-sm font-medium">Average per Calls</p>
              <p className="text-lg font-bold text-gray-800">
                {Math.floor(averageCallMinutes).toString().padStart(2, '0')}:
                {Math.floor((averageCallMinutes % 1) * 60).toString().padStart(2, '0')}:00
              </p>
            </div>
            <div className="w-10 h-10 bg-purple-500 rounded-full"></div>
          </div>
        </div>

      </div>
    </div>
  </div>

  {/* ================= Call Performance ================= */}
  <div className="bg-white border border-[#C8C8C8] rounded-[17.59px]">

    {/* Header */}
    <div className="flex items-center justify-between px-6 pt-4 mb-3">
      <h3 className="text-xl font-bold text-gray-800">Call Performance</h3>
      <button className="text-blue-500 text-sm font-medium">View</button>
    </div>

    {/* Completed */}
    <div className="px-6 mb-3">
      <p className="text-gray-600 text-sm">
        {callStats.answered} completed
      </p>
    </div>

    {/* Thicker Progress Bar */}
   <div className="px-6 mb-4">
  <div className="w-full h-4 bg-gray-200 overflow-hidden flex">

    {/* Completed */}
    <div
      className="h-full"
      style={{
        backgroundColor: '#00BD76',
        width: `${callStats.total ? (callStats.answered / callStats.total) * 60 : 0}%`,
      }}
    />

    {/* Missed */}
    <div
      className="h-full bg-orange-500"
      style={{
        width: `${callStats.total ? (callStats.noAnswer / callStats.total) * 20 : 0}%`,
      }}
    />

    {/* Remaining */}
    <div className="h-full bg-blue-500 w-[20%]" />

  </div>
</div>


    {/* Stats */}
    <div className="px-6 pb-6 space-y-3">

  {/* Answered */}
  <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
    <div className="flex items-center gap-6">
      <span className="text-lg font-semibold text-gray-900 w-8 text-left">
        {callStats.answered}
      </span>
      <span className="text-sm font-medium text-gray-700">
        Answered
      </span>
    </div>

    <span className="px-4 py-1 text-sm font-medium rounded-full bg-red-100 text-red-500">
      Overdue
    </span>
  </div>

  {/* Missed */}
  <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
    <div className="flex items-center gap-6">
      <span className="text-lg font-semibold text-gray-900 w-8 text-left">
        {callStats.noAnswer}
      </span>
      <span className="text-sm font-medium text-gray-700">
        Missed
      </span>
    </div>

    <span className="px-4 py-1 text-sm font-medium rounded-full bg-orange-100 text-orange-600">
      High
    </span>
  </div>

  {/* Late */}
  <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
    <div className="flex items-center gap-6">
      <span className="text-lg font-semibold text-gray-900 w-8 text-left">
        {callStats.total}
      </span>
      <span className="text-sm font-medium text-gray-700">
        Late
      </span>
    </div>

    <span className="px-4 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-600">
      Medium
    </span>
  </div>

</div>

  </div>

</div>
          

          {/* Upcoming Birthdays and Recent Carrier */}
          <div className="grid lg:grid-cols-2 gap-8 mb-3">
            <UpcomingBirthdays limit={3} />
            
            {/* Recent Carrier Section */}
            <div className="bg-white border border-[#C8C8C8] rounded-[17.59px] p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Carrier</h3>
              <div className="space-y-3">
                {recentCarriers.map((carrier, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                        <div className="w-full h-full bg-green-500 text-white text-sm font-semibold flex items-center justify-center">
                          {carrier.carrierId.slice(-2)}
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{carrier.name}</p>
                        <p className="text-xs text-gray-500">MC: {carrier.mc}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">
                        {carrier.addedAt}
                      </p>
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
          </div>


        </>
      ) : department === 'Sales' ? (
        // --- Sales Dashboard (Same design as CMT) ---
        <>
          {/* Top Stats Cards */}
          <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 mb-3">
            <StatCard
              title="Present Days"
              value={presentDaysCount}
              icon={CalendarMonthOutlinedIcon}
              // isImage
              color="bg-blue-500"
              subtitle="This Month"
              showTitle={true}
            />
            <StatCard
              title="Total DO"
              value={doData.todayStats.totalAdded}
              icon={GroupIcon}
              color="bg-blue-500"
              subtitle="Added Today"
              trend="up"
              trendValue="8.5%"
              noBackground={true}
            />
            <StatCard
              title="Total Calls"
              value={callStats.total}
              icon={InfoOutlineSharpIcon}
              backgroundColor="#FCC962"
              subtitle="Pending DOs"
              trend="up"
              trendValue="8.5%"
            />
            <StatCard
              title="Today’s DO"
              value={doData.todayStats.approved}
              icon={CheckCircleOutlineSharpIcon}
              color="bg-green-500"
              subtitle="Completed Today"
              trend="up"
              trendValue="8.5%"
            />
          </div>


                         {/* Recent Delivery Orders */}
<div className="bg-white border border-[#C8C8C8] rounded-[17.59px] p-6 mb-3" 
     style={{
       boxShadow: '7.54px 7.54px 67.85px 0px rgba(0, 0, 0, 0.05)',
       borderWidth: '1.31px'
     }}>
  <div className="flex items-center justify-between mb-6">
    <h3 className="text-xl font-bold text-gray-800">Recent Delivery Orders</h3>
    <button className="text-gray-500 hover:text-gray-700 text-sm font-medium px-4 py-2 border border-gray-300 rounded-lg">
      View All
    </button>
  </div>
  
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-200">
          <th className="text-left py-4 px-6 text-gray-600 font-medium text-base">Load ID</th>
          <th className="text-left py-4 px-6 text-gray-600 font-medium text-base">Bill To</th>
          <th className="text-left py-4 px-6 text-gray-600 font-medium text-base">Shipper Name</th>
          <th className="text-left py-4 px-6 text-gray-600 font-medium text-base">Carrier Name</th>
          <th className="text-left py-4 px-6 text-gray-600 font-medium text-base">Date-Time</th>
          <th className="text-left py-4 px-6 text-gray-600 font-medium text-base">Carrier Fees</th>
        </tr>
      </thead>
      <tbody>
        {doData.todayDOs.length > 0 ? (
          doData.todayDOs.map((deliveryOrder, index) => {
            // Extract data from API response structure
            const loadId = deliveryOrder.loadNo || deliveryOrder._id?.slice(-8) || 'N/A';
            const billTo = deliveryOrder.billTo || 'N/A';
            const carrierName = deliveryOrder.assignedToCMT?.compName || 
                              deliveryOrder.carrier?.compName || 
                              deliveryOrder.carrierName || 
                              'N/A';
            const shipperName = deliveryOrder.shipper?.compName || 
                              deliveryOrder.shipperName || 
                              'N/A';
            
            // Format date-time
            const dateTime = deliveryOrder.createdAt || deliveryOrder.date || new Date().toISOString();
            const formattedDateTime = new Date(dateTime).toLocaleDateString('en-US', {
              month: '2-digit',
              day: '2-digit', 
              year: 'numeric'
            }) + ' - ' + new Date(dateTime).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            });
            
            // Calculate total amount from lineHaul, fsc, and other charges
            const lineHaul = Number(deliveryOrder.lineHaul) || 0;
            const fsc = Number(deliveryOrder.fsc) || 0;
            const otherTotal = Array.isArray(deliveryOrder.other) 
              ? deliveryOrder.other.reduce((sum, item) => sum + (Number(item.total) || 0), 0)
              : 0;
            const totalAmount = lineHaul + fsc + otherTotal;
            
            // Status styling
            const status = deliveryOrder.status || 'pending';
            const getStatusStyle = (status) => {
              switch(status.toLowerCase()) {
                case 'delivered':
                case 'completed':
                  return 'bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium';
                case 'approved':
                  return 'bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium';
                case 'pending':
                  return 'bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-medium';
                case 'rejected':
                case 'cancelled':
                  return 'bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium';
                case 'open':
                  return 'bg-indigo-500 text-white px-3 py-1 rounded-full text-xs font-medium';
                case 'in-progress':
                case 'in_progress':
                  return 'bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-medium';
                case 'on-hold':
                case 'on_hold':
                  return 'bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-medium';
                default:
                  return 'bg-gray-500 text-white px-3 py-1 rounded-full text-xs font-medium';
              }
            };
            
            return (
              <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-4 px-6 text-gray-800 font-medium">{loadId}</td>
                <td className="py-4 px-6 text-gray-600">{billTo}</td>
                <td className="py-4 px-6 text-gray-600">{shipperName}</td>
                <td className="py-4 px-6 text-gray-600">{carrierName}</td>
                <td className="py-4 px-6 text-gray-600">{formattedDateTime}</td>
                <td className="py-4 px-6 text-gray-800 font-semibold">${totalAmount.toLocaleString()}</td>
              </tr>
            );
          })
        ) : (
          <tr>
            <td colSpan="6" className="py-8 px-6 text-center text-gray-500">
              <div className="flex flex-col items-center">
                <Truck className="w-8 h-8 text-gray-300 mb-2" />
                <p>No recent delivery orders available</p>
              </div>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</div>

          {/* Main Content Grid -  Daily Call Target and Call Performance */}
          <div className="grid lg:grid-cols-2 gap-8 mb-3">

  {/* ================= Daily Call Target ================= */}
  <div className="bg-white border border-[#C8C8C8] rounded-[17.59px]">
    
    {/* Header */}
    <div className="flex items-center justify-between px-6 pt-4 mb-3">
      <h3 className="text-lg font-bold text-gray-800">Daily Call Target</h3>
    </div>

    {/* Content */}
    <div className="flex items-center justify-between px-6 pb-4">

      {/* Bigger Pie Chart */}
      <div className="flex items-center justify-center flex-1">
        <div className="relative">
          <svg width="160" height="160" className="-rotate-90">
            
            <circle
              cx="80"
              cy="80"
              r="65"
              stroke="#10b981"
              strokeWidth="30"
              fill="none"
              strokeDasharray={`${24 * 4.08} ${76 * 4.08}`}
            />

            <circle
              cx="80"
              cy="80"
              r="65"
              stroke="#3b82f6"
              strokeWidth="30"
              fill="none"
              strokeDasharray={`${48 * 4.08} ${52 * 4.08}`}
              strokeDashoffset={`-${25 * 4.08}`}
            />

            <circle
              cx="80"
              cy="80"
              r="65"
              stroke="#8b5cf6"
              strokeWidth="30"
              fill="none"
              strokeDasharray={`${25 * 4.08} ${81 * 4.08}`}
              strokeDashoffset={`-${74 * 4.08}`}
            />
          </svg>

          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-gray-800">
              {salesTargetProgress}%
            </span>
          </div>
        </div>
      </div>

      {/* Bigger Right Stats */}
      <div className="flex-1 flex flex-col justify-center gap-2">

        {/* Today Total */}
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-gray-600 text-sm font-medium">Today's Total</p>
              <p className="text-lg font-bold text-gray-800">
                {formatSeconds(totalTalkSeconds)}
              </p>
            </div>
            <div className="w-10 h-10 bg-emerald-500 rounded-full"></div>
          </div>
        </div>

        {/* Target Remaining */}
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-gray-600 text-sm font-medium">Target Remaining</p>
              <p className="text-lg font-bold text-gray-800">
                {formatSeconds(salesTargetRemainingSeconds)}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-500 rounded-full"></div>
          </div>
        </div>

        {/* Average Calls */}
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-gray-600 text-sm font-medium">Average per Calls</p>
              <p className="text-lg font-bold text-gray-800">
                {Math.floor(averageCallMinutes).toString().padStart(2, '0')}:
                {Math.floor((averageCallMinutes % 1) * 60).toString().padStart(2, '0')}:00
              </p>
            </div>
            <div className="w-10 h-10 bg-purple-500 rounded-full"></div>
          </div>
        </div>

      </div>
    </div>
  </div>

  {/* ================= Call Performance ================= */}
  <div className="bg-white border border-[#C8C8C8] rounded-[17.59px]">

    {/* Header */}
    <div className="flex items-center justify-between px-6 pt-4 mb-3">
      <h3 className="text-xl font-bold text-gray-800">Call Performance</h3>
      <button className="text-blue-500 text-sm font-medium">View</button>
    </div>

    {/* Completed */}
    <div className="px-6 mb-3">
      <p className="text-gray-600 text-sm">
        {callStats.answered} completed
      </p>
    </div>

    {/* Thicker Progress Bar */}
   <div className="px-6 mb-4">
  <div className="w-full h-4 bg-gray-200 overflow-hidden flex">
    
    {/* Completed */}
    <div
      className="h-full"
      style={{
        backgroundColor: '#00BD76',
        width: `${callStats.total ? (callStats.answered / callStats.total) * 60 : 0}%`,
      }}
    />

    {/* Missed */}
    <div
      className="h-full bg-orange-500"
      style={{
        width: `${callStats.total ? (callStats.noAnswer / callStats.total) * 20 : 0}%`,
      }}
    />

    {/* Remaining */}
    <div className="h-full bg-blue-500 w-[20%]" />

  </div>
</div>


    {/* Stats */}
    <div className="px-6 pb-6 space-y-3">

  {/* Answered */}
  <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
    <div className="flex items-center gap-6">
      <span className="text-lg font-semibold text-gray-900 w-8 text-left">
        {callStats.answered}
      </span>
      <span className="text-sm font-medium text-gray-700">
        Answered
      </span>
    </div>

    <span className="px-4 py-1 text-sm font-medium rounded-full bg-red-100 text-red-500">
      Overdue
    </span>
  </div>

  {/* Missed */}
  <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
    <div className="flex items-center gap-6">
      <span className="text-lg font-semibold text-gray-900 w-8 text-left">
        {callStats.noAnswer}
      </span>
      <span className="text-sm font-medium text-gray-700">
        Missed
      </span>
    </div>

    <span className="px-4 py-1 text-sm font-medium rounded-full bg-orange-100 text-orange-600">
      High
    </span>
  </div>

  {/* Late */}
  <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
    <div className="flex items-center gap-6">
      <span className="text-lg font-semibold text-gray-900 w-8 text-left">
        {callStats.total}
      </span>
      <span className="text-sm font-medium text-gray-700">
        Late
      </span>
    </div>

    <span className="px-4 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-600">
      Medium
    </span>
  </div>

</div>

  </div>

</div>


          {/* Upcoming Birthdays and Daily Follow Notification */}
          <div className="grid lg:grid-cols-2 gap-8 mb-3">
            <UpcomingBirthdays limit={3} />
            <DailyFollowNotification limit={3} />
          </div>
        </>
      ) : null}
    </div>
  );
};

export default Dashboard;


