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

// Dummy chart data
const barChartData = {
  labels: [
    "Jan", "Feb", "March", "April", "May", "June",
    "July", "Aug", "Sept", "Oct", "Nov", "Dec",
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

// Dummy table data
const tableData = [
  { agent: "Avinash", clients: 10, revenue: "8,333" },
  { agent: "Avinash", clients: 15, revenue: "8,333" },
  { agent: "Avinash", clients: 50, revenue: "8,333" },
  { agent: "Avinash", clients: 100, revenue: "8,333" },
  { agent: "Avinash", clients: 150, revenue: "8,333" },
  { agent: "Avinash", clients: 152, revenue: "8,333" },
  { agent: "Avinash", clients: 5, revenue: "8,333" },
  { agent: "Avinash", clients: 500, revenue: "8,333" },
  { agent: "Avinash", clients: 700, revenue: "8,333" },
  { agent: "Avinash", clients: 750, revenue: "8,333" },
  { agent: "Avinash", clients: 300, revenue: "8,333" },
  { agent: "Avinash", clients: 50, revenue: "8,333" },
];

const TeamLeaderDashboard = () => {
  return (
    <div className="p-6">
      {/* Bar Chart */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex justify-end gap-2 mb-4">
          <button className="px-4 py-1 rounded-full border border-blue-500 text-blue-500">Monthly</button>
          <button className="px-4 py-1 rounded-full bg-blue-500 text-white">Yearly</button>
        </div>
        <Bar data={barChartData} options={barOptions} />
      </div>

      {/* Team Leader Cards */}
      <div className="grid sm:grid-cols-3 gap-6 mb-6">
        <div className="bg-blue-500 text-white rounded-2xl p-6 flex flex-col items-center shadow-md">
          <img
            src="https://randomuser.me/api/portraits/men/30.jpg"
            alt="Troy"
            className="w-24 h-24 rounded-full object-cover mb-4"
          />
          <h2 className="text-xl font-semibold">Troy</h2>
          <p className="text-sm">Team Leader</p>
          <p className="text-2xl font-bold mt-2">$50,000</p>
        </div>
        <div className="bg-white text-gray-800 rounded-2xl p-6 flex flex-col items-center shadow-md">
          <img
            src="https://randomuser.me/api/portraits/men/45.jpg"
            alt="Edward"
            className="w-24 h-24 rounded-full object-cover mb-4"
          />
          <h2 className="text-xl font-semibold">Edward</h2>
          <p className="text-sm">Team Leader</p>
          <p className="text-2xl font-bold mt-2">$50,000</p>
        </div>
      </div>

      {/* Revenue Table */}
      <div className="bg-white rounded-xl shadow-md p-6 overflow-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="text-gray-700 border-b">
            <tr>
              <th className="p-2">Agent Under</th>
              <th className="p-2">No. of Clients</th>
              <th className="p-2">Total Revenue</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {tableData.map((row, i) => (
              <tr key={i} className="border-b">
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

export default TeamLeaderDashboard;
