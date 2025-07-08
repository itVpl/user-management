import React, { useEffect, useState } from "react";
import axios from "axios";

const RECORDS_PER_PAGE = 16;

const PayrollPage = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchPayroll();
  }, []);

  const fetchPayroll = async () => {
    try {
      const token = sessionStorage.getItem("authToken");
      const userRaw = sessionStorage.getItem("user");
      const user = userRaw ? JSON.parse(userRaw) : null;
      const empId = user?.empId;
      const role = user?.role;
      const month = new Date().toISOString().slice(0, 7);

      if (!token || !empId) {
        throw new Error("Missing token or empId. Please login.");
      }

      let url = "";
      let config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      if (role === "superadmin" || role === "admin") {
        url = `https://vpl-liveproject-1.onrender.com/api/v1/payroll?month=${month}&empId=${empId}`;
      } else {
        url = `https://vpl-liveproject-1.onrender.com/api/v1/payroll/me?month=${month}`;
      }

      const res = await axios.get(url, config);
      setRecords(res.data.records || []);
    } catch (err) {
      console.error("❌ Error fetching payroll", err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatINR = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const totalPages = Math.ceil(records.length / RECORDS_PER_PAGE);
  const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
  const paginatedRecords = records.slice(startIndex, startIndex + RECORDS_PER_PAGE);

  return (
    <div className="flex h-screen bg-gray-50">
      <main className="flex-1 p-6 overflow-auto">
        <section className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full table-auto text-sm">
            <thead className="bg-blue-50 text-blue-700 font-semibold">
              <tr>
                <th className="p-3 text-left">Date of Joining</th>
                <th className="p-3 text-left">Employee ID</th>
                <th className="p-3 text-left">Employee Name</th>
                <th className="p-3 text-left">Dept</th>
                <th className="p-3 text-left">Role</th>
                <th className="p-3 text-left">Salary (in-hand)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="p-4" colSpan="6">Loading...</td></tr>
              ) : paginatedRecords.length === 0 ? (
                <tr><td className="p-4" colSpan="6">No records found.</td></tr>
              ) : (
                paginatedRecords.map((item) => (
                  <tr key={item._id} className="border-t hover:bg-gray-50">
                    <td className="p-3">16-06-2025</td>
                    <td className="p-3">{item.empId}</td>
                    <td className="p-3">{item.empId === "VPL001" ? "Troy" : "Ebin"}</td>
                    <td className="p-3">Sales</td>
                    <td className="p-3">Admin</td>
                    <td className="p-3">{formatINR(item.netSalary)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center p-4 border-t">
              <div className="text-sm text-gray-500">
                Showing {startIndex + 1} to {Math.min(startIndex + RECORDS_PER_PAGE, records.length)} of {records.length}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300"
                >
                  Prev
                </button>
                <span className="text-sm font-semibold px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default PayrollPage;
