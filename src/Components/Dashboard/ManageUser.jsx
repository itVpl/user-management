import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AdminIcon } from '../../assets/image';
import { ArrowDown } from '../../assets/image';
import AddUserModal from './AddUser';

const ManageUser = () => {
  const [users, setUsers] = useState([]);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const usersPerPage = 10;

    useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = () => {
    axios
      .get('https://vpl-liveproject-1.onrender.com/api/v1/inhouseUser', { withCredentials: true })
      .then(res => setUsers(res.data.employees || []))
      .catch(err => console.error('Error fetching users:', err));
  };
 


  useEffect(() => {
    axios
      .get('https://vpl-liveproject-1.onrender.com/api/v1/inhouseUser', { withCredentials: true })
      .then(res => {
        const fetchedUsers = res.data.employees || [];
        const usersWithStatus = fetchedUsers.map(u => ({ ...u, isActive: true }));
        setUsers(usersWithStatus);
      })
      .catch(err => console.error('Error fetching users:', err));
  }, []);

  const toggleExpand = (idx) => {
    setExpandedIndex(idx === expandedIndex ? null : idx);
  };

 const toggleStatus = async (idx) => {
    const updatedUsers = [...users];
    const user = updatedUsers[idx];
    const newStatus = user.isActive ? 'inactive' : 'active';

    try {
      await axios.patch(
        `https://vpl-liveproject-1.onrender.com/api/v1/inhouseUser/${user.empId}/status`,
        { status: newStatus },
        { withCredentials: true }
      );
      user.isActive = !user.isActive;
      setUsers(updatedUsers);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status. Please try again.');
    }
  };

  const filteredUsers = users.filter((user) =>
    user.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const extractDocumentUrls = (docsObj) => {
    if (!docsObj) return [];
    return Object.entries(docsObj).flatMap(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map(item => ({ name: key, url: item }));
      } else {
        return [{ name: key, url: value }];
      }
    });
  };

  const downloadFile = (url, name) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllFiles = (files) => {
    files.forEach(doc => {
      const fullUrl = `https://vpl-liveproject-1.onrender.com/${doc.url.startsWith('/') ? doc.url.slice(1) : doc.url}`;
      downloadFile(fullUrl, doc.url.split('/').pop());
    });
  };

  return (
    <div className="p-6">
      {showModal && <AddUserModal onClose={() => { setShowModal(false); fetchUsers(); }} />}
      <div className="flex justify-between items-center mb-4">
             <button
          className="border px-4 py-2 rounded-full text-blue-600 font-semibold"
          onClick={() => setShowModal(true)}
        >
          + Add Admin
        </button>
        <input
          type="text"
          placeholder="Search Employees"
          className="border p-2 rounded-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <table className="w-full text-sm text-left">
        <thead className="bg-blue-50">
          <tr>
            <th className="p-3">User</th>
            <th className="p-3">Role</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentUsers.map((user, idx) => {
            const globalIndex = indexOfFirstUser + idx;
            return (
              <React.Fragment key={user._id}>
                <tr className="border-b">
                  <td className="flex items-center p-3">
                    <button onClick={() => toggleExpand(globalIndex)} className="mr-2">
                      <img src={ArrowDown} alt="" />
                    </button>
                    <img src={AdminIcon} className="w-6 h-6 mr-2" alt="Admin" />
                    <div>
                      <div className="font-semibold">{user.employeeName}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="p-3 text-blue-600 font-medium">Admin</td>
                  <td className="p-3">
                    <div className="inline-flex bg-gray-200 rounded-full overflow-hidden text-xs font-medium">
                      <button
                        onClick={() => toggleStatus(globalIndex)}
                        className={`cursor-pointer px-4 py-1 transition ${
                          user.isActive ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        Active
                      </button>
                      <button
                        onClick={() => toggleStatus(globalIndex)}
                        className={`px-4 cursor-pointer py-1 transition ${
                          !user.isActive ? 'bg-gray-500 text-white' : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        De-Activate
                      </button>
                    </div>
                  </td>
                </tr>

                {expandedIndex === globalIndex && (() => {
                  const allDocs = [
                    ...extractDocumentUrls(user.identityDocs),
                    ...extractDocumentUrls(user.previousCompanyDocs)
                  ];
                  return (
                    <tr className="bg-gray-50">
                      <td colSpan="3" className="p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h3 className="font-semibold text-lg mb-2">Personal Details</h3>
                            <ul className="text-sm space-y-1">
                              <li><strong>Employee ID:</strong> {user.empId}</li>
                              <li><strong>Name:</strong> {user.employeeName}</li>
                              <li><strong>Department:</strong> {user.department}</li>
                              <li><strong>Designation:</strong> {user.designation}</li>
                              <li><strong>Date of Joining:</strong> {user.dateOfJoining}</li>
                              <li><strong>Mobile:</strong> {user.mobileNo}</li>
                              <li><strong>Alternate No:</strong> {user.alternateNo}</li>
                              <li><strong>Account No:</strong> {user.bankDetails.accountNumber}</li>
                              <li><strong>Emergency Number:</strong> {user.emergencyNo}</li>
                              <li><strong>Email:</strong> {user.email}</li>
                              <li><strong>Sex:</strong> {user.sex}</li>
                              <li><strong>Account holder name:</strong> {user.bankDetails.accountHolderName}</li>
                              <li><strong>IFSC Code:</strong> {user.bankDetails.ifscCode}</li>
                            </ul>
                          </div>

                          <div>
                            <h3 className="font-semibold text-lg mb-2">Documents</h3>
                            <div className="flex flex-wrap gap-4">
                              {allDocs.map((doc, i) => (
                                <div key={i} className="flex flex-col items-center cursor-pointer">
                                  <span className="text-xs text-gray-600 mb-1">{doc.name}</span>
                                  <img
                                    src={`https://vpl-liveproject-1.onrender.com/${doc.url.startsWith('/') ? doc.url.slice(1) : doc.url}`}
                                    alt={doc.name}
                                    className="w-20 h-20 object-cover border rounded"
                                    onClick={() =>
                                      downloadFile(
                                        `https://vpl-liveproject-1.onrender.com/${doc.url.startsWith('/') ? doc.url.slice(1) : doc.url}`,
                                        doc.url.split('/').pop()
                                      )
                                    }
                                  />
                                </div>
                              ))}
                            </div>
                            <button
                              onClick={() => downloadAllFiles(allDocs)}
                              className="mt-3 bg-blue-600 text-white px-4 py-2 rounded"
                            >
                              Download
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })()}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      <div className="flex justify-between items-center mt-4 text-sm">
        <span>
          Showing {indexOfFirstUser + 1} to {Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length} entries
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageUser;
