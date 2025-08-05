import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import 'alertifyjs/build/css/themes/default.min.css';
import API_CONFIG from '../../config/api';

const AssignAgentTable = () => {
  const [rows, setRows] = useState([]);                 // [{ customer, assignedUsers }]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [empIdInput, setEmpIdInput] = useState('');
  const [modalCustomerId, setModalCustomerId] = useState(null);

  // 🔢 Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // options: 5/10/20/50

  // ✅ Prefer sessionStorage to match your existing auth usage
  const token = useMemo(() => sessionStorage.getItem('token'), []);

  // Toast position
  useEffect(() => {
    alertify.set('notifier', 'position', 'top-right');
  }, []);

  // 🔄 Fetch all shippers ➜ then fetch assigned-users for each (parallel)
  const fetchAll = async () => {
    if (!token) {
      setError('No auth token found. Please login again.');
      alertify.error('No auth token found. Please login again.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // 1) Fetch dynamic list of shippers
      //    If you only want approved shippers, use:
      //    `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/shippers?status=approved`
      const shippersRes = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/shippers`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Expecting shape: { success: true, data: [...] }
      const shippers = shippersRes?.data?.data || [];
      const ids = shippers.map((s) => s?._id).filter(Boolean);

      if (ids.length === 0) {
        setRows([]);
        setCurrentPage(1);
        return;
      }

      // 2) For each shipper id, get `{ customer, assignedUsers }`
      const settle = await Promise.allSettled(
        ids.map((id) =>
          axios.get(
            `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/customer/${id}/assigned-users`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      );

      const results = settle
        .filter((r) => r.status === 'fulfilled' && r.value?.data)
        .map((r) => r.value.data);

      setRows(results);
      // Keep current page in range if data size shrank
      setCurrentPage((prev) => {
        const totalPages = Math.max(1, Math.ceil(results.length / pageSize));
        return Math.min(prev, totalPages);
      });
      alertify.success('Data refreshed');
    } catch (err) {
      console.error('❌ Error fetching:', err.response?.data || err.message);
      const msg = err.response?.data?.message || 'Failed to fetch customers.';
      setError(msg);
      alertify.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Assign agent to selected customer
  const handleAssign = async () => {
    if (!empIdInput?.trim() || !modalCustomerId) {
      alertify.warning('Please enter Employee ID');
      return;
    }

    try {
      await axios.put(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/customer/assign-users`,
        {
          customerId: modalCustomerId,
          userIds: [empIdInput.trim()],
          action: 'add',
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alertify.success('Agent assigned');
      setEmpIdInput('');
      setModalCustomerId(null);
      fetchAll(); // refresh table
    } catch (error) {
      console.error('❌ Error assigning:', error.response?.data || error.message);
      alertify.error(error.response?.data?.message || 'Failed to assign');
    }
  };

  // 🔖 Pagination helpers
  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const pageRows = rows.slice(startIndex, endIndex);

  const goToPage = (p) => {
    const page = Math.min(Math.max(1, p), totalPages);
    setCurrentPage(page);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset to page 1 if pageSize changes
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 gap-4">
        <h2 className="text-4xl font-bold text-blue-800 drop-shadow-sm tracking-wide">
          🧾 Customer & Agent Assignment
        </h2>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Rows / page</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchAll}
            disabled={loading}
            className="bg-white border border-blue-300 text-blue-700 px-4 py-2 rounded-full shadow hover:bg-blue-50 disabled:opacity-60"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-red-600 bg-red-50 border border-red-200 px-4 py-2 rounded">
          {error}
        </div>
      )}

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
            {loading ? (
              <tr>
                <td className="px-6 py-6" colSpan={3}>
                  <div className="animate-pulse text-gray-500">Loading customers…</div>
                </td>
              </tr>
            ) : totalItems === 0 ? (
              <tr>
                <td className="px-6 py-6 text-gray-500 italic" colSpan={3}>
                  No customers found.
                </td>
              </tr>
            ) : (
              pageRows.map((entry) => (
                <tr key={entry.customer._id} className="hover:bg-blue-50 transition-all duration-150">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-blue-900 text-lg">
                        {entry.customer.compName || '—'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {entry.customer.userType?.toUpperCase?.() || 'SHIPPER'} · {entry.customer.status || '—'}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    {entry.assignedUsers?.users?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {entry.assignedUsers.users.map((u) => (
                          <div
                            key={`${entry.customer._id}-${u.empId}`}
                            className="flex items-center gap-2 bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full shadow-sm"
                          >
                            <div className="bg-blue-600 text-white w-5 h-5 flex items-center justify-center rounded-full text-[10px] uppercase shadow">
                              {u.employeeName?.[0] || u.empId?.[0] || '?'}
                            </div>
                            <span className="font-semibold">
                              {u.employeeName || 'Unknown'} ({u.empId || '—'})
                            </span>
                            <span
                              className={`ml-1 text-white text-[10px] px-2 py-0.5 rounded-full ${
                                u.department === 'Sales'
                                  ? 'bg-green-500'
                                  : u.department === 'HR'
                                  ? 'bg-purple-500'
                                  : 'bg-gray-500'
                              }`}
                            >
                              {u.department || 'N/A'}
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer: Pagination Controls */}
      {totalItems > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-700">
          <div>
            Showing <span className="font-semibold">{startIndex + 1}</span>–
            <span className="font-semibold">{endIndex}</span> of{' '}
            <span className="font-semibold">{totalItems}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              « First
            </button>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              ‹ Prev
            </button>
            <span className="px-2">
              Page <b>{currentPage}</b> of <b>{totalPages}</b>
            </span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next ›
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Last »
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalCustomerId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/90 backdrop-blur-xl border border-blue-300 p-6 rounded-3xl shadow-2xl w-96">
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
