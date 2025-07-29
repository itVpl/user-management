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
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmAction, setConfirmAction] = useState('');
  const usersPerPage = 10;
  

    useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = () => {
     setLoading(true);
    axios
      .get('https://vpl-liveproject-1.onrender.com/api/v1/inhouseUser', { withCredentials: true })
      .then(res => {
        const fetchedUsers = res.data.employees || [];
        // Map the actual status from server data
        const usersWithStatus = fetchedUsers.map(u => ({ 
          ...u, 
          isActive: u.status === 'active' || u.status === undefined 
        }));
        setUsers(usersWithStatus);
        setLoading(false);
      })
      .catch(err => { 
        console.error('Error fetching users:', err);
        setLoading(false);
      });
  };
  
  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleExpand = (idx) => {
    setExpandedIndex(idx === expandedIndex ? null : idx);
  };

 const toggleStatus = async (idx) => {
    const updatedUsers = [...users];
    const user = updatedUsers[idx];
    const newStatus = user.isActive ? 'inactive' : 'active';
    const actionText = user.isActive ? 'deactivate' : 'activate';

    // Show confirmation modal first
    setSelectedUser(user);
    setConfirmAction(actionText);
    setShowConfirmModal(true);
  };

  const confirmStatusChange = async () => {
    if (!selectedUser) return;

    const updatedUsers = [...users];
    const user = selectedUser;
    const newStatus = user.isActive ? 'inactive' : 'active';

    try {
      const response = await axios.patch(
        `https://vpl-liveproject-1.onrender.com/api/v1/inhouseUser/${user.empId}/status`,
        { status: newStatus },
        { withCredentials: true }
      );
      
      console.log('API Response:', response.data);
      
      // Update the specific user's status in local state immediately
      const userToUpdate = updatedUsers.find(u => u.empId === user.empId);
      if (userToUpdate) {
        userToUpdate.isActive = !userToUpdate.isActive;
        setUsers([...updatedUsers]);
      }
      
      // Show success popup
      const statusText = newStatus === 'active' ? 'ACTIVE' : 'INACTIVE';
      // alert(`✅ User ${user.employeeName} is now ${statusText}!`);
      
      // Close confirmation modal
      setShowConfirmModal(false);
      setSelectedUser(null);
      
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('❌ Failed to update status. Please try again.');
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


const handleRoleChange = async (empId, newRole) => {
  console.log("PATCH /assign-role/", empId, "Payload:", { role: newRole });

  try {
    await axios.patch(
      `https://vpl-liveproject-1.onrender.com/api/v1/inhouseUser/assign-role/${empId}`,
      { role: newRole },
      { withCredentials: true }
    );
    fetchUsers(); // Refresh list
    alert(`Role updated to ${newRole}`);
  } catch (error) {
    console.error('Failed to update role:', error);
    alert(error?.response?.data?.message || 'Failed to update role. Please try again.');
  }
};

  return (
    <div className="p-6">
      

      {showModal && <AddUserModal onClose={() => { setShowModal(false); fetchUsers(); }} />}
      <div className="flex justify-between items-center mb-4">
             <button
          className="border px-4 py-2 rounded-full text-blue-600 font-semibold"
          onClick={() => setShowModal(true)}
        >
          + Add User
        </button>
        <input
          type="text"
          placeholder="Search Employees"
          className="border p-2 rounded-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
 {loading ? (
      <div className="flex justify-center items-center h-60">
        <div className="w-10 h-10 border-b-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        {/* animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto */}
        <span className="ml-2 text-gray-600">Loading users...</span>
      </div>
    ) : (
            <>
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
                  <td className="p-3">
  <select
    value={user.role}
    onChange={(e) => handleRoleChange(user.empId, e.target.value)}
    className="d px-2 py-1 text-sm"
  >
    <option value="superadmin">Superadmin</option>
    <option value="admin">Admin</option>
    <option value="employee">Employee</option>
    <option value="hr">HR</option>
    <option value="teamlead">Team Lead</option>
    {/* Add more roles as needed */}
  </select>
</td>

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
        </>)}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              {/* Icon */}
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              
              {/* Title */}
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Confirm Status Change
              </h3>
              
              {/* Message */}
              <p className="text-gray-600 mb-6">
                Are you sure you want to <span className="font-semibold text-blue-600">{confirmAction}</span> user{' '}
                <span className="font-semibold text-gray-800">{selectedUser?.employeeName}</span>?
              </p>
              
              {/* Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setSelectedUser(null);
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmStatusChange}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUser;
