import React, { useState } from "react";

const tabs = ["Calling Reports", "Daily Targets", "Shipper Load Data", "Hygiene"];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("Calling Reports");

  return (
    <div className="p-4">
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full border ${
              activeTab === tab ? "bg-blue-500 text-white" : "bg-white text-black"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Calling Reports" && <CallingReports />}
      {activeTab === "Daily Targets" && <DailyTargets />}
      {activeTab === "Shipper Load Data" && <ShipperLoadData />}
      {activeTab === "Hygiene" && <Hygiene />}
    </div>
  );
}

const CallingReports = () => (
  <div className="flex flex-row lg:flex-row lg:items-start gap-6">
    {/* Table Section */}
    <div className="overflow-x-auto bg-white rounded-lg shadow w-full lg:w-[75%]">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100 text-left">
          <tr>
            {["Date", "Called No", "Call Time", "Call Duration", "Call Status", "Conversion Status"].map((h) => (
              <th key={h} className="px-4 py-2 font-semibold text-gray-600">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 12 }).map((_, i) => (
            <tr key={i} className="border-t">
              <td className="px-4 py-2">16-06-2025</td>
              <td className="px-4 py-2">+91-98765432{10 + i}</td>
              <td className="px-4 py-2">11:15 AM</td>
              <td className="px-4 py-2">00:03:42</td>
              <td className="px-4 py-2">Connected</td>
              <td className="px-4 py-2">{i % 2 === 0 ? "Open" : "Converted"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Target Section */}
    <div className="bg-white rounded-lg shadow p-6 w-[30%] lg:w-[50%] h-[300px] flex flex-col items-center justify-center">
      <h2 className="text-xl font-bold mb-4">Target</h2>
      <div className="relative w-40 h-40">
        <svg className="transform -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-gray-300"
            strokeWidth="4"
            stroke="currentColor"
            fill="none"
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className="text-green-500"
            strokeWidth="4.5"
            strokeDasharray="90, 100"
            stroke="currentColor"
            fill="none"
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">90%</span>
          <span className="text-base font-medium">90 /100</span>
        </div>
      </div>
    </div>
  </div>
);

const DailyTargets = () => (
  <div className="overflow-x-auto bg-white rounded-lg shadow">
    <table className="min-w-full text-sm">
      <thead className="bg-gray-100 text-left">
        <tr>
          {"Employee Name Employee ID Role Target No. Status".split(" ").map((h) => (
            <th key={h} className="px-4 py-2 font-medium text-gray-600">
              {h.replace("No.", "Target No.")}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[
          ["Hardy", "VPL002", "Executive", "3000", "Completed"],
          ["Shaggy", "VPL003", "Executive", "2500", "Not-Completed"],
          ["Luna", "VPL004", "Executive", "3000", "Completed"],
        ].map(([name, id, role, target, status]) => (
          <tr key={id} className="border-t">
            <td className="px-4 py-2">{name}</td>
            <td className="px-4 py-2">{id}</td>
            <td className="px-4 py-2">{role}</td>
            <td className="px-4 py-2">{target}</td>
            <td className="px-4 py-2">{status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ShipperLoadData = () => (
  <div className="overflow-x-auto bg-white rounded-lg shadow">
    <table className="min-w-full text-sm">
      <thead className="bg-gray-100 text-left">
        <tr>
          {"Agent ID Shipper ID Load ID Weight Vehicle From To Pick-up Date Status".split(" ").map((h) => (
            <th key={h} className="px-4 py-2 font-medium text-gray-600">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[
          ["VPL001", "CNU1234567", "L00331", "300Lbs", "Flatbed", "Jaipur", "Himachal", "Flatbed", "Pending"],
          ["VPL001", "CNU1234567", "L00331", "300Lbs", "Flatbed", "Norway", "Edenberg", "Flatbed", "Assigned"],
          ["VPL001", "CNU1234567", "L00331", "300Lbs", "Flatbed", "Sri Lanka", "Nepal", "Flatbed", "Posted"],
          ["VPL003", "CNU1234567", "L00331", "300Lbs", "Flatbed", "Nepal", "Srinagar", "Flatbed", "In-Route"],
          ["VPL004", "CNU1234567", "L00331", "300Lbs", "Flatbed", "Zibi", "Delhi", "Flatbed", "Delivered"],
          ["VPL004", "CNU1234567", "L00331", "300Lbs", "Flatbed", "Kolkata", "Gurugram", "Flatbed", "Delivered"],
          ["VPL003", "CNU1234567", "L00331", "300Lbs", "Flatbed", "Chandigarh", "Toronto", "Flatbed", "Delivered"],
          ["VPL001", "CNU1234567", "L00331", "300Lbs", "Flatbed", "Edenberg", "Nepal", "Flatbed", "Delivered"],
        ].map((row, idx) => (
          <tr key={idx} className="border-t">
            {row.map((cell, i) => (
              <td
                key={i}
                className={`px-4 py-2 ${
                  i === 8 && cell === "Delivered" ? "text-green-600 font-semibold" : ""
                }`}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Hygiene = () => (
  <div className="overflow-x-auto bg-white rounded-lg shadow">
    <table className="min-w-full text-sm">
      <thead className="bg-blue-100 text-left">
        <tr>
          {"Employee Name Employee ID Role Department Status".split(" ").map((h) => (
            <th key={h} className="px-4 py-2 font-medium text-gray-600">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[
          ["Joseph", "VPL001", "Admin", "Sales", "Maintained"],
          ["Hardy", "VPL002", "Admin", "Sales", "No-Maintained"],
          ["Eastern", "VPL003", "Admin", "Sales", "Maintained"],
        ].map(([name, id, role, dept, status]) => (
          <tr key={id} className="border-t">
            <td className="px-4 py-2">{name}</td>
            <td className="px-4 py-2">{id}</td>
            <td className="px-4 py-2">{role}</td>
            <td className="px-4 py-2">{dept}</td>
            <td className="px-4 py-2">{status}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <div className="mt-2 text-sm text-gray-500 text-right pr-4">Showing 3 to 3 of 03 entries</div>
  </div>
);
