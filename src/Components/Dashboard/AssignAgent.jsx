import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API_CONFIG from '../../config/api';

const customerIds = ['6888def30737e011a312afec']; // 👈 yahan apni customer IDs daal

const AssignAgentTable = () => {
  const [data, setData] = useState([]);
  const [empIdInput, setEmpIdInput] = useState('');
  const [modalCustomerId, setModalCustomerId] = useState(null);
  const token = sessionStorage.getItem('token'); // ✅ FIXED: sessionStorage used

  // ✅ Fetch all assigned-users by customerId
  const fetchAll = async () => {
    try {
      const results = [];

      for (const id of customerIds) {
        const res = await axios.get(
          `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/customer/${id}/assigned-users`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        results.push(res.data);
      }

      setData(results);
    } catch (error) {
      console.error('❌ Error fetching:', error.response?.data || error.message);
    }
  };

  // ✅ PUT: assign agent
  const handleAssign = async () => {
    if (!empIdInput || !modalCustomerId) return alert('Please enter empId');

    try {
      await axios.put(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/customer/assign-users`,
        {
          customerId: modalCustomerId,
          userIds: [empIdInput],
          action: 'add',
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert('✅ Agent assigned');
      setEmpIdInput('');
      setModalCustomerId(null);
      fetchAll(); // Refresh data
    } catch (error) {
      console.error('❌ Error assigning:', error.response?.data || error.message);
      alert('Failed to assign');
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  return (
    <div className="p-6">
  <h2 className="text-4xl font-bold mb-8 text-blue-800 drop-shadow-sm tracking-wide">
    🧾 Customer & Agent Assignment
  </h2>

  <div className="overflow-x-auto rounded-2xl shadow-xl border border-gray-200 bg-white/90 backdrop-blur-md">
    <table className="min-w-full text-sm text-gray-800">
      <thead className="bg-gradient-to-r from-blue-100 to-blue-300 text-left">
        <tr>
          <th className="px-6 py-4 font-semibold">Customer</th>
          <th className="px-6 py-4 font-semibold">Assigned Agents</th>
          <th className="px-6 py-4 font-semibold text-center">Actions</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-100">
        {data.map((entry) => (
          <tr key={entry.customer._id} className="hover:bg-blue-50 transition-all duration-150">
            <td className="px-6 py-4 font-medium text-lg text-blue-900">{entry.customer.compName}</td>
            <td className="px-6 py-4">
              {entry.assignedUsers.users.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {entry.assignedUsers.users.map((u) => (
                    <div
                      key={u.empId}
                      className="flex items-center gap-2 bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full shadow-sm"
                    >
                      <div className="bg-blue-600 text-white w-5 h-5 flex items-center justify-center rounded-full text-[10px] uppercase shadow">
                        {u.employeeName?.[0]}
                      </div>
                      <span className="font-semibold">{u.employeeName} ({u.empId})</span>
                      <span
                        className={`ml-1 text-white text-[10px] px-2 py-0.5 rounded-full ${
                          u.department === 'Sales' ? 'bg-green-500' :
                          u.department === 'HR' ? 'bg-purple-500' :
                          'bg-gray-500'
                        }`}
                      >
                        {u.department}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-gray-400 italic">No agents</span>
              )}
            </td>
            <td className="px-6 py-4 text-center">
              <button
                onClick={() => setModalCustomerId(entry.customer._id)}
                className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-medium py-2 px-4 rounded-full transition-all duration-200 shadow-md"
              >
                + Assign Agent
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>

  {/* Modal */}
  {modalCustomerId && (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/90 backdrop-blur-xl border border-blue-300 p-6 rounded-3xl shadow-2xl w-96 scale-100 animate-fadeIn">
        <h3 className="text-xl font-bold mb-5 text-blue-800 drop-shadow">Assign New Agent</h3>

        <div className="relative w-full mb-6">
          <input
            type="text"
            id="empId"
            placeholder=" "
            value={empIdInput}
            onChange={(e) => setEmpIdInput(e.target.value)}
            className="peer border border-gray-300 px-4 pt-5 pb-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <label
            htmlFor="empId"
            className="absolute left-4 top-2 text-gray-500 text-xs transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-xs"
          >
            Enter Employee ID
          </label>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => setModalCustomerId(null)}
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full shadow-md transition"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  )}
</div>



  );
};

export default AssignAgentTable;
 