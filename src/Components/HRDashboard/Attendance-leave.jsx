import React, { useState } from 'react';


const HRManagementSystem = () => {
  const [activeTab, setActiveTab] = useState('dailyAttendance');
  const [activeMenuItem, setActiveMenuItem] = useState('attendance');

  const dailyAttendanceData = [
    { date: '18-06-2025', empId: 'VPL001', name: 'Troy', logIn: '05:30 PM', logOut: '------', totalHrs: '', status: 'Present', dept: 'Sales', role: 'Admin' },
    { date: '18-06-2025', empId: 'VPL002', name: 'Easton', logIn: '------', logOut: '------', totalHrs: '', status: 'Absent', dept: 'Sales', role: 'Admin' },
    { date: '18-06-2025', empId: 'VPL003', name: 'Dhruv', logIn: '------', logOut: '------', totalHrs: '', status: 'On-Leave', dept: 'Sales', role: 'Executive' },
    { date: '18-06-2025', empId: 'VPL004', name: 'Rishabh', logIn: '06:00 PM', logOut: '------', totalHrs: '', status: 'Half day', dept: 'Sales', role: 'Executive' },
  ];

  const leaveRequestData = [
    { date: '16-06-2025', empId: 'VPL001', name: 'Troy', from: '18-06-2025', to: '18-06-2025', type: 'CL', dept: 'Sales', role: 'Admin', status: 'pending' },
    { date: '18-06-2025', empId: 'VPL002', name: 'Easton', from: '20-06-2025', to: '25-06-2025', type: 'CL', dept: 'Sales', role: 'Admin', status: 'approved' },
    { date: '12-06-2025', empId: 'VPL003', name: 'Dhruv', from: '18-06-2025', to: '18-06-2025', type: 'CL', dept: 'Sales', role: 'Executive', status: 'rejected' },
    { date: '10-06-2025', empId: 'VPL004', name: 'Rishabh', from: '21-06-2025', to: '------', type: 'SL', dept: 'Sales', role: 'Executive', status: 'pending' },
  ];

  const leaveBalanceData = [
    { empId: 'VPL001', name: 'Troy', casualLeave: '06', sickLeave: '03', totalLeave: '09' },
    { empId: 'VPL002', name: 'Easton', casualLeave: '06', sickLeave: '03', totalLeave: '09' },
    { empId: 'VPL003', name: 'Dhruv', casualLeave: '01', sickLeave: '2.5', totalLeave: '3.5' },
    { empId: 'VPL004', name: 'Rishabh', casualLeave: '03', sickLeave: '00', totalLeave: '03' },
  ];

  const getStatusBadge = (status) => {
    const statusClasses = {
      'Present': 'bg-green-600 text-white',
      'Absent': 'bg-red-600 text-white',
      'On-Leave': 'bg-yellow-500 text-white',
      'Half day': 'bg-blue-500 text-white',
    };
    return `px-3 py-1 rounded-full text-sm font-medium ${statusClasses[status] || 'bg-gray-200'}`;
  };

  const getActionButtons = (status) => {
    if (status === 'pending') {
      return (
        <div className="flex gap-2">
          <button className="text-green-600 hover:text-green-800">
            <Check size={16} />
          </button>
          <button className="text-red-600 hover:text-red-800">
            <X size={16} />
          </button>
        </div>
      );
    }
    return null;
  };

  const getLeaveStatusBadge = (status) => {
    const statusClasses = {
      'approved': 'bg-green-600 text-white px-3 py-1 rounded text-sm',
      'rejected': 'bg-red-600 text-white px-3 py-1 rounded text-sm',
      'pending': null,
    };
    
    if (status === 'approved') return <span className={statusClasses[status]}>Approved</span>;
    if (status === 'rejected') return <span className={statusClasses[status]}>Rejected</span>;
    return getActionButtons(status);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dailyAttendance':
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Employee ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Employee Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Log In</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Log out</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Total hrs</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Dept</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                </tr>
              </thead>
              <tbody>
                {dailyAttendanceData.map((row, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">{row.date}</td>
                    <td className="py-3 px-4 text-blue-600">{row.empId}</td>
                    <td className="py-3 px-4 text-gray-700">{row.name}</td>
                    <td className="py-3 px-4 text-gray-700">{row.logIn}</td>
                    <td className="py-3 px-4 text-gray-700">{row.logOut}</td>
                    <td className="py-3 px-4 text-gray-700">{row.totalHrs}</td>
                    <td className="py-3 px-4">
                      <span className={getStatusBadge(row.status)}>{row.status}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{row.dept}</td>
                    <td className="py-3 px-4 text-gray-700">{row.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      
      case 'leaveRequest':
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Employee ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Employee Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">From</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">To</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Type of Leave</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Dept</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequestData.map((row, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">{row.date}</td>
                    <td className="py-3 px-4 text-blue-600">{row.empId}</td>
                    <td className="py-3 px-4 text-gray-700">{row.name}</td>
                    <td className="py-3 px-4 text-gray-700">{row.from}</td>
                    <td className="py-3 px-4 text-gray-700">{row.to}</td>
                    <td className="py-3 px-4 text-gray-700">{row.type}</td>
                    <td className="py-3 px-4 text-gray-700">{row.dept}</td>
                    <td className="py-3 px-4 text-gray-700">{row.role}</td>
                    <td className="py-3 px-4">
                      {getLeaveStatusBadge(row.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      
      case 'leaveBalance':
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Employee ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Employee Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Causal Leave</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Sick Leave</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Total Leave</th>
                </tr>
              </thead>
              <tbody>
                {leaveBalanceData.map((row, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-blue-600">{row.empId}</td>
                    <td className="py-3 px-4 text-gray-700">{row.name}</td>
                    <td className="py-3 px-4 text-gray-700">{row.casualLeave}</td>
                    <td className="py-3 px-4 text-gray-700">{row.sickLeave}</td>
                    <td className="py-3 px-4 text-gray-700">{row.totalLeave}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
 
        {/* Tab Navigation */}
        <div className="bg-white px-6 py-4 border-b">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('dailyAttendance')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === 'dailyAttendance'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Daily Attendance
            </button>
            <button
              onClick={() => setActiveTab('leaveRequest')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === 'leaveRequest'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Leave Request
            </button>
            <button
              onClick={() => setActiveTab('leaveBalance')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === 'leaveBalance'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Leave Balance
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow-sm">
            {renderTabContent()}
          </div>
          
          {/* Pagination */}
          <div className="flex justify-between items-center mt-6">
            <span className="text-sm text-gray-600">4 of 4</span>
            <div className="flex space-x-2">
              <button className="px-3 py-1 text-gray-600 hover:text-gray-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button className="px-3 py-1 bg-blue-500 text-white rounded">1</button>
              <button className="px-3 py-1 text-gray-600 hover:text-gray-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRManagementSystem;