import React from 'react';
import { Calendar, Target, MoreHorizontal, CheckCircle, Laptop } from 'lucide-react';
import { AttandaceCalendar, laptop, NewUSerImage } from '../../assets/image';

const CMTMDashboard = () => {
  // Sample data for the dashboard
  const shippersData = [
    { shipperID: 'CNUI234567', loadID: 'L00331', weight: '300lbs', vehicle: 'Flatbed' },
    { shipperID: 'CNUI234567', loadID: 'L00331', weight: '300lbs', vehicle: 'Flatbed' },
    { shipperID: 'CNUI234567', loadID: 'L00331', weight: '300lbs', vehicle: 'Flatbed' },
    { shipperID: 'CNUI234567', loadID: 'L00331', weight: '300lbs', vehicle: 'Flatbed' },
    { shipperID: 'CNUI234567', loadID: 'L00331', weight: '300lbs', vehicle: 'Flatbed' },
    { shipperID: 'CNUI234567', loadID: 'L00331', weight: '300lbs', vehicle: 'Flatbed' },
    { shipperID: 'CNUI234567', loadID: 'L00331', weight: '300lbs', vehicle: 'Flatbed' },
    { shipperID: 'CNUI234567', loadID: 'L00331', weight: '300lbs', vehicle: 'Flatbed' },
  ];

  const shippersDocsData = [
    { shipperID: 'CNUI234567', activity: 'Uploaded', color: 'bg-green-500' },
    { shipperID: 'CNUI238967', activity: 'Uploaded', color: 'bg-green-500' },
    { shipperID: 'CNUI234568', activity: 'Pending', color: 'bg-yellow-500' },
    { shipperID: 'CNUI232558', activity: 'Uploaded', color: 'bg-green-500' },
    { shipperID: 'CNUI239986', activity: 'Uploaded', color: 'bg-green-500' },
  ];

  const billingsData = [
    { invoiceNo: 'INV-1123', shipper: 'J.Traders', date: '10-Jun-2025', amount: '$25,000' },
    { invoiceNo: 'INV-1153', shipper: 'J.Traders', date: '10-Jun-2025', amount: '$34,000' },
    { invoiceNo: 'INV-4568', shipper: 'J.Traders', date: '10-Jun-2025', amount: '$5,000' },
    { invoiceNo: 'INV-7896', shipper: 'J.Traders', date: '10-Jun-2025', amount: '$14,000' },
    { invoiceNo: 'INV-8523', shipper: 'J.Traders', date: '10-Jun-2025', amount: '$55,000' },
  ];

  const addCustomerData = [
    { agent: 'VPL001', shipper: 'SVPL015' },
    { agent: 'VPL023', shipper: 'SVPL001' },
    { agent: 'VPL030', shipper: 'SVPL050' },
    { agent: 'VPL050', shipper: 'SVPL014' },
  ];

  const callingReportsData = [
    { metric: 'Total Calls', count: '45' },
    { metric: 'Successful Calls', count: '32' },
    { metric: 'Unanswered Calls', count: '13' },
    { metric: 'Average Call Durations', count: '2 min 15sec' },
    { metric: 'Lead Generation', count: '4' },
    { metric: 'Conversion Rate', count: '12.5%' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Top Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Attendance Card */}
          <div className="bg-white rounded-lg shadow-sm p-4 h-32">
            <div className="flex items-center justify-between h-full">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-700 text-sm font-medium">Attendance</span>
                </div>
                <div className="text-4xl font-bold text-gray-900">20</div>
              </div>
              <div className="w-16 h-16 flex items-center justify-center">
              <img src={AttandaceCalendar} alt="attandaceCalender" />
              </div>
            </div>
          </div>

          {/* Daily Targets Card */}
          <div className="bg-white rounded-lg shadow-sm p-4 h-32">
            <div className="flex items-center justify-between h-full">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-700 text-sm font-medium">Daily Targets</span>
                </div>
                <div className="text-4xl font-bold text-gray-900">3000</div>
              </div>
              <div className="w-16 h-16 flex items-center justify-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Personal Hygiene Card */}
          <div className="bg-white rounded-lg shadow-sm p-4 h-32">
            <div className="flex items-center justify-between h-full">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-orange-500 rounded-full"></div>
                  <span className="text-gray-700 text-sm font-medium">Personal Hygiene</span>
                </div>
                <div className="text-4xl font-bold text-gray-900">500</div>
              </div>
              <div className="w-16 h-16 flex items-center justify-center">
                <div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center">
                 <img src={laptop} alt="laptop" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Calling Reports */}
          <div className="bg-white rounded-lg shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Calling Reports</h2>
              <MoreHorizontal className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">Metric</span>
                <span className="text-gray-500 text-sm">Count</span>
              </div>
              {callingReportsData.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">{item.metric}</span>
                  <span className="font-medium text-gray-900 text-sm">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Shippers Load Data */}
          <div className="bg-white rounded-lg shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Shippers Load Data</h2>
            </div>
            <div className="overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-blue-600 font-medium">Shipper ID</th>
                    <th className="text-left py-2 text-blue-600 font-medium">Load ID</th>
                    <th className="text-left py-2 text-blue-600 font-medium">Weight</th>
                    <th className="text-left py-2 text-blue-600 font-medium">Vehicle</th>
                  </tr>
                </thead>
                <tbody>
                  {shippersData.slice(0, 8).map((item, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-1.5 text-gray-700 text-xs">{item.shipperID}</td>
                      <td className="py-1.5 text-gray-700 text-xs">{item.loadID}</td>
                      <td className="py-1.5 text-gray-700 text-xs">{item.weight}</td>
                      <td className="py-1.5 text-gray-700 text-xs">{item.vehicle}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-center">
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">
                View all
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          {/* Revenue Stats */}
          <div className="bg-white rounded-lg shadow-sm p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Statics</h2>
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-32 h-32">
                {/* Pie chart simulation */}
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  {/* Main slice (68.2%) */}
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="20"
                    strokeDasharray="215 315"
                    strokeDashoffset="0"
                  />
                  {/* Second slice (9.8%) */}
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#93C5FD"
                    strokeWidth="20"
                    strokeDasharray="31 315"
                    strokeDashoffset="-215"
                  />
                  {/* Third slice (10%) */}
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="20"
                    strokeDasharray="31 315"
                    strokeDashoffset="-246"
                  />
                  {/* Fourth slice (5%) */}
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#F9A8D4"
                    strokeWidth="20"
                    strokeDasharray="16 315"
                    strokeDashoffset="-277"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-700">68.2%</div>
                    <div className="text-xs text-gray-500">9.8%</div>
                    <div className="text-xs text-gray-500">10% 5%</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">
                View all
              </button>
            </div>
          </div>

          {/* Team */}
          <div className="bg-white rounded-lg shadow-sm p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Team</h2>
            <div className="flex items-center justify-center mb-4">
              {/* <div className="flex -space-x-2">
                <div className="w-12 h-12 bg-gray-800 rounded-full border-2 border-white"></div>
                <div className="w-12 h-12 bg-gray-600 rounded-full border-2 border-white"></div>
                <div className="w-12 h-12 bg-gray-700 rounded-full border-2 border-white"></div>
              </div> */}

              <img src={NewUSerImage} alt="newUserImage" />
            </div>
            <div className="flex gap-1 justify-center mb-4 flex-wrap">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Calling Reports</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Daily Targets</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Shipper Load Data</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Hygiene</span>
            </div>
            <div className="flex justify-center">
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">
                View all
              </button>
            </div>
          </div>

          {/* Shippers Docs */}
          <div className="bg-white rounded-lg shadow-sm p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Shippers Docs</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1">
                <span className="text-blue-600 text-sm font-medium">Shipper ID</span>
                <span className="text-blue-600 text-sm font-medium">Activity</span>
              </div>
              {shippersDocsData.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-1">
                  <span className="text-gray-700 text-sm">{item.shipperID}</span>
                  <span className={`px-2 py-1 rounded text-white text-xs ${item.color}`}>
                    {item.activity}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-center">
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">
                View all
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Grid - Billings and Add Customer */}
        <div className="grid grid-cols-2 gap-6">
          {/* Billings Section */}
          <div className="bg-white rounded-lg shadow-sm p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Billings</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-blue-600 font-medium">Invoice No.</th>
                    <th className="text-left py-2 text-blue-600 font-medium">Shipper</th>
                    <th className="text-left py-2 text-blue-600 font-medium">Date</th>
                    <th className="text-left py-2 text-blue-600 font-medium">Amt</th>
                  </tr>
                </thead>
                <tbody>
                  {billingsData.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 text-gray-700">{item.invoiceNo}</td>
                      <td className="py-2 text-gray-700">{item.shipper}</td>
                      <td className="py-2 text-gray-700">{item.date}</td>
                      <td className="py-2 text-gray-700 font-medium">{item.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-center">
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">
                View all
              </button>
            </div>
          </div>

          {/* Add Customer Section */}
          <div className="bg-white rounded-lg shadow-sm p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Customer</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-blue-600 font-medium">Agent</th>
                    <th className="text-left py-2 text-blue-600 font-medium">Shipper</th>
                  </tr>
                </thead>
                <tbody>
                  {addCustomerData.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 text-gray-700">{item.agent}</td>
                      <td className="py-2 text-gray-700">{item.shipper}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-center">
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">
                View all
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CMTMDashboard;