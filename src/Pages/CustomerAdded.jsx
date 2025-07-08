import React from "react";
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

// Chart data
const chartData = {
  labels: [
    "Jan", "Feb", "March", "April", "May", "June",
    "July", "Aug", "Sept", "Oct", "Nov", "Dec"
  ],
  datasets: [
    {
      label: "Customers Added",
      data: [20, 40, 50, 30, 60, 40, 70, 70, 70, 60, 70, 70],
      backgroundColor: "#3b82f6",
    },
  ],
};

const chartOptions = {
  responsive: true,
  scales: {
    y: {
      beginAtZero: true,
    },
  },
};

// Table data
const customers = [
  { id: "VPL001", name: "Avinash", custId: "TID568", type: "Trucker", date: "02-Jan-2025", status: "Pending" },
  { id: "VPL005", name: "Kartik", custId: "TID789", type: "Trucker", date: "05-Jan-2025", status: "Approved" },
  { id: "VPL008", name: "Joy", custId: "SID123", type: "Shipper", date: "07-Jan-2025", status: "Pre-Pay" },
  { id: "VPL008", name: "Steve", custId: "SID555", type: "Shipper", date: "10-Jan-2025", status: "Approved" },
  { id: "VPL010", name: "Roddie", custId: "SID235", type: "Shipper", date: "10-Jan-2025", status: "Approved" },
  { id: "VPL021", name: "Ebin", custId: "TID598", type: "Trucker", date: "10-Jan-2025", status: "Approved" },
  { id: "VPL050", name: "Edward", custId: "TID789", type: "Trucker", date: "10-Jan-2025", status: "Approved" },
  { id: "VPL040", name: "Rommie", custId: "TID777", type: "Trucker", date: "10-Jan-2025", status: "Approved" },
  { id: "VPL030", name: "Thomas", custId: "TID778", type: "Trucker", date: "14-Jan-2025", status: "Approved" },
  { id: "VPL015", name: "James", custId: "TID896", type: "Trucker", date: "15-Jan-2025", status: "Approved" },
  { id: "VPL032", name: "William", custId: "SID635", type: "Shipper", date: "16-Jan-2025", status: "Approved" },
  { id: "VPL042", name: "George", custId: "SID687", type: "Shipper", date: "19-Jan-2025", status: "Approved" },
];

// Helper to color status badges
const statusColor = {
  Approved: "bg-green-500",
  Pending: "bg-yellow-400",
  "Pre-Pay": "bg-blue-400",
};

const CustomerAdded = () => {
  return (
    <div className="p-6">
      {/* Chart Section */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex justify-end gap-2 mb-4">
          <button className="px-4 py-1 rounded-full border border-blue-500 text-blue-500">Monthly</button>
          <button className="px-4 py-1 rounded-full bg-blue-500 text-white">Yearly</button>
        </div>
        <Bar data={chartData} options={chartOptions} />
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-md p-6 overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="text-blue-600 border-b">
            <tr>
              <th className="p-2">Agent ID</th>
              <th className="p-2">Customer Name</th>
              <th className="p-2">Customer ID</th>
              <th className="p-2">Customer Type</th>
              <th className="p-2">Dates of addition</th>
              <th className="p-2">Verification</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c, i) => (
              <tr key={i} className="border-b">
                <td className="p-2">{c.id}</td>
                <td className="p-2">{c.name}</td>
                <td className="p-2">{c.custId}</td>
                <td className="p-2">{c.type}</td>
                <td className="p-2">{c.date}</td>
                <td className="p-2">
                  <span
                    className={`text-white text-xs px-3 py-1 rounded-full ${statusColor[c.status] || "bg-gray-400"}`}
                  >
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerAdded;
