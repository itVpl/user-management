import React from 'react';
import { Calendar, Target, Monitor, MoreHorizontal, CheckCircle, Truck, FileText, Users } from 'lucide-react';
import { AttandaceCalendar,laptop } from '../../assets/image';

export default function CMTDashbaord() {
  const shipperData = [
    { shipperId: 'CNU1234567', loadId: 'L00331', weight: '300Lbs', vehicle: 'Flatbed' },
    { shipperId: 'CNU1234567', loadId: 'L00331', weight: '300Lbs', vehicle: 'Flatbed' },
    { shipperId: 'CNU1234567', loadId: 'L00331', weight: '300Lbs', vehicle: 'Flatbed' },
    { shipperId: 'CNU1234567', loadId: 'L00331', weight: '300Lbs', vehicle: 'Flatbed' },
    { shipperId: 'CNU1234567', loadId: 'L00331', weight: '300Lbs', vehicle: 'Flatbed' },
    { shipperId: 'CNU1234567', loadId: 'L00331', weight: '300Lbs', vehicle: 'Flatbed' },
    { shipperId: 'CNU1234567', loadId: 'L00331', weight: '300Lbs', vehicle: 'Flatbed' },
    { shipperId: 'CNU1234567', loadId: 'L00331', weight: '300Lbs', vehicle: 'Flatbed' },
  ];

  const truckerDocs = [
    { shipperId: 'CNU1234567', activity: 'Uploaded', status: 'success' },
    { shipperId: 'CNU1238967', activity: 'Uploaded', status: 'success' },
    { shipperId: 'CNU1234568', activity: 'Pending', status: 'pending' },
    { shipperId: 'CNU1232558', activity: 'Uploaded', status: 'success' },
    { shipperId: 'CNU1239996', activity: 'Uploaded', status: 'success' },
  ];



  const CircularProgress = ({ percentage }) => {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="#10b981"
            strokeWidth="8"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{percentage}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Top Stats */}
        <div className="grid grid-cols-3 gap-4">
          {/* Attendance */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-gray-800 p-2 rounded-lg">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <span className="text-gray-700 font-medium text-sm">Attendance</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-gray-900">20</div>
     <img src={AttandaceCalendar} alt="attandance-icon" />
            </div>
          </div>

          {/* Daily Targets */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                </div>
              </div>
              <span className="text-gray-700 font-medium text-sm">Daily Targets</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-gray-900">3000</div>
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white fill-current" />
              </div>
            </div>
          </div>

          {/* Personal Hygiene */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-orange-500 p-2 rounded-lg">
                <div className="w-4 h-4 bg-white rounded-sm"></div>
              </div>
              <span className="text-gray-700 font-medium text-sm">Personal Hygiene</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-gray-900">500</div>
              <img src={laptop} alt="" srcset="" />
            </div>
          </div>
        </div>

        {/* Middle Section */}
        <div className="grid grid-cols-2 gap-4">
          {/* Calling Reports */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Calling Reports</h2>
              <MoreHorizontal className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 pb-2 border-b border-gray-200">
                <span className="text-gray-600 text-sm font-medium">Metric</span>
                <span className="text-gray-600 text-sm font-medium">Count</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-700 text-sm">Total Calls</span>
                <span className="font-medium text-sm">45</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-700 text-sm">Successful Calls</span>
                <span className="font-medium text-sm">32</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-700 text-sm">Unanswered Calls</span>
                <span className="font-medium text-sm">13</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-700 text-sm">Average Call Durations</span>
                <span className="font-medium text-sm">2 min 15sec</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-700 text-sm">Lead Generation</span>
                <span className="font-medium text-sm">4</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-700 text-sm">Conversion Rate</span>
                <span className="font-medium text-sm">12.5%</span>
              </div>
            </div>
          </div>

          {/* Shippers Load Data */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Shippers Load Data</h2>
            <div className="overflow-hidden">
              <div className="grid grid-cols-4 gap-3 py-2 border-b border-gray-200">
                <div className="text-xs font-medium text-blue-600 uppercase tracking-wider">Shipper ID</div>
                <div className="text-xs font-medium text-blue-600 uppercase tracking-wider">Load ID</div>
                <div className="text-xs font-medium text-blue-600 uppercase tracking-wider">Weight</div>
                <div className="text-xs font-medium text-blue-600 uppercase tracking-wider">Vehicle</div>
              </div>
              <div className="divide-y divide-gray-100">
                {shipperData.map((item, index) => (
                  <div key={index} className={`grid grid-cols-4 gap-3 py-2 text-sm ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                    <div className="text-gray-900">{item.shipperId}</div>
                    <div className="text-gray-900">{item.loadId}</div>
                    <div className="text-gray-900">{item.weight}</div>
                    <div className="text-gray-900">{item.vehicle}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 text-center">
              <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">
                View all
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Personal Hygiene Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Personal Hygiene</h2>
            <div className="flex justify-center mb-6">
              <CircularProgress percentage={70} />
            </div>
            <div className="text-center">
              <button className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">
                View all
              </button>
            </div>
          </div>

          {/* Total Fleets */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 shadow-sm text-white">
            <h2 className="text-lg font-semibold mb-8">Total Fleets</h2>
            <div className="text-center">
              <div className="text-5xl font-bold mb-8">2,441</div>
              <button className="bg-white bg-opacity-20 backdrop-blur-sm text-white px-6 py-2 rounded-lg hover:bg-opacity-30 transition-all text-sm font-medium border border-white border-opacity-20">
                View all
              </button>
            </div>
          </div>

          {/* Truckers Docs */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Truckers Docs</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 py-2 border-b border-gray-200">
                <div className="text-xs font-medium text-blue-600 uppercase tracking-wider">Shipper ID</div>
                <div className="text-xs font-medium text-blue-600 uppercase tracking-wider">Activity</div>
              </div>
              <div className="space-y-3">
                {truckerDocs.map((doc, index) => (
                  <div key={index} className="grid grid-cols-2 gap-4 items-center">
                    <div className="text-gray-900 text-sm">{doc.shipperId}</div>
                    <div className="flex justify-end">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        doc.status === 'success' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {doc.activity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 text-center">
              <button className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">
                View all
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}