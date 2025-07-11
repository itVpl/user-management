import React,{useState} from "react";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// Chart Data

const barData = {
  labels: [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ],
  datasets: [
    {
      label: "Revenue in ₹",
      data: [5000, 8000, 12000, 18000, 25000, 30000, 37000, 45000, 52000, 60000, 65000, 70000],
      backgroundColor: [
        "#60a5fa", "#60a5fa", "#60a5fa", "#60a5fa", "#3b82f6", "#3b82f6",
        "#3b82f6", "#2563eb", "#2563eb", "#1d4ed8", "#1d4ed8", "#1e40af"
      ],
    },
  ],
};

const barOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: function (context) {
          return `₹${context.raw.toLocaleString()}`;
        },
      },
    },
  },
  scales: {
    y: {
      ticks: {
        callback: function (value) {
          return "$" + value / 1000 + "k";
        },
      },
      beginAtZero: true,
    },
    x: {
      title: {
        display: true,
        text: "Months",
      },
    },
  },
};

// Table data
const agentData = Array(12).fill({
  agentName: "Avinash",
  agentId: "VPL050",
  tlName: "Troy",
  managerName: "Eastern",
  revenue: "$45,000",
});

const AgentView = () => {

  return (
    <div className="p-6">
   
      {/* Chart Section */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex justify-end gap-2 mb-4">
          <button className="px-4 py-1 rounded-full border border-blue-500 text-blue-500">
            Monthly
          </button>
          <button className="px-4 py-1 rounded-full bg-blue-500 text-white">
            Yearly
          </button>
        </div>
        <Bar data={barData} options={barOptions} />
      </div>

      {/* Table Section */}
      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-md p-6 overflow-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="text-gray-700 border-b">
                <tr>
                  <th className="p-2 text-blue-600">Agent Name</th>
                  <th className="p-2 text-blue-600">Agent ID</th>
                  <th className="p-2 text-blue-600">TL Name</th>
                  <th className="p-2 text-blue-600">Manager Name</th>
                  <th className="p-2 text-blue-600">Revenue Generated</th>
                </tr>
              </thead>
              <tbody>
                {agentData.map((row, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2">{row.agentName}</td>
                    <td className="p-2">{row.agentId}</td>
                    <td className="p-2">{row.tlName}</td>
                    <td className="p-2">{row.managerName}</td>
                    <td className="p-2">{row.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
                  
      
          </div>
        </div>

        {/* Role Switcher */}
      </div>
    </div>
  );
};

export default AgentView;
