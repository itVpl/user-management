import React, { useState } from "react";
import axios from "axios";

const UserPermission = () => {
  const [searchInput, setSearchInput] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [modules, setModules] = useState([]);

  // 🔍 Search employee by empId
  const handleSearch = async () => {
  const token =
    sessionStorage.getItem("authToken") || localStorage.getItem("authToken");

  if (!searchInput.trim()) {
    alert("Please enter Employee ID or Name");
    return;
  }

  try {
    // Fetch all employees
    const res = await axios.get("https://vpl-liveproject-1.onrender.com/api/v1/inhouseUser", {
      headers: { Authorization: `Bearer ${token}` },
      withCredentials: true,
    });

    const allEmployees = res.data.employees || [];

    // Normalize input (case-insensitive)
    const input = searchInput.trim().toLowerCase();

    // Match by empId or name
    const matched = allEmployees.find(
      (emp) =>
        emp.empId.toLowerCase() === input ||
        emp.employeeName.toLowerCase().includes(input)
    );

    if (matched) {
      setSelectedEmployee(matched);
      fetchModuleDetails(matched.allowedModules);
    } else {
      alert("No matching employee found.");
    }
  } catch (error) {
    console.error("❌ Error searching employees:", error);
    alert("Something went wrong.");
  }
};

  // 🔁 Fetch all modules and filter by allowedModules
const fetchModuleDetails = async (allowedModuleIds) => {
  const token =
    sessionStorage.getItem("authToken") || localStorage.getItem("authToken");

  try {
    const res = await axios.get(
      `https://vpl-liveproject-1.onrender.com/api/v1/module`,
      {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      }
    );

    if (res.data.success) {
      const allModules = res.data.modules;
      console.log("✅ Fetched all modules:", allModules);
      // ✅ Annotate all modules with isActive based on employee's allowedModules
      const mergedModules = allModules.map((mod) => ({
        _id: mod._id,
        label: mod.label,
        isActive: allowedModuleIds.includes(mod._id),
      
      }));

      console.log("✅ Merged modules with status:", mergedModules);
      setModules(mergedModules);
    }
  } catch (error) {
    console.error("❌ Error fetching module list:", error);
    alert("Could not fetch module list.");
  }
};

  // 🔄 Toggle status for selected employee
const handleToggle = async (moduleId, currentStatus) => {
  const token =
    sessionStorage.getItem("authToken") || localStorage.getItem("authToken");

  if (!selectedEmployee || !selectedEmployee.empId) {
    alert("Please select an employee first.");
    return;
  }

  const empId = String(selectedEmployee.empId); // ✅ Always string

const url = currentStatus
  ? `https://vpl-liveproject-1.onrender.com/api/v1/inhouseUser/unassign-modules/${empId}`
  : `https://vpl-liveproject-1.onrender.com/api/v1/inhouseUser/assign-modules/${empId}`;

  const action = currentStatus ? "deactivate" : "activate";

  const payload = {
    moduleIds: [moduleId],
  };

  console.log("🔁 Trying to", action, "module:", moduleId);
  console.log("➡️ URL:", url);
  console.log("➡️ Payload:", payload);

  try {
    const res = await axios.patch(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      withCredentials: true,
    });

    if (res.data.success) {
      setModules((prev) =>
        prev.map((mod) =>
          mod._id === moduleId ? { ...mod, isActive: !currentStatus } : mod
        )
      );
      console.log(`✅ Module ${action}d successfully`);
    } else {
      alert(`Failed to ${action} module`);
    }
  } catch (error) {
    console.error(`❌ Error trying to ${action} module:`, error);
    alert("Something went wrong.");
  }
};

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Employee Module Permission</h1>

      {/* Search Input */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Enter Employee ID (e.g., 1234)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md w-1/3"
        />
        <button
          onClick={handleSearch}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md cursor-pointer transition-colors"
        >
          Access
        </button>
      </div>

      {/* Employee Info */}
      {selectedEmployee && (
        <div className="mb-4 bg-gray-100 p-4 rounded-md">
          <p><strong>Name:</strong> {selectedEmployee.employeeName}</p>
          <p><strong>Department:</strong> {selectedEmployee.department}</p>
          <p><strong>Designation:</strong> {selectedEmployee.designation}</p>
          <p><strong>Role:</strong> {selectedEmployee.role}</p>
        </div>
      )}

      {/* Modules Table */}
      {modules.length > 0 && (
        <div className="bg-white shadow rounded-lg p-4 overflow-auto">
          <table className="w-full table-auto text-left">
            <thead className="bg-blue-100 text-gray-700">
              <tr>
                <th className="p-3">Module Name</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((mod) => (
                <tr key={mod._id} className="border-b">
                  <td className="p-3">{mod.label}</td>
                  <td className="p-3 text-center">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={mod.isActive}
                        onChange={() => handleToggle(mod._id, mod.isActive)}
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-checked:bg-green-500 rounded-full relative after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-full"></div>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UserPermission;
