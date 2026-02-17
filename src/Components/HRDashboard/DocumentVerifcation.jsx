import React, { useEffect, useState } from "react";
import axios from "axios";
import { Search } from "lucide-react";
import API_CONFIG from '../../config/api.js';
const DocumentsVerification = () => {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;


  const statusStyles = {
    Pending: "border border-yellow-300 text-yellow-700 bg-yellow-50 hover:bg-yellow-400 hover:text-white transition-colors",
    Rejected: "border border-red-300 text-red-700 bg-red-50 hover:bg-red-500 hover:text-white transition-colors",
    Approved: "border border-green-300 text-green-700 bg-green-50 hover:bg-green-500 hover:text-white transition-colors",
  };


  useEffect(() => {
    const fetchEmployees = async () => {
    setLoading(true);
      try {
        const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/inhouseUser/`);
        const data = res.data.employees || [];


        const mapped = data.map((emp) => {
          const docs = [];


          // Flatten document structure
          if (emp.identityDocs) {
            Object.entries(emp.identityDocs).forEach(([key, value]) => {
              if (Array.isArray(value)) {
                value.forEach((v) => docs.push({ label: key, url: v }));
              } else {
                docs.push({ label: key, url: value });
              }
            });
          }


          if (emp.previousCompanyDocs) {
            Object.entries(emp.previousCompanyDocs).forEach(([key, value]) => {
              if (Array.isArray(value)) {
                value.forEach((v) => docs.push({ label: key, url: v }));
              } else {
                docs.push({ label: key, url: value });
              }
            });
          }


          // Set status
          let status = "Pending";
          if (emp.docVerified === true) status = "Approved";
          else if (emp.docVerified === false) status = "Rejected";


          return {
            _id: emp._id,
            id: emp.empId,
            name: emp.employeeName,
            date: new Date(emp.createdAt).toLocaleDateString("en-GB"),
            status,
            verifiedBy: "HR System",
            raw: emp,
            allDocs: docs,
          };
        });


        setEmployees(mapped);
      } catch (error) {
        console.error("Fetch failed:", error);
      }
      finally{
        setLoading(false);
      }
    };


    fetchEmployees();
  }, []);

  const filteredEmployees = employees.filter(emp => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    const str = `${emp.id || ''} ${emp.name || ''} ${emp.status || ''} ${emp.verifiedBy || ''}`.toLowerCase();
    return str.includes(term);
  });

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredEmployees.length);
  const currentEmployees = filteredEmployees.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const getPageNumbers = () => {
    const maxVisible = 7;
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [];
    const halfVisible = Math.floor(maxVisible / 2);

    if (currentPage <= halfVisible + 1) {
      for (let i = 1; i <= maxVisible - 1; i++) {
        pages.push(i);
      }
      pages.push(totalPages);
    } else if (currentPage >= totalPages - halfVisible) {
      pages.push(1);
      for (let i = totalPages - (maxVisible - 2); i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      for (let i = currentPage - halfVisible + 1; i <= currentPage + halfVisible - 1; i++) {
        pages.push(i);
      }
      pages.push(totalPages);
    }

    return pages;
  };


 const handleApprove = async () => {
  const token = sessionStorage.getItem("authToken");
  if (!token) {
    alert("❌ You are not logged in.");
    return;
  }


  try {
    const res = await axios.patch(
      `${API_CONFIG.BASE_URL}/api/v1/inhouseUser/${selectedEmployee.id}/doc-verified`,
      { docVerified: true },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }
    );


    if (res.data.success) {
      alert("✅ Approved successfully!");
      setEmployees((prev) =>
        prev.map((emp) =>
          emp._id === selectedEmployee._id ? { ...emp, status: "Approved" } : emp
        )
      );
      setSelectedEmployee(null);
    }
  } catch (error) {
    console.error("❌ Approval failed:", error.response?.data || error.message);
    alert("❌ Approval failed. See console for details.");
  }
};
 const handleReject = async () => {
  const token = sessionStorage.getItem("authToken");
  if (!token) {
    alert("❌ You are not logged in.");
    return;
  }


  try {
    const res = await axios.patch(
      `${API_CONFIG.BASE_URL}/api/v1/inhouseUser/${selectedEmployee.id}/doc-verified`,
      { docVerified: false },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }
    );


    if (res.data.success) {
      alert("❌ Rejected successfully!");
      setEmployees((prev) =>
        prev.map((emp) =>
          emp._id === selectedEmployee._id ? { ...emp, status: "Rejected" } : emp
        )
      );
      setSelectedEmployee(null);
    }
  } catch (error) {
    console.error("❌ Rejection failed:", error.response?.data || error.message);
    alert("❌ Rejection failed. See console for details.");
  }
};


  const handleDownloadAll = () => {
    selectedEmployee.allDocs.forEach((doc) => {
      const link = document.createElement("a");
      link.href = `${API_CONFIG.BASE_URL}/${doc.url}`;
      link.download = doc.label;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };


  return (
    <div className="p-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">Documents Verification</h1>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by ID, name, status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto p-4">
          <table className="min-w-full text-left border-separate border-spacing-y-4">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y first:border-l border-gray-200 rounded-l-lg">
                  Employee ID
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200">
                  Employee Name
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200">
                  Uploaded Date
                </th>
                <th className="px-8 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200">
                  Status
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200">
                  Verified By
                </th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y last:border-r border-gray-200 rounded-r-lg">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-4 py-12 text-center border-y first:border-l last:border-r border-gray-200 first:rounded-l-lg last:rounded-r-lg"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                      <p className="text-gray-600">Loading documents...</p>
                    </div>
                  </td>
                </tr>
              ) : currentEmployees.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-4 py-12 text-center border-y first:border-l last:border-r border-gray-200 first:rounded-l-lg last:rounded-r-lg"
                  >
                    <p className="text-gray-500 text-lg">No documents found.</p>
                    <p className="text-gray-400 text-sm">Try a different search or check back later.</p>
                  </td>
                </tr>
              ) : (
                currentEmployees.map((emp) => (
                  <tr key={emp._id} className="bg-white hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 border-y first:border-l border-gray-200 first:rounded-l-lg text-gray-900 font-semibold">
                      {emp.id}
                    </td>
                    <td className="px-4 py-4 border-y border-gray-200 text-gray-700 font-medium">
                      {emp.name}
                    </td>
                    <td className="px-4 py-4 border-y border-gray-200 text-gray-700 font-medium">
                      {emp.date}
                    </td>
                    <td className="px-4 py-4 border-y border-gray-200">
                      <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold ${statusStyles[emp.status]}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 border-y border-gray-200 text-gray-700 font-medium">
                      {emp.verifiedBy}
                    </td>
                    <td className="px-4 py-4 border-y last:border-r border-gray-200 last:rounded-r-lg">
                      <button
                        onClick={() => setSelectedEmployee(emp)}
                        className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors cursor-pointer"
                      >
                        Preview
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filteredEmployees.length > 0 && totalPages > 1 && (
        <div className="mt-4 flex justify-between items-center px-4 border border-gray-200 p-2 rounded-xl bg-white">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {endIndex} of {filteredEmployees.length} employees
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-base font-medium text-gray-600 hover:text-gray-900"
            >
              Previous
            </button>
            <div className="flex gap-1">
              {getPageNumbers().map((page, idx, arr) => {
                const showEllipsisBefore = idx > 0 && page - arr[idx - 1] > 1;
                return (
                  <React.Fragment key={page}>
                    {showEllipsisBefore && (
                      <span className="px-2 text-gray-400">...</span>
                    )}
                    <button
                      onClick={() => handlePageChange(page)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                        currentPage === page
                          ? 'border border-gray-900 text-gray-900 bg-white'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-base font-medium text-gray-600 hover:text-gray-900"
            >
              Next
            </button>
          </div>
        </div>
      )}
      {/* Modal */}
      {selectedEmployee && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-opacity-40 z-50 flex items-center justify-center"
          onClick={() => setSelectedEmployee(null)}
        >
          <div
            className="bg-white rounded-lg shadow-lg p-6 w-[90%] max-w-6xl relative"
            onClick={(e) => e.stopPropagation()}
          >
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
              <div><strong>Department:</strong> {selectedEmployee.raw.department}</div>
              <div><strong>Designation:</strong> {selectedEmployee.raw.designation}</div>
              <div><strong>Date of Joining:</strong> {new Date(selectedEmployee.raw.dateOfJoining).toLocaleDateString("en-GB")}</div>
              <div><strong>Sex:</strong> {selectedEmployee.raw.sex}</div>
              <div><strong>Email:</strong> {selectedEmployee.raw.email}</div>
              <div><strong>Mobile:</strong> {selectedEmployee.raw.mobileNo}</div>
              <div><strong>Emergency:</strong> {selectedEmployee.raw.emergencyNo}</div>
            </div>


            <h3 className="text-lg font-semibold mb-2">Documents</h3>
            <div className="flex flex-wrap gap-3 mb-6">
              {selectedEmployee.allDocs?.map((doc, i) => (
                <a
                  key={i}
                  href={`${API_CONFIG.BASE_URL}/${doc.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-40 h-24 border rounded shadow flex items-center justify-center text-sm bg-gray-50 hover:bg-gray-100"
                >
                  {doc.label}
                </a>
              ))}
            </div>


            <div className="flex justify-end gap-4">
              <button
                className="bg-red-500 text-white px-4 py-2 rounded"
                onClick={handleReject}
              >
                Reject
              </button>
              <button
                className="bg-green-600 text-white px-4 py-2 rounded"
                onClick={handleApprove}
              >
                Approve
              </button>
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded"
                onClick={handleDownloadAll}
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default DocumentsVerification;



