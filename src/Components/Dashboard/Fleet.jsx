import React from "react";

const fleets = [
  { id: "TID568", name: "Aged-mens logistics", city: "Paris", agent: "VPL001", type: "Flatbad", size: 500 },
  { id: "TID789", name: "James Exporters", city: "Tokyo", agent: "VPL005", type: "Flatbad", size: 10 },
  { id: "TID123", name: "SwiftShip Logistics", city: "London", agent: "VPL008", type: "Flatbad", size: 15 },
  { id: "TID555", name: "TransGlobal Expressways", city: "Rome", agent: "VPL008", type: "Flatbad", size: 1500 },
  { id: "TID235", name: "BlueCrate Shipping Co", city: "Wellington", agent: "VPL010", type: "Flatbad", size: 100 },
  { id: "TID598", name: "Vertex Freight Systems", city: "Barcelona", agent: "VPL021", type: "Flatbad", size: 100 },
  { id: "TID789", name: "ApexLine Logistics", city: "Amsterdam", agent: "VPL050", type: "Flatbad", size: 5 },
  { id: "TID777", name: "OceanAxis Carriers", city: "Berlin", agent: "VPL040", type: "Flatbad", size: 10 },
  { id: "TID778", name: "SkyPort Freight Solutions", city: "Madrid", agent: "VPL030", type: "Flatbad", size: 50 },
  { id: "TID896", name: "CargoSphere Worldwide", city: "Vienna", agent: "VPL015", type: "Flatbad", size: 70 },
  { id: "TID635", name: "IronBridge Carriers", city: "Dublin", agent: "VPL032", type: "Flatbad", size: 80 },
  { id: "TID587", name: "NovaMarine Logistics", city: "Singapore", agent: "VPL042", type: "Flatbad", size: 1 },
];

const FleetTable = () => {
  const totalFleetSize = fleets.reduce((sum, item) => sum + item.size, 0);

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden mx-4 my-8">
      <table className="min-w-full text-left text-sm font-light">
        <thead className="bg-gray-100 text-blue-600 font-semibold">
          <tr>
            <th className="px-4 py-3">Trucker ID</th>
            <th className="px-4 py-3">Trucker name</th>
            <th className="px-4 py-3">City</th>
            <th className="px-4 py-3">Agent ID</th>
            <th className="px-4 py-3">Fleet Type</th>
            <th className="px-4 py-3">Fleet Size</th>
          </tr>
        </thead>
        <tbody className="text-gray-700">
          {fleets.map((fleet, index) => (
            <tr key={index} className="border-b hover:bg-gray-50">
              <td className="px-4 py-2">{fleet.id}</td>
              <td className="px-4 py-2">{fleet.name}</td>
              <td className="px-4 py-2">{fleet.city}</td>
              <td className="px-4 py-2 font-bold text-blue-800">{fleet.agent}</td>
              <td className="px-4 py-2">{fleet.type}</td>
              <td className="px-4 py-2">{fleet.size.toString().padStart(2, '0')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-center py-6">
        <h2 className="text-2xl font-bold text-black">Total Fleets – {totalFleetSize.toLocaleString()}</h2>
      </div>
    </div>
  );
};

export default FleetTable;
