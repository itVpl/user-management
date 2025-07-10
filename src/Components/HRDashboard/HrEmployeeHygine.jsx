import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

const HREmployeeHygine = () => {
  const [expandedRows, setExpandedRows] = useState({});

  const employees = [
    {
      id: 'VPL001',
      name: 'Joseph',
      role: 'Admin',
      department: 'Sales',
      status: 'Maintained',
      metrics: {
        attendance: { current: 14, total: 18 },
        breaks: { current: 1, total: 1 },
        dailyTargets: { current: 2500, total: 3000 },
        timeInOut: { current: 3, total: 5 }
      }
    },
    {
      id: 'VPL002',
      name: 'Hardy',
      role: 'Admin',
      department: 'Sales',
      status: 'No-Maintained',
      metrics: {
        attendance: { current: 12, total: 18 },
        breaks: { current: 0, total: 1 },
        dailyTargets: { current: 2100, total: 3000 },
        timeInOut: { current: 2, total: 5 }
      }
    },
    {
      id: 'VPL003',
      name: 'Eastern',
      role: 'Admin',
      department: 'Sales',
      status: 'Maintained',
      metrics: {
        attendance: { current: 16, total: 18 },
        breaks: { current: 1, total: 1 },
        dailyTargets: { current: 2800, total: 3000 },
        timeInOut: { current: 4, total: 5 }
      }
    }
  ];

  const toggleRow = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getProgressColor = (metric, current, total) => {
    const percentage = (current / total) * 100;
    
    switch(metric) {
      case 'attendance':
        return percentage >= 80 ? 'bg-emerald-500' : percentage >= 60 ? 'bg-amber-500' : 'bg-red-500';
      case 'breaks':
        return 'bg-amber-500';
      case 'dailyTargets':
        return percentage >= 80 ? 'bg-emerald-500' : percentage >= 60 ? 'bg-amber-500' : 'bg-red-500';
      case 'timeInOut':
        return percentage >= 80 ? 'bg-emerald-500' : percentage >= 60 ? 'bg-amber-500' : 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getOverallScore = (metrics) => {
    const attendanceScore = (metrics.attendance.current / metrics.attendance.total) * 100;
    const targetScore = (metrics.dailyTargets.current / metrics.dailyTargets.total) * 100;
    const timeScore = (metrics.timeInOut.current / metrics.timeInOut.total) * 100;
    
    return Math.round((attendanceScore + targetScore + timeScore) / 3);
  };

  const getStatusBadge = (status) => {
    const baseClasses = "px-3 py-1 rounded-full text-sm font-medium";
    if (status === 'Maintained') {
      return `${baseClasses} bg-emerald-100 text-emerald-800`;
    } else {
      return `${baseClasses} bg-red-100 text-red-800`;
    }
  };

  const CircularProgress = ({ percentage }) => {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="#f1f5f9"
            strokeWidth="6"
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="#10b981"
            strokeWidth="6"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-in-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-800">{percentage}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-200 to-blue-500 px-8 py-6">
          <div className="grid grid-cols-5 gap-6 font-semibold text-white">
            <div className="text-blue-100">Employee Name</div>
            <div className="text-blue-100">Employee ID</div>
            <div className="text-blue-100">Role</div>
            <div className="text-blue-100">Department</div>
            <div className="text-blue-100">Status</div>
          </div>
        </div>

        {/* Employee Rows */}
        <div className="divide-y divide-gray-100">
          {employees.map((employee, index) => (
            <div key={employee.id} className="bg-white hover:bg-gray-50 transition-all duration-200">
              {/* Main Row */}
              <div 
                className="px-8 py-6 cursor-pointer group"
                onClick={() => toggleRow(employee.id)}
              >
                <div className="grid grid-cols-5 gap-6 items-center">
                  <div className="flex items-center space-x-3">
                    <div className="p-1 rounded-full group-hover:bg-blue-100 transition-colors">
                      {expandedRows[employee.id] ? (
                        <ChevronDown className="w-5 h-5 text-blue-600" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">{employee.name.charAt(0)}</span>
                      </div>
                      <span className="font-semibold text-gray-900 text-lg">{employee.name}</span>
                    </div>
                  </div>
                  <div className="text-gray-600 font-medium">{employee.id}</div>
                  <div className="text-gray-600 font-medium">{employee.role}</div>
                  <div className="text-gray-600 font-medium">{employee.department}</div>
                  <div>
                    <span className={getStatusBadge(employee.status)}>{employee.status}</span>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedRows[employee.id] && (
                <div className="px-8 py-8 bg-gradient-to-br from-gray-50 to-blue-50 border-t border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-8">
                      <div className="flex items-center space-x-3 mb-8">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                          <div className="w-3 h-3 bg-white rounded-full"></div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">Personal Hygiene</h3>
                      </div>
                      
                      <div className="space-y-6">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Attendance</span>
                            <span className="text-sm font-medium text-gray-600">
                              {employee.metrics.attendance.current}/{employee.metrics.attendance.total}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className={`h-3 rounded-full transition-all duration-500 ${getProgressColor('attendance', employee.metrics.attendance.current, employee.metrics.attendance.total)}`}
                              style={{width: `${(employee.metrics.attendance.current / employee.metrics.attendance.total) * 100}%`}}
                            ></div>
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Breaks</span>
                            <span className="text-sm font-medium text-gray-600">
                              {employee.metrics.breaks.current}:{employee.metrics.breaks.total}:00
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className={`h-3 rounded-full transition-all duration-500 ${getProgressColor('breaks', employee.metrics.breaks.current, employee.metrics.breaks.total)}`}
                              style={{width: `${(employee.metrics.breaks.current / employee.metrics.breaks.total) * 100}%`}}
                            ></div>
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Daily Targets</span>
                            <span className="text-sm font-medium text-gray-600">
                              {employee.metrics.dailyTargets.current}/{employee.metrics.dailyTargets.total}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className={`h-3 rounded-full transition-all duration-500 ${getProgressColor('dailyTargets', employee.metrics.dailyTargets.current, employee.metrics.dailyTargets.total)}`}
                              style={{width: `${(employee.metrics.dailyTargets.current / employee.metrics.dailyTargets.total) * 100}%`}}
                            ></div>
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Time In - Out</span>
                            <span className="text-sm font-medium text-gray-600">
                              0{employee.metrics.timeInOut.current}/0{employee.metrics.timeInOut.total}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className={`h-3 rounded-full transition-all duration-500 ${getProgressColor('timeInOut', employee.metrics.timeInOut.current, employee.metrics.timeInOut.total)}`}
                              style={{width: `${(employee.metrics.timeInOut.current / employee.metrics.timeInOut.total) * 100}%`}}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center space-y-4">
                      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                        <CircularProgress percentage={getOverallScore(employee.metrics)} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-600 mb-1">Overall Score</p>
                        <p className="text-xs text-gray-500">Performance Rating</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-blue-50 border-t border-gray-100 flex items-center justify-between">
          <div className="text-sm font-medium text-gray-600">
            Showing 3 to 3 of 03 entries
          </div>
          <div className="flex items-center space-x-2">
            <button className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-white rounded-lg transition-colors">
              ‹
            </button>
            <button className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors">
              1
            </button>
            <button className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-white rounded-lg transition-colors">
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HREmployeeHygine;