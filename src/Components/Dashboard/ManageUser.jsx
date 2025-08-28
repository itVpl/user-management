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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
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
      // Use the URL directly as it's already a full AWS S3 URL
      downloadFile(doc.url, doc.url.split('/').pop());
    });
  };

  const getFileIcon = (url) => {
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return { icon: '📄', color: 'text-red-500', label: 'PDF' };
      case 'doc':
      case 'docx':
        return { icon: '📝', color: 'text-blue-500', label: 'DOC' };
      case 'jpg':
      case 'jpeg':
      case 'png':
        return { icon: '🖼️', color: 'text-green-500', label: 'IMG' };
      default:
        return { icon: '📄', color: 'text-gray-500', label: 'FILE' };
    }
  };

  const getFilePreview = (doc) => {
    const fileInfo = getFileIcon(doc.url);
    const isImage = ['jpg', 'jpeg', 'png'].includes(doc.url.split('.').pop()?.toLowerCase());
    
    return (
      <div 
        className="w-20 h-20 border rounded bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors relative group"
        onClick={() => downloadFile(doc.url, doc.url.split('/').pop())}
        title={`Click to download ${doc.name}`}
      >
        {isImage ? (
          <img
            src={doc.url}
            alt={doc.name}
            className="w-full h-full object-cover rounded"
            onError={(e) => {
              // Fallback to icon if image fails to load
              e.target.style.display = 'none';
              const fallback = e.target.parentElement.querySelector('.fallback-icon');
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : (
          <div className={`text-center ${fileInfo.color} flex flex-col items-center justify-center h-full`}>
            <div className="text-2xl mb-1">{fileInfo.icon}</div>
            <div className="text-xs font-semibold">{fileInfo.label}</div>
          </div>
        )}
        
        {/* Fallback icon for failed images */}
        <div className={`fallback-icon text-center ${fileInfo.color} absolute inset-0 flex flex-col items-center justify-center`} style={{ display: 'none' }}>
          <div className="text-2xl mb-1">{fileInfo.icon}</div>
          <div className="text-xs font-semibold">{fileInfo.label}</div>
        </div>
        
        {/* Download overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
          <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs font-semibold">
            Download
          </div>
        </div>
      </div>
    );
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

const handleEditUser = (user) => {
  setEditingUser(user);
  setShowEditModal(true);
};

const handleUpdateUser = async (updatedData) => {
  try {
    const config = {
      headers: { 'Content-Type': 'multipart/form-data' },
      withCredentials: true
    };

    const response = await axios.put(
      `https://vpl-liveproject-1.onrender.com/api/v1/inhouseUser/${editingUser.empId}`,
      updatedData,
      config
    );
    
    console.log('Update Response:', response.data);
    alert('User updated successfully!');
    setShowEditModal(false);
    setEditingUser(null);
    fetchUsers(); // Refresh the list
  } catch (error) {
    console.error('Failed to update user:', error);
    alert(error?.response?.data?.message || 'Failed to update user. Please try again.');
  }
};

  return (
    <div className="p-6">
      

      {showModal && <AddUserModal onClose={() => { setShowModal(false); fetchUsers(); }} />}
      {showEditModal && editingUser && (
        <EditUserModal 
          user={editingUser} 
          onClose={() => { setShowEditModal(false); setEditingUser(null); }} 
          onUpdate={handleUpdateUser}
        />
      )}
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
                     <div className="flex items-center space-x-2">
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
                       <button
                         onClick={() => handleEditUser(user)}
                         className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors duration-200 flex items-center space-x-1"
                         title="Edit User"
                       >
                         <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                         </svg>
                         <span>Edit</span>
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
                             <div className="grid grid-cols-4 gap-4 mb-4">
                               {allDocs.map((doc, i) => (
                                 <div key={i} className="flex flex-col items-center">
                                   <span className="text-xs text-gray-700 mb-2 font-semibold text-center capitalize">
                                     {doc.name.replace(/([A-Z])/g, ' $1').trim()}
                                   </span>
                                   {getFilePreview(doc)}
                                 </div>
                               ))}
                             </div>
                             <button
                               onClick={() => downloadAllFiles(allDocs)}
                               className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors duration-200 flex items-center space-x-2"
                             >
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                               </svg>
                               <span>Download All</span>
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

// Edit User Modal Component
const EditUserModal = ({ user, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    employeeName: user.employeeName || '',
    email: user.email || '',
    mobileNo: user.mobileNo || '',
    alternateNo: user.alternateNo || '',
    emergencyNo: user.emergencyNo || '',
    department: user.department || '',
    designation: user.designation || '',
    basicSalary: user.basicSalary || '',
    sex: user.sex || '',
    dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
    dateOfJoining: user.dateOfJoining ? new Date(user.dateOfJoining).toISOString().split('T')[0] : '',
    accountHolderName: user.bankDetails?.accountHolderName || '',
    accountNumber: user.bankDetails?.accountNumber || '',
    ifscCode: user.bankDetails?.ifscCode || '',
    role: user.role || 'employee'
  });

  const [files, setFiles] = useState({
    pancard: null,
    aadharcard: null,
    educationalDocs: [],
    releaseLetter: null,
    offerLetter: null,
    experienceLetter: null,
    bankStatementOrSalarySlip: [],
  });

  const [uploadStatus, setUploadStatus] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateFile = (file, maxSize = 10 * 1024 * 1024) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File type not supported. Please upload PDF, DOC, DOCX, or image files.' };
    }
    
    if (file.size > maxSize) {
      return { valid: false, error: `File size too large. Maximum size is ${maxSize / (1024 * 1024)}MB.` };
    }
    
    return { valid: true };
  };

  const handleFileChange = (e) => {
    const { name, files: selected } = e.target;
    
    if (selected.length === 0) return;
    
    const fileList = Array.from(selected);
    const validationResults = fileList.map(file => validateFile(file));
    
    const hasErrors = validationResults.some(result => !result.valid);
    if (hasErrors) {
      const errors = validationResults.filter(result => !result.valid).map(result => result.error);
      alert(`File validation errors:\n${errors.join('\n')}`);
      return;
    }
    
    setFiles(prev => ({
      ...prev,
      [name]: name === 'educationalDocs' || name === 'bankStatementOrSalarySlip' ? fileList : fileList[0]
    }));
    
    setUploadStatus(prev => ({
      ...prev,
      [name]: { status: 'selected', fileName: fileList[0]?.name || `${fileList.length} files selected` }
    }));
  };

  const getFileIcon = (url) => {
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return { icon: '📄', color: 'text-red-500', label: 'PDF' };
      case 'doc':
      case 'docx':
        return { icon: '📝', color: 'text-blue-500', label: 'DOC' };
      case 'jpg':
      case 'jpeg':
      case 'png':
        return { icon: '🖼️', color: 'text-green-500', label: 'IMG' };
      default:
        return { icon: '📄', color: 'text-gray-500', label: 'FILE' };
    }
  };

  const getFilePreview = (doc) => {
    const fileInfo = getFileIcon(doc.url);
    const isImage = ['jpg', 'jpeg', 'png'].includes(doc.url.split('.').pop()?.toLowerCase());
    
    return (
      <div className="w-16 h-16 border rounded bg-gray-100 flex items-center justify-center relative group">
        {isImage ? (
          <img
            src={doc.url}
            alt={doc.name}
            className="w-full h-full object-cover rounded"
            onError={(e) => {
              e.target.style.display = 'none';
              const fallback = e.target.parentElement.querySelector('.fallback-icon');
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : (
          <div className={`text-center ${fileInfo.color} flex flex-col items-center justify-center h-full`}>
            <div className="text-lg mb-1">{fileInfo.icon}</div>
            <div className="text-xs font-semibold">{fileInfo.label}</div>
          </div>
        )}
        
        <div className={`fallback-icon text-center ${fileInfo.color} absolute inset-0 flex flex-col items-center justify-center`} style={{ display: 'none' }}>
          <div className="text-lg mb-1">{fileInfo.icon}</div>
          <div className="text-xs font-semibold">{fileInfo.label}</div>
        </div>
      </div>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const submitData = new FormData();

             // Add form data (excluding bank details which are handled separately)
       Object.entries(formData).forEach(([key, val]) => {
         // Skip bank details as they're handled separately
         if (['accountHolderName', 'accountNumber', 'ifscCode'].includes(key)) {
           return;
         }
         
         if (key === 'dateOfBirth' || key === 'dateOfJoining') {
           // Format date fields to DD-MM-YYYY format for API
           const date = new Date(val);
           const day = String(date.getDate()).padStart(2, '0');
           const month = String(date.getMonth() + 1).padStart(2, '0');
           const year = date.getFullYear();
           submitData.append(key, `${day}-${month}-${year}`);
         } else {
           submitData.append(key, val);
         }
       });

             // Add bank details as individual fields (same as AddUser component)
       submitData.append('accountHolderName', formData.accountHolderName);
       submitData.append('accountNumber', formData.accountNumber);
       submitData.append('ifscCode', formData.ifscCode);

      // Add files
      Object.entries(files).forEach(([key, val]) => {
        if (Array.isArray(val)) {
          val.forEach(file => submitData.append(key, file));
        } else if (val) {
          submitData.append(key, val);
        }
      });

      // Update status for files being uploaded
      Object.keys(files).forEach(key => {
        if (files[key]) {
          setUploadStatus(prev => ({ ...prev, [key]: { status: 'uploading', fileName: Array.isArray(files[key]) ? files[key][0]?.name : files[key].name } }));
        }
      });

      await onUpdate(submitData);
    } catch (error) {
      console.error('Error updating user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm overflow-hidden">
      <div className="bg-white rounded-3xl shadow-2xl w-[98%] max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 via-blue-600 to-green-800 text-white p-8 rounded-t-3xl flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold mb-2">Edit User</h2>
              <p className="text-green-100 text-lg">Update user information for {user.employeeName}</p>
            </div>
            <button 
              onClick={onClose} 
              className="text-white hover:text-red-200 text-4xl font-bold transition-all duration-300 hover:scale-110"
            >
              ×
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Employee Details */}
            <div className="bg-gradient-to-br from-green-50 via-blue-50 to-green-100 rounded-2xl p-8 shadow-xl border border-green-200">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center mr-4 shadow-lg">
                  <span className="text-white font-bold text-lg">👤</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">Employee Details</h3>
                  <p className="text-gray-600">Update basic information</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Employee Name</label>
                  <input
                    name="employeeName"
                    type="text"
                    value={formData.employeeName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-300"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Email</label>
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-300"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Mobile Number</label>
                  <input
                    name="mobileNo"
                    type="text"
                    value={formData.mobileNo}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-300"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Alternate Number</label>
                  <input
                    name="alternateNo"
                    type="text"
                    value={formData.alternateNo}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-300"
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Emergency Number</label>
                  <input
                    name="emergencyNo"
                    type="text"
                    value={formData.emergencyNo}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-300"
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Gender</label>
                  <select
                    name="sex"
                    value={formData.sex}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-300"
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Department</label>
                  <input
                    name="department"
                    type="text"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-300"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Designation</label>
                  <input
                    name="designation"
                    type="text"
                    value={formData.designation}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-300"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Basic Salary</label>
                  <input
                    name="basicSalary"
                    type="number"
                    value={formData.basicSalary}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-300"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Date of Birth</label>
                  <input
                    name="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-300"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Date of Joining</label>
                  <input
                    name="dateOfJoining"
                    type="date"
                    value={formData.dateOfJoining}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-300"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-300"
                    required
                  >
                    <option value="superadmin">Superadmin</option>
                    <option value="admin">Admin</option>
                    <option value="employee">Employee</option>
                    <option value="hr">HR</option>
                    <option value="teamlead">Team Lead</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Banking Details */}
            <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-8 shadow-xl border border-blue-200">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mr-4 shadow-lg">
                  <span className="text-white font-bold text-lg">🏦</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">Banking Details</h3>
                  <p className="text-gray-600">Update bank account information</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Account Holder Name</label>
                  <input
                    name="accountHolderName"
                    type="text"
                    value={formData.accountHolderName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all duration-300"
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Account Number</label>
                  <input
                    name="accountNumber"
                    type="text"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all duration-300"
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">IFSC Code</label>
                  <input
                    name="ifscCode"
                    type="text"
                    value={formData.ifscCode}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all duration-300"
                  />
                </div>
              </div>
                         </div>

             {/* Identity Documents */}
             <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl p-8 shadow-xl border border-green-200">
               <div className="flex items-center mb-8">
                 <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center mr-4 shadow-lg">
                   <span className="text-white font-bold text-lg">🆔</span>
                 </div>
                 <div>
                   <h3 className="text-2xl font-bold text-gray-800">Identity Documents</h3>
                   <p className="text-gray-600">Update identity verification documents</p>
                 </div>
               </div>
               
               {/* Current Documents Display */}
               <div className="mb-6">
                 <h4 className="text-lg font-semibold text-gray-700 mb-4">Current Documents:</h4>
                 <div className="grid grid-cols-3 gap-4 mb-4">
                   {user.identityDocs && Object.entries(user.identityDocs).map(([key, value]) => {
                     const docs = Array.isArray(value) ? value : [value];
                     return docs.map((doc, index) => (
                       <div key={`${key}-${index}`} className="flex flex-col items-center">
                         <span className="text-xs text-gray-600 mb-2 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                         {getFilePreview({ name: key, url: doc })}
                       </div>
                     ));
                   })}
                 </div>
               </div>

               {/* New Document Upload */}
               <div className="grid grid-cols-3 gap-6">
                 {[
                   { key: 'pancard', label: 'PAN Card', icon: '🆔' },
                   { key: 'aadharcard', label: 'Aadhar Card', icon: '🆔' },
                   { key: 'educationalDocs', label: 'Educational Documents', icon: '📚' }
                 ].map((doc) => (
                   <div key={doc.key} className="space-y-3">
                     <label className="block text-sm font-bold text-gray-700 flex items-center">
                       <span className="mr-2 text-lg">{doc.icon}</span>
                       {doc.label}
                     </label>
                     <div className="relative">
                       <input
                         type="file"
                         id={doc.key}
                         name={doc.key}
                         multiple={doc.key === 'educationalDocs'}
                         onChange={handleFileChange}
                         className="hidden"
                         disabled={isSubmitting}
                       />
                       <label
                         htmlFor={doc.key}
                         className={`block w-full px-4 py-4 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all duration-300 ${
                           isSubmitting 
                             ? 'border-gray-300 cursor-not-allowed opacity-50' 
                             : 'border-green-300 hover:bg-green-50 hover:border-green-400 hover:shadow-lg'
                         }`}
                       >
                         <div className="flex flex-col items-center">
                           <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-2 shadow-lg">
                             <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                             </svg>
                           </div>
                           <span className="text-sm font-bold text-green-700">Update {doc.label}</span>
                           <span className="text-xs text-gray-500 mt-1">Click to browse files</span>
                         </div>
                       </label>
                     </div>
                     
                     {/* File Status Display */}
                     {uploadStatus[doc.key] && (
                       <div className="mt-2 p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                         <div className="flex items-center justify-between">
                           <div className="flex items-center space-x-2">
                             <span className="text-sm">{uploadStatus[doc.key].fileName}</span>
                           </div>
                           <span className={`text-xs px-2 py-1 rounded-full ${
                             uploadStatus[doc.key].status === 'success' ? 'bg-green-100 text-green-800' :
                             uploadStatus[doc.key].status === 'error' ? 'bg-red-100 text-red-800' :
                             uploadStatus[doc.key].status === 'uploading' ? 'bg-yellow-100 text-yellow-800' :
                             'bg-blue-100 text-blue-800'
                           }`}>
                             {uploadStatus[doc.key].status}
                           </span>
                         </div>
                       </div>
                     )}
                   </div>
                 ))}
               </div>
             </div>

             {/* Previous Company Documents */}
             <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 rounded-2xl p-8 shadow-xl border border-purple-200">
               <div className="flex items-center mb-8">
                 <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mr-4 shadow-lg">
                   <span className="text-white font-bold text-lg">🏢</span>
                 </div>
                 <div>
                   <h3 className="text-2xl font-bold text-gray-800">Previous Company Documents</h3>
                   <p className="text-gray-600">Update documents from previous employment</p>
                 </div>
               </div>
               
               {/* Current Documents Display */}
               <div className="mb-6">
                 <h4 className="text-lg font-semibold text-gray-700 mb-4">Current Documents:</h4>
                 <div className="grid grid-cols-4 gap-4 mb-4">
                   {user.previousCompanyDocs && Object.entries(user.previousCompanyDocs).map(([key, value]) => {
                     const docs = Array.isArray(value) ? value : [value];
                     return docs.map((doc, index) => (
                       <div key={`${key}-${index}`} className="flex flex-col items-center">
                         <span className="text-xs text-gray-600 mb-2 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                         {getFilePreview({ name: key, url: doc })}
                       </div>
                     ));
                   })}
                 </div>
               </div>

               {/* New Document Upload */}
               <div className="grid grid-cols-2 gap-6">
                 {[
                   { key: 'releaseLetter', label: 'Release Letter', icon: '📄' },
                   { key: 'offerLetter', label: 'Offer Letter', icon: '📋' },
                   { key: 'experienceLetter', label: 'Experience Letter', icon: '📝' },
                   { key: 'bankStatementOrSalarySlip', label: 'Bank Statement/Salary Slip', icon: '💰' }
                 ].map((doc) => (
                   <div key={doc.key} className="space-y-3">
                     <label className="block text-sm font-bold text-gray-700 flex items-center">
                       <span className="mr-2 text-lg">{doc.icon}</span>
                       {doc.label}
                     </label>
                     <div className="relative">
                       <input
                         type="file"
                         id={doc.key}
                         name={doc.key}
                         multiple={doc.key === 'bankStatementOrSalarySlip'}
                         onChange={handleFileChange}
                         className="hidden"
                         disabled={isSubmitting}
                       />
                       <label
                         htmlFor={doc.key}
                         className={`block w-full px-4 py-4 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all duration-300 ${
                           isSubmitting 
                             ? 'border-gray-300 cursor-not-allowed opacity-50' 
                             : 'border-purple-300 hover:bg-purple-50 hover:border-purple-400 hover:shadow-lg'
                         }`}
                       >
                         <div className="flex flex-col items-center">
                           <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-2 shadow-lg">
                             <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                             </svg>
                           </div>
                           <span className="text-sm font-bold text-purple-700">Update {doc.label}</span>
                           <span className="text-xs text-gray-500 mt-1">Click to browse files</span>
                         </div>
                       </label>
                     </div>
                     
                     {/* File Status Display */}
                     {uploadStatus[doc.key] && (
                       <div className="mt-2 p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                         <div className="flex items-center justify-between">
                           <div className="flex items-center space-x-2">
                             <span className="text-sm">{uploadStatus[doc.key].fileName}</span>
                           </div>
                           <span className={`text-xs px-2 py-1 rounded-full ${
                             uploadStatus[doc.key].status === 'success' ? 'bg-green-100 text-green-800' :
                             uploadStatus[doc.key].status === 'error' ? 'bg-red-100 text-red-800' :
                             uploadStatus[doc.key].status === 'uploading' ? 'bg-yellow-100 text-yellow-800' :
                             'bg-blue-100 text-blue-800'
                           }`}>
                             {uploadStatus[doc.key].status}
                           </span>
                         </div>
                       </div>
                     )}
                   </div>
                 ))}
               </div>
             </div>

             {/* Submit Button */}
            <div className="flex justify-end space-x-6 pt-8 border-t-2 border-gray-200">
              <button 
                type="button" 
                onClick={onClose}
                className="px-10 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className={`px-10 py-4 bg-gradient-to-r from-green-600 via-blue-600 to-green-700 text-white rounded-xl font-bold transition-all duration-300 shadow-xl hover:shadow-2xl ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:from-green-700 hover:via-blue-700 hover:to-green-800 transform hover:scale-105'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Updating...</span>
                  </div>
                ) : (
                  'Update User'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ManageUser;
