import React, { useEffect, useState } from "react";
import axios from "axios";

const ManageModule = () => {
  const [modules, setModules] = useState([]);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = () => {
    const token =
      sessionStorage.getItem("authToken") || localStorage.getItem("authToken");

    axios
      .get("https://vpl-liveproject-1.onrender.com/api/v1/module", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      })
      .then((res) => {
        if (res.data.success) {
          setModules(res.data.modules);
        }
      })
      .catch((err) => console.error("API Error:", err));
  };

  const handleToggle = async (moduleId, currentStatus) => {
    const token =
      sessionStorage.getItem("authToken") || localStorage.getItem("authToken");

    const url = currentStatus
      ? `https://vpl-liveproject-1.onrender.com/api/v1/module/deactivate/${moduleId}`
      : `https://vpl-liveproject-1.onrender.com/api/v1/module/activate/${moduleId}`;


  //  
  // 
  // 
  // 


    try {
      const response = await axios.patch(
        url,
        {}, // Empty body
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );

      if (response.data.success) {
        // Update UI state
        setModules((prevModules) =>
          prevModules.map((module) =>
            module._id === moduleId
              ? { ...module, isActive: !currentStatus }
              : module
          )
        );
      }
    } catch (err) {
      console.error("Toggle Error:", err);
    }
  };

  return (
    <div className="p-6">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((module) => (
              <tr key={module._id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">
                  {module.label}
                </td>
                <td className="px-6 py-4 text-right">
                  <label className="inline-flex relative items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={module.isActive}
                      onChange={() =>
                        handleToggle(module._id, module.isActive)
                      }
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-500"></div>
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-full"></div>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageModule;
