import React, { useEffect, useState } from "react";
import axios from "axios";
import API_CONFIG from '../../config/api.js';
const DocumentsVerification = () => {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);


  const statusStyles = {
    Pending: "bg-yellow-400 text-black",
    Rejected: "bg-red-500 text-white",
    Approved: "bg-green-600 text-white",
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
      <h1 className="text-2xl font-bold mb-4">Documents Verification</h1>


      <table className="w-full bg-white shadow-md rounded-md overflow-hidden">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="p-3">Employee ID</th>
            <th className="p-3">Employee Name</th>
            <th className="p-3">Uploaded Date</th>
            <th className="p-3">Status</th>
            <th className="p-3">Verified By</th>
            <th className="p-3">Action</th>
          </tr>
        </thead>
        <tbody>
  {loading ? (
    <tr>
      <td colSpan="6" className="py-12">
        <div className="flex flex-col justify-center items-center bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg py-16 mx-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-purple-600 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-xl font-semibold text-gray-800 mb-2">Loading Documents...</p>
            <p className="text-sm text-gray-600">Please wait while we fetch employee documents</p>
          </div>
        </div>
      </td>
    </tr>
  ) : (
    employees.map((emp) => (
      <tr key={emp._id} className="border-t">
        <td className="p-3">{emp.id}</td>
        <td className="p-3">{emp.name}</td>
        <td className="p-3">{emp.date}</td>
        <td className="p-3">
          <span className={`px-2 py-1 rounded ${statusStyles[emp.status]}`}>
            {emp.status}
          </span>
        </td>
        <td className="p-3">{emp.verifiedBy}</td>
        <td className="p-3">
          <button
            onClick={() => setSelectedEmployee(emp)}
            className="bg-blue-500 text-white px-3 py-1 rounded"
          >
            Preview
          </button>
        </td>
      </tr>
    ))
  )}
</tbody>


        {/* <tbody>
         
          {employees.map((emp) => (
            <tr key={emp._id} className="border-t">
              <td className="p-3">{emp.id}</td>
              <td className="p-3">{emp.name}</td>
              <td className="p-3">{emp.date}</td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded ${statusStyles[emp.status]}`}>
                  {emp.status}
                </span>
              </td>
              <td className="p-3">{emp.verifiedBy}</td>
              <td className="p-3">
                <button
                  onClick={() => setSelectedEmployee(emp)}
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  Preview
                </button>
              </td>
            </tr>
          ))}
        </tbody> */}
      </table>


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



