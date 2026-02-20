import React from 'react';

const StatisticsCard = ({ title, value, icon: Icon, color, subtitle, trend, trendValue }) => {
  const colorClasses = {
    blue: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200',
    green: 'bg-gradient-to-br from-green-50 to-green-100 border-green-200',
    yellow: 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200',
    red: 'bg-gradient-to-br from-red-50 to-red-100 border-red-200',
    purple: 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200',
  };

  const iconColorClasses = {
    blue: 'text-blue-500',
    green: 'text-green-500',
    yellow: 'text-yellow-500',
    red: 'text-red-500',
    purple: 'text-purple-500',
  };

  const textColorClasses = {
    blue: 'text-blue-600 text-blue-800',
    green: 'text-green-600 text-green-800',
    yellow: 'text-yellow-600 text-yellow-800',
    red: 'text-red-600 text-red-800',
    purple: 'text-purple-600 text-purple-800',
  };

  const bgColor = colorClasses[color] || colorClasses.blue;
  const iconColor = iconColorClasses[color] || iconColorClasses.blue;
  const [labelColor, valueColor] = (textColorClasses[color] || textColorClasses.blue).split(' ');

  return (
    <div className={`rounded-xl p-4 border ${bgColor}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm ${labelColor} font-medium`}>{subtitle || title}</p>
          <p className={`text-2xl font-bold ${valueColor} mt-1`}>{value?.toLocaleString() || 0}</p>
          {trend && trendValue && (
            <div className="flex items-center gap-1 mt-2">
              <svg className="w-4 h-4" fill="none" stroke="#00B69B" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="text-xs font-medium text-gray-600">
                <span style={{ color: '#00B69B' }}>{trendValue}</span>
              </span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`w-12 h-12 ${iconColor} flex items-center justify-center`}>
            <Icon size={32} />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatisticsCard;

