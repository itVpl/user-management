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

// Chart Data
const chartData = {
  labels: [
    "Jan", "Feb", "March", "April", "May", "June",
    "July", "Aug", "Sept", "Oct", "Nov", "Dec",
  ],
  datasets: [
    {
      label: "Carriers Added",
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

// Carrier Data
const carrierList = [
  { id: "VPL001", name: "Avinash", truckerId: "TID568", type: "Carrier", city: "Paris", fleet: "Flatbad", size: 500, date: "02-Jan-2025", status: "Pending" },
  { id: "VPL005", name: "Kartik", truckerId: "TID789", type: "Carrier", city: "Tokyo", fleet: "Flatbad", size: 10, date: "05-Jan-2025", status: "Approved" },
  { id: "VPL008", name: "Joy", truckerId: "SID123", type: "Carrier", city: "London", fleet: "Flatbad", size: 15, date: "07-Jan-2025", status: "Approved" },
  { id: "VPL008", name: "Steve", truckerId: "SID555", type: "Carrier", city: "Rome", fleet: "Flatbad", size: 1500, date: "10-Jan-2025", status: "Approved" },
  { id: "VPL010", name: "Roddie", truckerId: "SID235", type: "Carrier", city: "Wellington", fleet: "Flatbad", size: 100, date: "10-Jan-2025", status: "Approved" },
  { id: "VPL021", name: "Ebin", truckerId: "TID598", type: "Carrier", city: "Barcelona", fleet: "Flatbad", size: 100, date: "10-Jan-2025", status: "Approved" },
  { id: "VPL050", name: "Edward", truckerId: "TID789", type: "Carrier", city: "Amsterdam", fleet: "Flatbad", size: 5, date: "10-Jan-2025", status: "Approved" },
  { id: "VPL040", name: "Rommie", truckerId: "TID777", type: "Carrier", city: "Berlin", fleet: "Flatbad", size: 10, date: "10-Jan-2025", status: "Approved" },
  { id: "VPL030", name: "Thomas", truckerId: "TID778", type: "Carrier", city: "Madrid", fleet: "Flatbad", size: 50, date: "14-Jan-2025", status: "Approved" },
  { id: "VPL015", name: "James", truckerId: "TID896", type: "Carrier", city: "Vienna", fleet: "Flatbad", size: 70, date: "15-Jan-2025", status: "Approved" },
  { id: "VPL032", name: "William", truckerId: "SID635", type: "Carrier", city: "Dublin", fleet: "Flatbad", size: 80, date: "16-Jan-2025", status: "Approved" },
  { id: "VPL042", name: "George", truckerId: "SID687", type: "Carrier", city: "Singapore", fleet: "Flatbad", size: 1, date: "19-Jan-2025", status: "Approved" },
];

// Status colors
const statusColors = {
  Approved: "bg-green-500",
  Pending: "bg-yellow-400",
};

const CarrierAdded = () => {
  return (
    <div className="p-6">
      {/* Chart */}
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

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md p-6 overflow-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="text-blue-600 border-b">
            <tr>
              <th className="p-2">Agent ID</th>
              <th className="p-2">Trucker Name</th>
              <th className="p-2">Trucker ID</th>
              <th className="p-2">Customer Type</th>
              <th className="p-2">City</th>
              <th className="p-2">Fleet Type</th>
              <th className="p-2">Fleet Size</th>
              <th className="p-2">Dates of addition</th>
              <th className="p-2">Verification</th>
            </tr>
          </thead>
          <tbody>
            {carrierList.map((item, index) => (
              <tr key={index} className="border-b">
                <td className="p-2">{item.id}</td>
                <td className="p-2">{item.name}</td>
                <td className="p-2">{item.truckerId}</td>
                <td className="p-2">{item.type}</td>
                <td className="p-2">{item.city}</td>
                <td className="p-2">{item.fleet}</td>
                <td className="p-2">{item.size}</td>
                <td className="p-2">{item.date}</td>
                <td className="p-2">
                  <span className={`text-white text-xs px-3 py-1 rounded-full ${statusColors[item.status] || "bg-gray-400"}`}>
                    {item.status}
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

export default CarrierAdded;
