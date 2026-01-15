import React, { useRef, useState } from "react";
import axios from "axios";
import API_CONFIG from "../../config/api.js";
import { Search, User, Building, Briefcase, Shield, CheckCircle, XCircle, Loader2 } from "lucide-react";

const UserPermission = () => {
  const [empIdInput, setEmpIdInput] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [modules, setModules] = useState([]);
  const [feedback, setFeedback] = useState({ type: null, message: "" }); // type: 'error' | 'info' | null
  const [loading, setLoading] = useState(false);
  const [togglingModuleId, setTogglingModuleId] = useState(null); // Track which module is being toggled
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

        // Sort modules alphabetically by label (case-insensitive)
        const sortedModules = mergedModules.sort((a, b) => {
          const labelA = (a.label || '').toLowerCase().trim();
          const labelB = (b.label || '').toLowerCase().trim();
          return labelA.localeCompare(labelB);
        });

        setModules(sortedModules);
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

    setTogglingModuleId(moduleId); // Set loading state for this specific module
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
        setModules((prev) => {
          const updated = prev.map((m) =>
            m._id === moduleId ? { ...m, isActive: !currentStatus } : m
          );
          // Maintain alphabetical order
          return updated.sort((a, b) => {
            const labelA = (a.label || '').toLowerCase().trim();
            const labelB = (b.label || '').toLowerCase().trim();
            return labelA.localeCompare(labelB);
          });
        });
      } else {
        console.warn("Toggle API returned success=false");
      }
    } catch (error) {
      console.error("Error toggling module:", error);
      // Keep quiet—non-validation error.
    } finally {
      setTogglingModuleId(null); // Clear loading state
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Employee Module Permission</h1>
        <p className="text-gray-600 text-sm">Manage and assign module permissions for employees</p>
      </div>

      {/* Search Card */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-gray-100">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
          <div className="flex-1 w-full md:w-auto">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Employee ID
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Enter Employee ID (e.g., VPL001)"
                value={empIdInput}
                onChange={(e) => setEmpIdInput(e.target.value)}
                onKeyDown={onKeyDown}
                className={`pl-10 pr-4 py-3 w-full border rounded-lg outline-none transition-all duration-200
                  ${
                    feedback.type === "error" && feedback.message
                      ? "border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50"
                      : "border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  }`}
                aria-invalid={feedback.type === "error" && feedback.message ? "true" : "false"}
                aria-describedby="empid-help"
                autoComplete="off"
              />
            </div>
            {feedback.message && (
              <p id="empid-help" className={`mt-2 text-sm flex items-center gap-1 ${feedback.type === "error" ? "text-red-600" : "text-blue-600"}`} aria-live="polite">
                {feedback.type === "error" && (
                  <XCircle className="w-4 h-4" />
                )}
                {feedback.message}
              </p>
            )}
          </div>

          <button
            onClick={handleSearch}
            disabled={loading}
            className={`w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors
              disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Search size={18} />
                <span>Search Employee</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Employee Info Card */}
      {selectedEmployee && (
        <div className="mb-6 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header Section with Gradient */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <User className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{selectedEmployee.employeeName}</h2>
                <p className="text-blue-100 text-sm">Employee ID: {selectedEmployee.empId}</p>
              </div>
            </div>
          </div>
          
          {/* Details Section */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Building className="text-green-600" size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Department</p>
                    <p className="text-base font-bold text-gray-800 mt-1">{selectedEmployee.department || "N/A"}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Briefcase className="text-blue-600" size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Designation</p>
                    <p className="text-base font-bold text-gray-800 mt-1">{selectedEmployee.designation || "N/A"}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Shield className="text-purple-600" size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Role</p>
                    <p className="text-base font-bold text-gray-800 mt-1">{selectedEmployee.role || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modules Permissions Card */}
      {modules.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Shield className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Module Permissions</h3>
                  <p className="text-blue-100 text-sm mt-0.5">Toggle modules to grant or revoke access</p>
                </div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <p className="text-white text-sm font-semibold">
                  <span className="text-blue-100">{modules.filter(m => m.isActive).length}</span> / {modules.length} Enabled
                </p>
              </div>
            </div>
          </div>

          {/* Modules Grid */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map((mod) => (
                <div
                  key={mod._id}
                  className={`relative rounded-xl p-5 border-2 transition-all duration-300 ${
                    mod.isActive
                      ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-md hover:shadow-lg'
                      : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200 hover:border-gray-300'
                  } ${togglingModuleId === mod._id ? 'opacity-60 pointer-events-none' : 'hover:scale-[1.02]'}`}
                >
                  {/* Module Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      {togglingModuleId === mod._id ? (
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Loader2 className="text-blue-600 animate-spin" size={20} />
                        </div>
                      ) : mod.isActive ? (
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <CheckCircle className="text-green-600" size={20} />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                          <XCircle className="text-gray-400" size={20} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-bold text-gray-800 truncate">{mod.label}</h4>
                        <p className={`text-xs font-medium mt-0.5 ${
                          togglingModuleId === mod._id 
                            ? 'text-blue-600' 
                            : mod.isActive 
                              ? 'text-green-600' 
                              : 'text-gray-500'
                        }`}>
                          {togglingModuleId === mod._id ? 'Updating...' : mod.isActive ? 'Access Granted' : 'Access Denied'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      {mod.isActive ? 'Enabled' : 'Disabled'}
                    </span>
                    <label className={`relative inline-flex items-center ${togglingModuleId === mod._id ? 'cursor-wait' : 'cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={mod.isActive}
                        onChange={() => handleToggle(mod._id, mod.isActive)}
                        disabled={togglingModuleId === mod._id}
                      />
                      <div className={`relative w-16 h-8 rounded-full transition-all duration-300 ease-in-out shadow-inner ${
                        mod.isActive 
                          ? 'bg-gradient-to-r from-green-400 to-green-600' 
                          : 'bg-gray-300'
                      } ${togglingModuleId === mod._id ? 'opacity-50' : ''}`}>
                        <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg transform transition-all duration-300 ease-in-out flex items-center justify-center ${
                          mod.isActive ? 'translate-x-8' : 'translate-x-0'
                        }`}>
                          {mod.isActive && (
                            <CheckCircle className="text-green-600" size={14} />
                          )}
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Status Badge */}
                  {mod.isActive && (
                    <div className="absolute top-3 right-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer Summary */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-700 font-medium">
                    <span className="font-bold text-green-600">{modules.filter(m => m.isActive).length}</span> Enabled
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                  <span className="text-sm text-gray-700 font-medium">
                    <span className="font-bold text-gray-600">{modules.filter(m => !m.isActive).length}</span> Disabled
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Total: <span className="font-bold text-gray-700">{modules.length}</span> Modules
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedEmployee && !loading && (
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center border border-gray-100">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Search className="text-blue-600" size={24} />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Search for an Employee</h3>
            <p className="text-gray-500 text-sm">Enter an employee ID above to view and manage their module permissions</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPermission;
