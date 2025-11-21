import React, { useEffect, useState } from "react";
import axios from "axios";
import API_CONFIG from '../../config/api.js';
const RECORDS_PER_PAGE = 16;


const PayrollPage = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [createForm, setCreateForm] = useState({
    empId: "",
    month: new Date().toISOString().slice(0, 7),
    basicSalary: "",
    bonus: "",
    deductions: ""
  });


  useEffect(() => {
    fetchPayroll();
  }, [selectedMonth]);


  const fetchPayroll = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("authToken");
     
      if (!token) {
        throw new Error("Missing token. Please login.");
      }


      const url = `${API_CONFIG.BASE_URL}/api/v1/payroll/month/${selectedMonth}`;
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };


      const res = await axios.get(url, config);
      setRecords(res.data.records || []);
    } catch (err) {
      console.error("❌ Error fetching payroll", err.response?.data || err.message);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };


  const createPayroll = async (e) => {
    e.preventDefault();
   
    try {
      const token = sessionStorage.getItem("authToken");
     
      if (!token) {
        throw new Error("Missing token. Please login.");
      }


      const payload = {
        empId: createForm.empId,
        month: createForm.month,
        basicSalary: parseInt(createForm.basicSalary),
        allowances: parseInt(createForm.bonus || 0),
        deductions: parseInt(createForm.deductions || 0)
      };


      console.log("Sending payload:", payload); // Debug log


      const url = `${API_CONFIG.BASE_URL}/api/v1/payroll`;
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      };


      const res = await axios.post(url, payload, config);
     
      console.log("API Response:", res.data); // Debug log
     
      // Check for success in the response
      if (res.data.success && res.data.payroll) {
        alert("✅ Payroll generated successfully!");
        setShowCreateModal(false);
        setCreateForm({
          empId: "",
          month: new Date().toISOString().slice(0, 7),
          basicSalary: "",
          bonus: "",
          deductions: ""
        });
        fetchPayroll(); // Refresh the list
      } else {
        alert("❌ Failed to create payroll. Please try again.");
      }
    } catch (err) {
      console.error("❌ Error creating payroll", err.response?.data || err.message);
      console.error("Full error:", err); // Debug log
      alert("❌ Failed to create payroll. Please try again.");
    }
  };


  const formatINR = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);


  const getStatusColor = (status) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };


  const totalPages = Math.ceil(records.length / RECORDS_PER_PAGE);
  const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
  const paginatedRecords = records.slice(startIndex, startIndex + RECORDS_PER_PAGE);


  return (
    <div className="flex h-screen bg-gray-50">
      <main className="flex-1 p-6 overflow-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Payroll Management</h1>
          </div>
          <div className="flex gap-4">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Array.from({ length: 12 }, (_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const monthValue = date.toISOString().slice(0, 7);
                const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                return (
                  <option key={monthValue} value={monthValue}>
                    {monthLabel}
                  </option>
                );
              })}
            </select>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              + Generate Payroll
            </button>
          </div>
        </div>


        {/* Payroll Table */}
        <section className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full table-auto text-sm">
            <thead className="bg-blue-50 text-blue-700 font-semibold">
              <tr>
                <th className="p-3 text-left">Employee ID</th>
                <th className="p-3 text-left">Month</th>
                <th className="p-3 text-left">Base Salary</th>
                {/* <th className="p-3 text-left">Allowances</th> */}
                <th className="p-3 text-left">Deductions</th>
                <th className="p-3 text-left">Net Salary</th>
                {/* <th className="p-3 text-left">Status</th> */}
                <th className="p-3 text-left">Generated By</th>
                <th className="p-3 text-left">Created Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="p-4 text-center" colSpan="9">Loading...</td></tr>
              ) : paginatedRecords.length === 0 ? (
                <tr><td className="p-4 text-center" colSpan="9">No payroll records found for this month.</td></tr>
              ) : (
                paginatedRecords.map((item) => (
                  <tr key={item._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{item.empId}</td>
                    <td className="p-3">{item.month}</td>
                    <td className="p-3">{formatINR(item.baseSalary)}</td>
                    {/* <td className="p-3">{formatINR(item.allowances)}</td> */}
                    <td className="p-3">{formatINR(item.deductions)}</td>
                    <td className="p-3 font-semibold text-green-600">{formatINR(item.netSalary)}</td>
                    {/* <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td> */}
                    <td className="p-3">{item.generatedBy}</td>
                    <td className="p-3">{new Date(item.createdAt).toLocaleDateString()}</td>
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


        {/* Create Payroll Modal */}
        {showCreateModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Generate Payroll</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>


              <form onSubmit={createPayroll} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    value={createForm.empId}
                    onChange={(e) => setCreateForm({...createForm, empId: e.target.value})}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter Employee ID"
                  />
                </div>


                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Month *
                  </label>
                  <input
                    type="month"
                    value={createForm.month}
                    onChange={(e) => setCreateForm({...createForm, month: e.target.value})}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>


                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Basic Salary *
                  </label>
                  <input
                    type="number"
                    value={createForm.basicSalary}
                    onChange={(e) => setCreateForm({...createForm, basicSalary: e.target.value})}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter Basic Salary"
                  />
                </div>


                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Bonus/Allowances
                  </label>
                  <input
                    type="number"
                    value={createForm.bonus}
                    onChange={(e) => setCreateForm({...createForm, bonus: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter Bonus/Allowances"
                  />
                </div>


                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Deductions
                  </label>
                  <input
                    type="number"
                    value={createForm.deductions}
                    onChange={(e) => setCreateForm({...createForm, deductions: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter Deductions"
                  />
                </div>


                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200"
                  >
                    Generate Payroll
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};


export default PayrollPage;



