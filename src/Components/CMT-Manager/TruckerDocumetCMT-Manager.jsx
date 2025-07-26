import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaArrowLeft, FaCheck, FaTimes, FaRedo } from "react-icons/fa";

const TruckerLDocuments = () => {
  const [truckers, setTruckers] = useState([]);
  const [selectedTrucker, setSelectedTrucker] = useState(null);

  // ✅ 1. Fetch real truckers from API
  useEffect(() => {
    const fetchTruckers = async () => {
      try {
        // Get current user's empId from session/local storage
        const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
        const currentUser = userStr ? JSON.parse(userStr) : null;
        const empId = currentUser?.empId;
        
        if (!empId) {
          console.error('User not logged in or empId not found');
          setTruckers([]);
          return;
        }
        
        // Fetch truckers with user-specific filtering
        const res = await axios.get(`https://vpl-liveproject-1.onrender.com/api/v1/shipper_driver/truckers?addedBy=${empId}`, {
          withCredentials: true
        });
        setTruckers(res.data.data || []);
      } catch (err) {
        console.error("❌ Failed to fetch truckers:", err);
        setTruckers([]);
      }
    };
    fetchTruckers();
  }, []);

  // ✅ 2. Update status function
  const updateTruckerStatus = async (status) => {
    if (!selectedTrucker?._id) return;
    try {
      const res = await axios.patch(
        `https://vpl-liveproject-1.onrender.com/api/v1/shipper_driver/simple-status/${selectedTrucker._id}`,
        { status }
      );
      alert(`Status updated to "${status}"`);
      setSelectedTrucker(res.data.user);
      setTruckers((prev) =>
        prev.map((t) => (t._id === res.data.user._id ? res.data.user : t))
      );
    } catch (err) {
      console.error("❌ Update failed:", err);
      alert("Update failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans">
      {!selectedTrucker ? (
        <div className="bg-white rounded-xl shadow p-6 overflow-auto">
          <h1 className="text-xl font-semibold mb-4 text-gray-700">Trucker's Documents</h1>
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="text-gray-600 border-b">
                <th className="py-2">Company Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {truckers.map((trucker) => (
                <tr key={trucker._id} className="border-b hover:bg-gray-50">
                  <td className="py-2">{trucker.compName}</td>
                  <td>{trucker.phoneNo}</td>
                  <td>{trucker.email}</td>
                  <td>
                    <span className={`text-xs px-2 py-1 rounded ${
                      trucker.status === "approved"
                        ? "bg-green-500 text-white"
                        : trucker.status === "rejected"
                        ? "bg-red-500 text-white"
                        : "bg-yellow-400 text-black"
                    }`}>
                      {trucker.status}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => setSelectedTrucker(trucker)}
                      className="bg-blue-500 text-white px-3 py-1 text-xs rounded hover:bg-blue-600"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setSelectedTrucker(null)}
              className="text-blue-600 flex items-center gap-2 hover:underline cursor-pointer"
            >
              <FaArrowLeft /> 
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => updateTruckerStatus("approved")}
                className="bg-green-600 text-white text-sm px-3 py-1 rounded flex items-center gap-1 hover:bg-green-700 cursor-pointer"
              >
                <FaCheck /> Approve
              </button>
              <button
                onClick={() => updateTruckerStatus("rejected")}
                className="bg-red-600 text-white text-sm px-3 py-1 rounded flex items-center gap-1 hover:bg-red-700 cursor-pointer"
              >
                <FaTimes /> Reject
              </button>
              <button
                onClick={() => updateTruckerStatus("resubmit")}
                className="bg-blue-500 text-white text-sm px-3 py-1 rounded flex items-center gap-1 hover:bg-blue-600 cursor-pointer"
              >
                <FaRedo /> Re-submit
              </button>
            </div>
          </div>

          <div className="flex justify-between flex-wrap mb-6 border-b pb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                Trucker: {selectedTrucker.compName}
              </h2>
              <p>Email: <span className="text-gray-700 font-medium">{selectedTrucker.email}</span></p>
              <p>Phone: <span className="text-gray-700 font-medium">{selectedTrucker.phoneNo}</span></p>
              <p>Carrier Type: <span className="text-gray-700 font-medium">{selectedTrucker.carrierType?.trim()}</span></p>
            </div>
            <div className="text-right">
              <p>
                Status: <span className="bg-green-500 text-white px-2 py-1 rounded text-xs">{selectedTrucker.status}</span>
              </p>
              <p className="text-sm text-gray-500">
                Updated At: {new Date(selectedTrucker.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-100 p-3 rounded">MC/DOT No: <strong>{selectedTrucker.mc_dot_no}</strong></div>
            <div className="bg-gray-100 p-3 rounded">Fleet Size: <strong>{selectedTrucker.fleetsize}</strong></div>
            <div className="bg-gray-100 p-3 rounded">City: <strong>{selectedTrucker.city}</strong></div>
            <div className="bg-gray-100 p-3 rounded">State: <strong>{selectedTrucker.state}</strong></div>
            <div className="bg-gray-100 p-3 rounded">Country: <strong>{selectedTrucker.country}</strong></div>
            <div className="bg-gray-100 p-3 rounded">Zip: <strong>{selectedTrucker.zipcode}</strong></div>
          </div>

          {selectedTrucker.docUpload && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Uploaded Document</h3>
              <img
                src={`https://vpl-liveproject-1.onrender.com/${selectedTrucker.docUpload}`}
                alt="Document"
                className="w-64 h-auto rounded shadow"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TruckerLDocuments;
