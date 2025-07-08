import React, { useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// Chart Data
const chartData = {
  labels: [
    "Jan", "Feb", "March", "April", "May", "June",
    "July", "Aug", "Sept", "Oct", "Nov", "Dec"
  ],
  datasets: [
    {
      label: "Calls",
      data: [20, 40, 50, 30, 60, 40, 70, 70, 70, 60, 70, 70],
      backgroundColor: "#3b82f6",
    },
  ],
};

const chartOptions = {
  responsive: true,
  scales: {
    y: { beginAtZero: true },
  },
};

// Dummy Call Report Data
const callData = [
  { name: "Avinash", role: "Agent", total: 3000, answered: 2500, missed: 500, duration: "02min, 05secs" },
  { name: "Kartik", role: "Agent", total: 500, answered: 300, missed: 200, duration: "02min, 05secs" },
  { name: "Joy", role: "Agent", total: 350, answered: 300, missed: 50, duration: "02min, 05secs" },
  { name: "Steve", role: "Agent", total: 256, answered: 256, missed: 0, duration: "02min, 05secs" },
  { name: "Roddie", role: "Agent", total: 789, answered: 500, missed: 289, duration: "02min, 05secs" },
  { name: "Ebin", role: "Agent", total: 2589, answered: 2000, missed: 589, duration: "02min, 05secs" },
  { name: "Edward", role: "Agent", total: 7852, answered: 3000, missed: 4852, duration: "02min, 05secs" },
  { name: "Rommie", role: "Agent", total: 5689, answered: 5000, missed: 689, duration: "02min, 05secs" },
  { name: "Thomas", role: "Agent", total: 8892, answered: 3000, missed: 5892, duration: "02min, 05secs" },
  { name: "James", role: "Agent", total: 3265, answered: 1500, missed: 1765, duration: "02min, 05secs" },
  { name: "William", role: "Agent", total: 357, answered: 250, missed: 107, duration: "02min, 05secs" },
  { name: "George", role: "Agent", total: 6000, answered: 3500, missed: 2500, duration: "02min, 05secs" },
];

const CallingReport = () => {
  const [activeRole, setActiveRole] = useState("Agents");

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
        <Bar data={chartData} options={chartOptions} />
      </div>

      {/* Toggle Buttons */}
      <div className="flex justify-center gap-4 mb-4">
        {["Agents", "Manager", "Team Leaders"].map((role) => (
          <button
            key={role}
            onClick={() => setActiveRole(role)}
            className={`px-4 py-1 rounded-full border ${
              activeRole === role
                ? "bg-blue-500 text-white"
                : "border-blue-500 text-blue-500"
            }`}
          >
            {role}
          </button>
        ))}
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-md p-6 overflow-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="text-blue-600 border-b">
            <tr>
              <th className="p-2">Name</th>
              <th className="p-2">Designation</th>
              <th className="p-2">Total Calls</th>
              <th className="p-2">Answered Calls</th>
              <th className="p-2">Non-Answered Calls</th>
              <th className="p-2">Average Durations</th>
            </tr>
          </thead>
          <tbody>
            {callData.map((c, i) => (
              <tr key={i} className="border-b">
                <td className="p-2">{c.name}</td>
                <td className="p-2">{c.role}</td>
                <td className="p-2">{c.total}</td>
                <td className="p-2">{c.answered}</td>
                <td className="p-2">{c.missed}</td>
                <td className="p-2">{c.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CallingReport;
