import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const data = [
  { month: 'Jan', revenue: 5000 },
  { month: 'Feb', revenue: 8000 },
  { month: 'Mar', revenue: 12000 },
  { month: 'Apr', revenue: 18000 },
  { month: 'May', revenue: 25000 },
  { month: 'Jun', revenue: 30000 },
  { month: 'Jul', revenue: 37000 },
  { month: 'Aug', revenue: 45000 },
  { month: 'Sep', revenue: 52000 },
  { month: 'Oct', revenue: 60000 },
  { month: 'Nov', revenue: 65000 },
  { month: 'Dec', revenue: 70000 },
];

const tableData = Array(13).fill({
  date: '24-06-2025',
  shipperId: 'VPL050',
  truckerId: 'T1006',
  serviceType: 'Drayage',
  revenue: '$45,000',
});

export default function AgentRevenueStatistics() {
  return (
    <div className="flex flex-col p-6 gap-6">
      {/* Chart Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Revenue Statistics</h2>
        <div className="space-x-2">
          <button className="px-4 py-1 rounded bg-gray-200">Monthly</button>
          <button className="px-4 py-1 rounded bg-white border">Yearly</button>
        </div>
      </div>

      {/* Bar Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="revenue" fill="#2D91F2" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm text-left">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="px-4 py-2 border">Date</th>
              <th className="px-4 py-2 border">Shipper ID</th>
              <th className="px-4 py-2 border">Trucker ID</th>
              <th className="px-4 py-2 border">Service Type</th>
              <th className="px-4 py-2 border">Revenue Generated</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((item, idx) => (
              <tr key={idx} className="even:bg-gray-50">
                <td className="px-4 py-2 border">{item.date}</td>
                <td className="px-4 py-2 border">{item.shipperId}</td>
                <td className="px-4 py-2 border">{item.truckerId}</td>
                <td className="px-4 py-2 border">{item.serviceType}</td>
                <td className="px-4 py-2 border">{item.revenue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total Revenue */}
      <div className="text-right text-xl font-bold mt-4">
        Total Monthly Revenue – 5,85,000
      </div>
    </div>
  );
}
