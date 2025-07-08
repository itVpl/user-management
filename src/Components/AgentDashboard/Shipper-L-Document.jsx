import React from "react";

const statusStyles = {
  "": "bg-gray-200 text-gray-600",
  Rejected: "bg-red-500 text-white",
  "Re-submit": "bg-blue-500 text-white",
  Approved: "bg-green-600 text-white",
};

const data = [
  { date: "25-06-2025", loadId: "L00331", status: "" },
  { date: "25-06-2025", loadId: "L00331", status: "Rejected" },
  { date: "25-06-2025", loadId: "L00331", status: "Re-submit" },
  { date: "25-06-2025", loadId: "L00331", status: "Approved" },
  { date: "25-06-2025", loadId: "L00331", status: "Approved" },
  { date: "25-06-2025", loadId: "L00331", status: "Approved" },
  { date: "25-06-2025", loadId: "L00331", status: "Approved" },
];

const ShippersLDocuments = () => {
  return (
    <div className="bg-white rounded-lg p-4 shadow-md mt-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border">
          <thead className="text-xs text-gray-600 uppercase bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Load ID</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">{row.date}</td>
                <td className="px-4 py-3">{row.loadId}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      statusStyles[row.status]
                    }`}
                  >
                    {row.status || "-"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button className="bg-gray-300 text-gray-700 px-3 py-1 rounded shadow-sm hover:bg-gray-400 text-xs">
                    View
                  </button>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    placeholder="Comment"
                    className="border border-gray-300 text-xs px-2 py-1 rounded w-full"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ShippersLDocuments;
