import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// Bar Chart Data
const barChartData = {
  labels: [
    "Jan", "Feb", "March", "April", "May", "Jun",
    "July", "Aug", "Sept", "Oct", "Nov", "Dec"
  ],
  datasets: [
    {
      label: "Revenue",
      data: [0, 30, 36, 30, 40, 50, 30, 30, 60, 70, 60, 70],
      backgroundColor: "#3b82f6",
    },
  ],
};

const barOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context) => `₹${context.raw}K`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: function (value) {
          return "$" + value + "K";
        },
      },
    },
  },
};

const tableData = [
  { tl: "Troy", agent: "Avinash", clients: 10, revenue: "8,333" },
  { tl: "Troy", agent: "Avinash", clients: 15, revenue: "8,333" },
  { tl: "Troy", agent: "Avinash", clients: 50, revenue: "8,333" },
  { tl: "Troy", agent: "Avinash", clients: 100, revenue: "8,333" },
  { tl: "Troy", agent: "Avinash", clients: 150, revenue: "8,333" },
  { tl: "Troy", agent: "Avinash", clients: 152, revenue: "8,333" },
  { tl: "Troy", agent: "Avinash", clients: 5, revenue: "8,333" },
  { tl: "Troy", agent: "Avinash", clients: 500, revenue: "8,333" },
  { tl: "Troy", agent: "Avinash", clients: 700, revenue: "8,333" },
  { tl: "Troy", agent: "Avinash", clients: 750, revenue: "8,333" },
  { tl: "Troy", agent: "Avinash", clients: 300, revenue: "8,333" },
  { tl: "Troy", agent: "Avinash", clients: 50, revenue: "8,333" },
];

const ManagerView = () => {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* Bar Chart Box */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="flex justify-end gap-2 mb-4">
          <button className="px-4 py-1 rounded-full border border-blue-500 text-blue-500">Monthly</button>
          <button className="px-4 py-1 rounded-full bg-blue-500 text-white">Yearly</button>
        </div>
        <Bar data={barChartData} options={barOptions} />
      </div>

      {/* Manager Info */}
      <div className="flex flex-wrap gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-md p-6 flex-1 flex items-center gap-6 min-w-[350px]">
          <img
            src="https://randomuser.me/api/portraits/men/32.jpg"
            alt="Manager"
            className="w-28 h-28 rounded-full object-cover"
          />
          <div>
            <p className="text-gray-600 text-lg">Eastern</p>
            <h2 className="text-xl font-bold mb-2">Manager</h2>
            <p className="text-3xl font-bold text-gray-800">$1,00,000</p>
            <p className="text-sm text-gray-500">Revenue</p>
          </div>
        </div>
      </div>

      {/* Revenue Table */}
      <div className="bg-white rounded-xl shadow-md p-6 overflow-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="text-gray-700 border-b">
            <tr>
              <th className="p-2">TL</th>
              <th className="p-2">Agent Under</th>
              <th className="p-2">No. of Clients</th>
              <th className="p-2">Total Revenue</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {tableData.map((row, i) => (
              <tr key={i} className="border-b">
                <td className="p-2">{row.tl}</td>
                <td className="p-2">{row.agent}</td>
                <td className="p-2">{row.clients}</td>
                <td className="p-2">{row.revenue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManagerView;
