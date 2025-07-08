import React, { useState } from "react";

const DocumentsVerification = () => {
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const employees = [
    {
      id: "VPL001",
      name: "Dhruv",
      date: "17-06-2025",
      status: "Pending",
      verifiedBy: "HR Nupur",
    },
    {
      id: "VPL002",
      name: "Troy",
      date: "16-06-2025",
      status: "Rejected",
      verifiedBy: "HR Nupur",
    },
    {
      id: "VPL003",
      name: "Eastern",
      date: "17-06-2025",
      status: "Approved",
      verifiedBy: "HR Nupur",
    },
  ];

  const statusStyles = {
    Pending: "bg-yellow-400 text-black",
    Rejected: "bg-red-500 text-white",
    Approved: "bg-green-600 text-white",
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Documents Verification</h1>

      {/* Table */}
      <table className="w-full bg-white shadow-md rounded-md overflow-hidden">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="p-3">Employee ID</th>
            <th className="p-3">Employee Name</th>
            <th className="p-3">Uploaded Date</th>
            <th className="p-3">Status</th>
            <th className="p-3">Verified By</th>
            <th className="p-3">Uploaded File</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => (
            <tr key={emp.id} className="border-t">
              <td className="p-3">{emp.id}</td>
              <td className="p-3">{emp.name}</td>
              <td className="p-3">{emp.date}</td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded ${statusStyles[emp.status]}`}>
                  {emp.status}
                </span>
              </td>
              <td className="p-3">{emp.verifiedBy}</td>
              <td className="p-3">
                <button
                  onClick={() => setSelectedEmployee(emp)}
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  Preview
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 w-[90%] max-w-6xl relative">
            <button
              className="absolute top-2 right-4 text-xl font-bold"
              onClick={() => setSelectedEmployee(null)}
            >
              ✕
            </button>
            <h2 className="text-xl font-bold mb-4">Personal Details</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><strong>Employee ID:</strong> {selectedEmployee.id}</div>
              <div><strong>Name:</strong> {selectedEmployee.name}</div>
              <div><strong>Department:</strong> Sales</div>
              <div><strong>Designation:</strong> Manager/Sales</div>
              <div><strong>Date of Joining:</strong> 01/01/2023</div>
              <div><strong>Sex:</strong> Male</div>
              <div><strong>Account Holder:</strong> Troy Smith</div>
              <div><strong>Account No:</strong> 587412365478</div>
              <div><strong>Email:</strong> Troy234@vpower.com</div>
              <div><strong>Password:</strong> Troy@548*#</div>
              <div><strong>Mobile:</strong> 9852136547</div>
              <div><strong>Emergency:</strong> 8523697453</div>
            </div>

            <h3 className="text-lg font-semibold mb-2">Documents</h3>
            <div className="flex flex-wrap gap-3 mb-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-32 h-20 bg-gray-200 flex items-center justify-center text-sm">
                  Doc {i + 1}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-4">
              <button className="bg-red-500 text-white px-4 py-2 rounded">Reject</button>
              <button className="bg-green-600 text-white px-4 py-2 rounded">Approve</button>
              <button className="bg-blue-500 text-white px-4 py-2 rounded">Download</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsVerification;
