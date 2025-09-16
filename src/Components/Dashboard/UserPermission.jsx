import React, { useRef, useState } from "react";
import axios from "axios";
import API_CONFIG from "../../config/api.js";

const UserPermission = () => {
  const [empIdInput, setEmpIdInput] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [modules, setModules] = useState([]);
  const [feedback, setFeedback] = useState({ type: null, message: "" }); // type: 'error' | 'info' | null
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const token =
    sessionStorage.getItem("authToken") || localStorage.getItem("authToken");

  const showError = (msg) => setFeedback({ type: "error", message: msg });
  const clearFeedback = () => setFeedback({ type: null, message: "" });

  // 🔍 Search employee by empId (exact match, case-insensitive)
  const handleSearch = async () => {
    clearFeedback();
    setSelectedEmployee(null);
    setModules([]);

    const raw = empIdInput.trim();
    if (!raw) {
      showError("Please enter the employee id.");
      inputRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      // Fetch all employees
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/inhouseUser`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      const allEmployees = res?.data?.employees || [];
      const input = raw.toLowerCase();

      // Strictly match by empId only
      const matched = allEmployees.find(
        (emp) => String(emp.empId || "").toLowerCase() === input
      );

      if (!matched) {
        showError("Employee Not Found");
        inputRef.current?.focus();
        return;
      }

      setSelectedEmployee(matched);
      await fetchModuleDetails(matched.allowedModules || []);
      clearFeedback();
    } catch (err) {
      console.error("Error searching employees:", err);
      showError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // 🔁 Fetch all modules & mark isActive based on employee's allowedModules
  const fetchModuleDetails = async (allowedModuleIds) => {
    try {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/module`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      if (res?.data?.success) {
        const allModules = res.data.modules || [];
        const allowedSet = new Set((allowedModuleIds || []).map(String));

        const mergedModules = allModules.map((mod) => ({
          _id: mod._id,
          label: mod.label,
          isActive: allowedSet.has(String(mod._id)),
        }));

        setModules(mergedModules);
      } else {
        console.warn("Module list fetch returned success=false");
      }
    } catch (error) {
      console.error("Error fetching module list:", error);
      // Not a validation message; keep UI quiet here per tester notes.
    }
  };

  // 🔄 Toggle module status for selected employee
  const handleToggle = async (moduleId, currentStatus) => {
    if (!selectedEmployee?.empId) {
      showError("Please enter the employee id.");
      inputRef.current?.focus();
      return;
    }

    const empId = String(selectedEmployee.empId);
    const url = currentStatus
      ? `${API_CONFIG.BASE_URL}/api/v1/inhouseUser/unassign-modules/${empId}`
      : `${API_CONFIG.BASE_URL}/api/v1/inhouseUser/assign-modules/${empId}`;

    try {
      const res = await axios.patch(
        url,
        { moduleIds: [moduleId] },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );

      if (res?.data?.success) {
        setModules((prev) =>
          prev.map((m) =>
            m._id === moduleId ? { ...m, isActive: !currentStatus } : m
          )
        );
      } else {
        console.warn("Toggle API returned success=false");
      }
    } catch (error) {
      console.error("Error toggling module:", error);
      // Keep quiet—non-validation error.
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Employee Module Permission</h1>

      {/* Search Row */}
      <div className="flex items-start gap-4 mb-2">
        <div className="w-1/3">
          <input
            ref={inputRef}
            type="text"
            placeholder="Enter Employee ID (e.g., VPL001)"
            value={empIdInput}
            onChange={(e) => setEmpIdInput(e.target.value)}
            onKeyDown={onKeyDown}
            className={`px-4 py-2 border rounded-md w-full outline-none transition
              ${
                feedback.type === "error" && feedback.message
                  ? "border-red-500 focus:ring-2 focus:ring-red-500"
                  : "border-gray-300 focus:ring-2 focus:ring-blue-500"
              }`}
            aria-invalid={feedback.type === "error" && feedback.message ? "true" : "false"}
            aria-describedby="empid-help"
            autoComplete="off"
          />
          {/* Inline feedback (no browser validation / no alerts) */}
          
            <p id="empid-help" className="mt-1 text-sm text-red-600" aria-live="polite">
              {feedback.message}
            </p>
          
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md cursor-pointer transition-colors
            disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {loading ? "Checking..." : "Access"}
        </button>
      </div>

      {/* Employee Info */}
      {selectedEmployee && (
        <div className="mb-4 bg-gray-100 p-4 rounded-md">
          <p>
            <strong>Name:</strong> {selectedEmployee.employeeName}
          </p>
          <p>
            <strong>Department:</strong> {selectedEmployee.department}
          </p>
          <p>
            <strong>Designation:</strong> {selectedEmployee.designation}
          </p>
          <p>
            <strong>Role:</strong> {selectedEmployee.role}
          </p>
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
