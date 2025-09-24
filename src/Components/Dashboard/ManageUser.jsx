import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AdminIcon } from '../../assets/image';
import { ArrowDown } from '../../assets/image';
import AddUserModal from './AddUser';
import API_CONFIG from '../../config/api.js';

// ---- helpers: date & sort ----
const parseDateFlexible = (val) => {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'number') return new Date(val);
  if (typeof val !== 'string') return null;

  const m = val.match(/^(\d{2})-(\d{2})-(\d{4})$/); // DD-MM-YYYY
  if (m) {
    const [, dd, mm, yyyy] = m;
    const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    return isNaN(d) ? null : d;
  }
  const d = new Date(val); // ISO etc.
  return isNaN(d) ? null : d;
};

const formatDateDisplay = (val) => {
  const d = parseDateFlexible(val);
  if (!d) return val ?? '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`; // no timezone
};

const getCreatedAt = (u) => {
  if (u?.createdAt) {
    const t = new Date(u.createdAt).getTime();
    if (!isNaN(t)) return t;
  }
  if (u?.dateOfJoining) {
    const t = parseDateFlexible(u.dateOfJoining)?.getTime();
    if (t) return t;
  }
  if (u?._id && typeof u._id === 'string' && u._id.length >= 8) {
    const seconds = parseInt(u._id.slice(0, 8), 16);
    if (!isNaN(seconds)) return seconds * 1000;
  }
  return 0;
};


const ManageUser = () => {
  const [downloading, setDownloading] = useState(false);
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
      .get(`${API_CONFIG.BASE_URL}/api/v1/inhouseUser`, { withCredentials: true })
      .then(res => {
        const fetchedUsers = res.data.employees || [];
        // Map the actual status from server data
        const usersWithStatus = fetchedUsers.map(u => ({
          ...u,
          isActive: u.status === 'active' || u.status === undefined
        }));
        usersWithStatus.sort((a, b) => getCreatedAt(b) - getCreatedAt(a));
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
        `${API_CONFIG.BASE_URL}/api/v1/inhouseUser/${user.empId}/status`,
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

  const downloadFile = async (url, name) => {
    const safe = sanitizeFileName(name || url.split('/').pop() || 'file');
    try {
      const resp = await fetch(url, { credentials: 'include', mode: 'cors' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = safe;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      // hard fallback: just open
      const a = document.createElement('a');
      a.href = url;
      a.download = safe;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };



  // Put this helper near your other helpers
  const sanitizeFileName = (name = 'file') => {
    // strip query/hash, keep basename, remove illegal chars
    const base = name.split(/[?#]/)[0].split('/').pop() || 'file';
    return base
      .replace(/[:*?"<>|\\]/g, '_')     // Windows-illegal
      .replace(/\s+/g, ' ')              // tidy spaces
      .trim()
      .slice(0, 150);                    // keep it reasonable
  };

  const makeUniqueName = (existing, desired) => {
    if (!existing.has(desired)) { existing.add(desired); return desired; }
    const dot = desired.lastIndexOf('.');
    const stem = dot > 0 ? desired.slice(0, dot) : desired;
    const ext = dot > 0 ? desired.slice(dot) : '';
    let i = 2, candidate = `${stem} (${i})${ext}`;
    while (existing.has(candidate)) { i += 1; candidate = `${stem} (${i})${ext}`; }
    existing.add(candidate);
    return candidate;
  };

  const downloadAllFiles = async (files) => {
    if (!files || !files.length) return;
    try {
      const [{ default: JSZip }, { saveAs }] = await Promise.all([
        import('jszip'),
        import('file-saver'),
      ]);

      const zip = new JSZip();
      const usedNames = new Set();
      let added = 0;
      let skipped = 0;

      // Fetch each file robustly
      const results = await Promise.all(
        files.map(async (doc, i) => {
          try {
            const url = String(doc?.url || '');
            if (!url) throw new Error('Empty URL');

            // try to fetch; include credentials if your URLs need cookies
            const res = await fetch(url, { credentials: 'include', mode: 'cors' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            // crude checks to skip HTML error pages served as 200
            const ct = (res.headers.get('content-type') || '').toLowerCase();
            const blob = await res.blob();
            if (!blob || blob.size === 0) throw new Error('Empty file');
            if (ct.includes('text/html')) throw new Error('HTML page, not a file');

            // pick a clean, unique filename
            const rawName =
              (doc?.name ? `${doc.name}-` : '') + (url.split('/').pop() || `doc-${i + 1}`);
            const clean = sanitizeFileName(rawName);
            const finalName = makeUniqueName(usedNames, clean);

            // add to zip
            zip.file(finalName, blob, { binary: true });
            added += 1;
            return { ok: true };
          } catch (err) {
            console.warn('Skip file:', doc?.url, err?.message || err);
            skipped += 1;
            return { ok: false, err };
          }
        })
      );

      if (added === 0) {
        // nothing valid fetched — fall back to individual downloads
        await Promise.allSettled(
          files.map((doc) => downloadFile(doc.url, sanitizeFileName(doc.url.split('/').pop())))
        );
        return;
      }

      const zipped = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
        streamFiles: true,
      });

      saveAs(zipped, `documents_${Date.now()}.zip`);

      // Optional: toast/message
      if (skipped > 0) {
        // eslint-disable-next-line no-alert
        alert(`Downloaded ${added} file(s). Skipped ${skipped} that looked invalid or blocked.`);
      }
    } catch (err) {
      console.error('ZIP build failed, fallback to individual:', err);
      // fallback: individual downloads
      await Promise.allSettled(
        files.map((doc) => downloadFile(doc.url, sanitizeFileName(doc.url.split('/').pop())))
      );
    }
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
        `${API_CONFIG.BASE_URL}/api/v1/inhouseUser/assign-role/${empId}`,
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
        `${API_CONFIG.BASE_URL}/api/v1/inhouseUser/${editingUser.empId}`,
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
              {currentUsers.length === 0 ? (
                <tr>
                  <td colSpan="3" className="p-6 text-center text-gray-600">
                    No Employee Found.
                  </td>
                </tr>
              ) : (
                currentUsers.map((user, idx) => {
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
                                className={`cursor-pointer px-4 py-1 transition ${user.isActive ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                                  }`}
                              >
                                Active
                              </button>
                              <button
                                onClick={() => toggleStatus(globalIndex)}
                                className={`px-4 cursor-pointer py-1 transition ${!user.isActive ? 'bg-gray-500 text-white' : 'text-gray-500 hover:bg-gray-100'
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
                                    <li><strong>Date of Joining:</strong> {formatDateDisplay(user.dateOfJoining)}</li>
                                    {user.dateOfBirth && (
                                      <li><strong>Date of Birth:</strong> {formatDateDisplay(user.dateOfBirth)}</li>
                                    )}
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
                                    onClick={async () => {
                                      try {
                                        setDownloading(true);
                                        await downloadAllFiles(allDocs);   // aapka existing function
                                      } finally {
                                        setDownloading(false);
                                      }
                                    }}
                                    disabled={downloading}
                                    className={`px-6 py-2 rounded-lg font-semibold transition-colors duration-200 flex items-center space-x-2
              ${downloading ? 'bg-blue-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                                    title={downloading ? 'Preparing…' : 'Download all documents as ZIP'}
                                  >
                                    {downloading ? (
                                      <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Preparing…</span>
                                      </>
                                    ) : (
                                      <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span>Download All</span>
                                      </>
                                    )}
                                  </button>

                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })()}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>

          <div className="flex justify-between items-center mt-4 text-sm">
            <span>
              {filteredUsers.length === 0
                ? 'Showing 0 of 0 entries'
                : `Showing ${indexOfFirstUser + 1} to ${Math.min(indexOfLastUser, filteredUsers.length)} of ${filteredUsers.length} entries`}
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
// ==== REPLACE your existing EditUserModal with this ====
// ==== REPLACE your existing EditUserModal with this ====
const EditUserModal = ({ user, onClose, onUpdate }) => {
  // ---- key filters (prevent invalid keystrokes) ----
  const allowKey = (e, type) => {
    const nav = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
    if (nav.includes(e.key)) return;
    if (type === 'digit' && !/^\d$/.test(e.key)) e.preventDefault();
    if (type === 'alnum' && !/^[A-Za-z0-9]$/.test(e.key)) e.preventDefault();
  };

  // IFSC regex (SBIN0XXXXXX style)
  const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  const [formData, setFormData] = React.useState({
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
    role: user.role || 'employee',
  });

  const [files, setFiles] = React.useState({
    pancard: null,
    aadharcard: null, // API key same; label will show "Aadhaar"
    educationalDocs: [],
    releaseLetter: null,
    offerLetter: null,
    experienceLetter: null,
    bankStatementOrSalarySlip: [],
  });

  const [uploadStatus, setUploadStatus] = React.useState({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState({});
  const [fileErrors, setFileErrors] = React.useState({});

  // ---- helpers ----
  const onlyAlpha = (s) => /^[A-Za-z ]+$/.test((s || '').trim());
  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+(\.[^\s@]+)?$/; // abc@gmail.com / abc@gmail.com.in
  const isValidMobile10 = (s) => /^\d{10}$/.test(s || '') && /^[6-9]/.test(s || '');

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const maxDob = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  const maxDobStr = maxDob.toISOString().split('T')[0];

  // ---- refs for auto-scroll to first error ----
  const scrollAreaRef = React.useRef(null);
  const employeeNameRef = React.useRef(null);
  const sexRef = React.useRef(null);
  const emailRef = React.useRef(null);
  const mobileNoRef = React.useRef(null);
  const alternateNoRef = React.useRef(null);
  const emergencyNoRef = React.useRef(null);
  const departmentRef = React.useRef(null);
  const designationRef = React.useRef(null);
  const dobRef = React.useRef(null);
  const dojRef = React.useRef(null);

  const clickDate = (ref) => ref.current?.showPicker?.() ?? ref.current?.focus?.();

  // ---- input change with sanitization ----
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let v = value;

    if (['employeeName', 'department', 'designation'].includes(name)) {
      v = v.replace(/[^A-Za-z ]/g, '').slice(0, 50); // alphabets + space; max 50
    }
    if (name === 'email') {
      v = v.replace(/\s/g, ''); // no spaces
    }
    if (['mobileNo', 'alternateNo', 'emergencyNo'].includes(name)) {
      v = v.replace(/\D/g, '').slice(0, 10); // digits only; max 10
    }
    // ✅ NEW: Strict banking sanitization
    if (name === 'basicSalary') {
      v = v.replace(/\D/g, ''); // digits only
    }
    if (name === 'accountNumber') {
      v = v.replace(/\D/g, '').slice(0, 18); // digits only, max 18
    }
    if (name === 'ifscCode') {
      v = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11); // alnum uppercase, max 11
    }
    setFormData((prev) => ({ ...prev, [name]: v }));
    setErrors((prev) => ({ ...prev, [name]: '' })); // clear field error on change
  };

  // ---- file validation (inline errors) ----
  const validateFile = (file, maxSize = 10 * 1024 * 1024) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/jpg',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowed.includes(file.type)) {
      return { valid: false, error: 'Please upload PDF ,DOC,DOCX or image files only.' };
    }
    if (file.size > maxSize) {
      return { valid: false, error: 'Please upload a file less than 10 mb.' };
    }
    return { valid: true };
  };
  // LIVE errors (run after setFormData if needed, ya isi function me above ki tarah)
  useEffect(() => {
    const vAcc = formData.accountNumber || '';
    if (vAcc && (vAcc.length < 9 || vAcc.length > 18)) {
      setErrors((p) => ({ ...p, accountNumber: 'Please enter the valid account number.' }));
    }
    const vIfsc = (formData.ifscCode || '').toUpperCase();
    if (vIfsc && (vIfsc.length !== 11 || !IFSC_PATTERN.test(vIfsc))) {
      setErrors((p) => ({ ...p, ifscCode: 'Please enter the valid IFSC Code.' }));
    }
    const vSalary = formData.basicSalary || '';
    if (vSalary && Number(vSalary) <= 0) {
      setErrors((p) => ({ ...p, basicSalary: 'Please enter basic salary more than 0.' }));
    }
  }, [formData.accountNumber, formData.ifscCode, formData.basicSalary]);

  const handleFileChange = (e) => {
    const { name, files: selected } = e.target;
    if (!selected || selected.length === 0) return;

    const fileList = Array.from(selected);
    const isMulti = name === 'educationalDocs' || name === 'bankStatementOrSalarySlip';

    // validate each
    let firstError = '';
    for (const f of fileList) {
      const { valid, error } = validateFile(f);
      if (!valid) { firstError = error; break; }
    }
    if (firstError) {
      setFileErrors((prev) => ({ ...prev, [name]: firstError }));
      return;
    }

    // ok, set
    setFileErrors((prev) => ({ ...prev, [name]: '' }));
    setFiles((prev) => ({ ...prev, [name]: isMulti ? fileList : fileList[0] }));

    const label = isMulti
      ? `${fileList.length} file(s) selected`
      : (fileList[0]?.name || '1 file selected');
    setUploadStatus((prev) => ({ ...prev, [name]: { status: 'selected', fileName: label } }));
  };

  // small util for previews
  const getFileIcon = (url) => {
    const ext = url?.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return { icon: '📄', color: 'text-red-500', label: 'PDF' };
      case 'doc':
      case 'docx': return { icon: '📝', color: 'text-blue-500', label: 'DOC' };
      case 'jpg':
      case 'jpeg':
      case 'png': return { icon: '🖼️', color: 'text-green-500', label: 'IMG' };
      default: return { icon: '📄', color: 'text-gray-500', label: 'FILE' };
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
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.parentElement.querySelector('.fallback-icon');
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : (
          <div className={`text-center ${fileInfo.color} flex flex-col items-center justify-center h-full`}>
            <div className="text-lg mb-1">{fileInfo.icon}</div>
            <div className="text-xs font-semibold">{fileInfo.label}</div>
          </div>
        )}
        <div className={`fallback-icon text-center ${fileInfo.color} absolute inset-0 hidden flex-col items-center justify-center`}>
          <div className="text-lg mb-1">{fileInfo.icon}</div>
          <div className="text-xs font-semibold">{fileInfo.label}</div>
        </div>
      </div>
    );
  };

  // ---- submit with validations + auto-scroll to first error ----
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const v = {};

    // 1) Employee Name
    if (!formData.employeeName?.trim()) {
      v.employeeName = 'Please enter the full name.';
    } else if (formData.employeeName.trim().length < 3) {
      v.employeeName = 'Please enter minium 3 characters.';
    } else if (!onlyAlpha(formData.employeeName)) {
      v.employeeName = 'Please enter the full name.';
    }

    // 2) Gender
    if (!formData.sex) v.sex = 'Please select the gender.';

    // 5) Email (non editable)
    if (!formData.email?.trim()) {
      v.email = 'Please enter the email id.';
    } else if (/\s/.test(formData.email) || !emailRx.test(formData.email)) {
      v.email = 'Please enter the valid email id.';
    }

    // 6) Mobile (non editable)
    if (!formData.mobileNo?.trim()) {
      v.mobileNo = 'Please enter the mobile number.';
    } else if (!isValidMobile10(formData.mobileNo)) {
      v.mobileNo = 'Please enter the valid mobile number.';
    }

    // 7) Alternate (optional)
    if (formData.alternateNo) {
      if (!isValidMobile10(formData.alternateNo)) {
        v.alternateNo = 'Please enter the valid mobile number.';
      } else if (formData.alternateNo === formData.mobileNo) {
        v.alternateNo = 'Alternate Mobile Number should not be the same as Mobile Number. !';
      }
    }

    // 8) Emergency (mandatory)
    if (!formData.emergencyNo?.trim()) {
      v.emergencyNo = 'Please enter the mobile number.';
    } else if (!isValidMobile10(formData.emergencyNo)) {
      v.emergencyNo = 'Please enter the valid mobile number.';
    }

    // 9) Department
    if (!formData.department?.trim()) {
      v.department = 'Please enter the department name.';
    } else if (formData.department.trim().length < 2 || !onlyAlpha(formData.department)) {
      v.department = 'Please enter the valid department name.';
    }

    // 10) Designation
    if (!formData.designation?.trim()) {
      v.designation = 'Please enter the designation name.';
    } else if (formData.designation.trim().length < 2 || !onlyAlpha(formData.designation)) {
      v.designation = 'Please enter the valid designation name.';
    }

    // 11) DOB: must be <= maxDob (>=18 yrs)
    if (!formData.dateOfBirth) {
      v.dateOfBirth = 'Please select the date of birth.';
    } else if (formData.dateOfBirth > maxDobStr) {
      v.dateOfBirth = 'Please select the date of birth.';
    }

    // 12) DOJ: required and not future
    if (!formData.dateOfJoining) {
      v.dateOfJoining = 'Please select the date of joining.';
    } else if (formData.dateOfJoining > todayStr) {
      v.dateOfJoining = 'Please select the date of joining.';
    }
    // 13) Basic Salary (optional field but if present must be > 0)
    if (formData.basicSalary !== '' && Number(formData.basicSalary) <= 0) {
      v.basicSalary = 'Please enter basic salary more than 0.';
    }

    // 14) Account Number (optional but if present must be 9-18 digits)
    if (formData.accountNumber) {
      const acc = String(formData.accountNumber || '').replace(/\D/g, '');
      if (acc.length < 9 || acc.length > 18) {
        v.accountNumber = 'Please enter the valid account number.';
      }
    }

    // 15) IFSC Code (optional but if present must be valid)
    if (formData.ifscCode) {
      const code = String(formData.ifscCode || '').toUpperCase();
      if (code.length !== 11 || !IFSC_PATTERN.test(code)) {
        v.ifscCode = 'Please enter the valid IFSC Code.';
      }
    }
    setErrors(v);
    const hasErrors = Object.keys(v).length > 0;
    if (hasErrors) {
      setIsSubmitting(false);

      // error priority + scroll/focus
      const order = [
        'employeeName', 'sex', 'email', 'mobileNo', 'alternateNo',
        'emergencyNo', 'department', 'designation', 'dateOfBirth', 'dateOfJoining',
      ];
      const refMap = {
        employeeName: employeeNameRef,
        sex: sexRef,
        email: emailRef,
        mobileNo: mobileNoRef,
        alternateNo: alternateNoRef,
        emergencyNo: emergencyNoRef,
        department: departmentRef,
        designation: designationRef,
        dateOfBirth: dobRef,
        dateOfJoining: dojRef,
      };
      const firstKey = order.find((k) => v[k]);
      const node = firstKey ? refMap[firstKey]?.current : null;

      setTimeout(() => {
        if (node) {
          node.scrollIntoView({ behavior: 'smooth', block: 'center' });
          node.focus?.();
        } else if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 0);

      return;
    }

    // ---- build FormData (same API fields) ----
    try {
      const submitData = new FormData();

      // append normal fields (dates in DD-MM-YYYY)
      Object.entries(formData).forEach(([key, val]) => {
        if (['accountHolderName', 'accountNumber', 'ifscCode'].includes(key)) return;
        if (key === 'dateOfBirth' || key === 'dateOfJoining') {
          const d = new Date(val);
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          submitData.append(key, `${dd}-${mm}-${yyyy}`);
        } else {
          submitData.append(key, val ?? '');
        }
      });

      // bank fields
      submitData.append('accountHolderName', formData.accountHolderName || '');
      submitData.append('accountNumber', formData.accountNumber || '');
      submitData.append('ifscCode', formData.ifscCode || '');

      // files
      Object.entries(files).forEach(([key, val]) => {
        if (Array.isArray(val)) {
          val.forEach((f) => f && submitData.append(key, f));
        } else if (val) {
          submitData.append(key, val);
        }
      });

      await onUpdate(submitData);
    } catch (err) {
      console.error('Error updating user:', err);
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

        {/* Body */}
        <div ref={scrollAreaRef} className="flex-1 overflow-y-auto">
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
                {/* Name */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Employee Name *</label>
                  <input
                    ref={employeeNameRef}
                    name="employeeName"
                    type="text"
                    value={formData.employeeName}
                    onChange={handleInputChange}
                    minLength={3}
                    maxLength={50}
                    placeholder="Enter full name"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-300"
                  />
                  {errors.employeeName && <p className="text-red-600 text-xs mt-1">{errors.employeeName}</p>}
                </div>

                {/* Email (non editable) */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Email *</label>
                  <input
                    ref={emailRef}
                    name="email"
                    type="email"
                    value={formData.email}
                    readOnly
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-100 text-gray-700 cursor-not-allowed"
                  />
                  {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
                </div>

                {/* Mobile (non editable) */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Mobile Number *</label>
                  <input
                    ref={mobileNoRef}
                    name="mobileNo"
                    type="text"
                    inputMode="numeric"
                    value={formData.mobileNo}
                    readOnly
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-100 text-gray-700 cursor-not-allowed"
                  />
                  {errors.mobileNo && <p className="text-red-600 text-xs mt-1">{errors.mobileNo}</p>}
                </div>

                {/* Alternate (optional, no *) */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Alternate Mobile Number</label>
                  <input
                    ref={alternateNoRef}
                    name="alternateNo"
                    type="text"
                    inputMode="numeric"
                    value={formData.alternateNo}
                    onChange={handleInputChange}
                    placeholder="Optional"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-300"
                  />
                  {errors.alternateNo && <p className="text-red-600 text-xs mt-1">{errors.alternateNo}</p>}
                </div>

                {/* Emergency (mandatory) */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Emergency Contact *</label>
                  <input
                    ref={emergencyNoRef}
                    name="emergencyNo"
                    type="text"
                    inputMode="numeric"
                    value={formData.emergencyNo}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-300"
                  />
                  {errors.emergencyNo && <p className="text-red-600 text-xs mt-1">{errors.emergencyNo}</p>}
                </div>

                {/* Gender (required) */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Gender *</label>
                  <select
                    ref={sexRef}
                    name="sex"
                    value={formData.sex}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-300"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.sex && <p className="text-red-600 text-xs mt-1">{errors.sex}</p>}
                </div>

                {/* Department */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Department *</label>
                  <input
                    ref={departmentRef}
                    name="department"
                    type="text"
                    value={formData.department}
                    onChange={handleInputChange}
                    minLength={2}
                    maxLength={50}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-300"
                  />
                  {errors.department && <p className="text-red-600 text-xs mt-1">{errors.department}</p>}
                </div>

                {/* Designation */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Designation *</label>
                  <input
                    ref={designationRef}
                    name="designation"
                    type="text"
                    value={formData.designation}
                    onChange={handleInputChange}
                    minLength={2}
                    maxLength={50}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-300"
                  />
                  {errors.designation && <p className="text-red-600 text-xs mt-1">{errors.designation}</p>}
                </div>

                {/* Basic Salary (unchanged spec) */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Basic Salary</label>
                  <input
                    name="basicSalary"
                    type="text"
                    value={formData.basicSalary}
                    onChange={handleInputChange}
                    onKeyDown={(e) => allowKey(e, 'digit')}
                    inputMode="numeric"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-300"
                  />
                  {errors.basicSalary && <p className="text-red-600 text-xs mt-1">{errors.basicSalary}</p>}
                </div>

                {/* DOB (<= maxDob) */}
                <div className="space-y-3" onClick={() => clickDate(dobRef)}>
                  <label htmlFor="dateOfBirth" className="block text-sm font-bold text-gray-700 cursor-pointer">Date of Birth *</label>
                  <input
                    id="dateOfBirth"
                    ref={dobRef}
                    name="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    max={maxDobStr}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-300 cursor-pointer"
                  />
                  {errors.dateOfBirth && <p className="text-red-600 text-xs mt-1">{errors.dateOfBirth}</p>}
                </div>

                {/* DOJ (<= today) */}
                <div className="space-y-3" onClick={() => clickDate(dojRef)}>
                  <label htmlFor="dateOfJoining" className="block text-sm font-bold text-gray-700 cursor-pointer">Date of Joining *</label>
                  <input
                    id="dateOfJoining"
                    ref={dojRef}
                    name="dateOfJoining"
                    type="date"
                    value={formData.dateOfJoining}
                    onChange={handleInputChange}
                    max={todayStr}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-300 cursor-pointer"
                  />
                  {errors.dateOfJoining && <p className="text-red-600 text-xs mt-1">{errors.dateOfJoining}</p>}
                </div>

                {/* Bank details */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Account Holder Name</label>
                  <input
                    name="accountHolderName"
                    type="text"
                    value={formData.accountHolderName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-300"
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Account Number</label>
                  <input
                    name="accountNumber"
                    type="text"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    onKeyDown={(e) => allowKey(e, 'digit')}
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={18}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-300"
                  />
                  {errors.accountNumber && <p className="text-red-600 text-xs mt-1">{errors.accountNumber}</p>}
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">IFSC Code</label>
                  <input
                    name="ifscCode"
                    type="text"
                    value={formData.ifscCode}
                    onChange={handleInputChange}
                    onKeyDown={(e) => allowKey(e, 'alnum')}
                    maxLength={11}
                    inputMode="text"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-300"
                  />
                  {errors.ifscCode && <p className="text-red-600 text-xs mt-1">{errors.ifscCode}</p>}
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

              {/* Current Docs */}
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

              {/* Uploaders */}
              <div className="grid grid-cols-3 gap-6">
                {/* PAN Card */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">PAN Card</label>
                  <div className="relative">
                    <input
                      type="file"
                      id="pancard"
                      name="pancard"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isSubmitting}
                    />
                    <label
                      htmlFor="pancard"
                      className={`block w-full px-4 py-4 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all duration-300 ${isSubmitting ? 'border-gray-300 cursor-not-allowed opacity-50' : 'border-green-300 hover:bg-green-50 hover:border-green-400 hover:shadow-lg'}`}
                    >
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-2 shadow-lg">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                          </svg>
                        </div>
                        <span className="text-sm font-bold text-green-700">Upload PAN Card</span>
                        <span className="text-xs text-gray-500 mt-1">Click to browse files</span>
                      </div>
                    </label>
                  </div>
                  {uploadStatus.pancard?.fileName && (
                    <p className="text-xs mt-2 text-gray-700">Selected: {uploadStatus.pancard.fileName}</p>
                  )}
                  {fileErrors.pancard && <p className="text-red-600 text-xs mt-1">{fileErrors.pancard}</p>}
                </div>

                {/* Aadhaar Card (optional, spelling fixed) */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Aadhaar Card</label>
                  <div className="relative">
                    <input
                      type="file"
                      id="aadharcard"
                      name="aadharcard"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isSubmitting}
                    />
                    <label
                      htmlFor="aadharcard"
                      className={`block w-full px-4 py-4 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all duration-300 ${isSubmitting ? 'border-gray-300 cursor-not-allowed opacity-50' : 'border-green-300 hover:bg-green-50 hover:border-green-400 hover:shadow-lg'}`}
                    >
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-2 shadow-lg">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                          </svg>
                        </div>
                        <span className="text-sm font-bold text-green-700">Upload Aadhaar Card</span>
                        <span className="text-xs text-gray-500 mt-1">Click to browse files</span>
                      </div>
                    </label>
                  </div>
                  {uploadStatus.aadharcard?.fileName && (
                    <p className="text-xs mt-2 text-gray-700">Selected: {uploadStatus.aadharcard.fileName}</p>
                  )}
                  {fileErrors.aadharcard && <p className="text-red-600 text-xs mt-1">{fileErrors.aadharcard}</p>}
                </div>

                {/* Educational Docs (multiple) */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">Educational Documents</label>
                  <div className="relative">
                    <input
                      type="file"
                      id="educationalDocs"
                      name="educationalDocs"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isSubmitting}
                    />
                    <label
                      htmlFor="educationalDocs"
                      className={`block w-full px-4 py-4 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all duration-300 ${isSubmitting ? 'border-gray-300 cursor-not-allowed opacity-50' : 'border-green-300 hover:bg-green-50 hover:border-green-400 hover:shadow-lg'}`}
                    >
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-2 shadow-lg">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                          </svg>
                        </div>
                        <span className="text-sm font-bold text-green-700">Upload Educational Documents</span>
                        <span className="text-xs text-gray-500 mt-1">Click to browse files</span>
                      </div>
                    </label>
                  </div>
                  {Array.isArray(files.educationalDocs) && files.educationalDocs.length > 0 && (
                    <ul className="text-xs mt-2 text-gray-700 list-disc pl-5">
                      {files.educationalDocs.map((f, i) => <li key={i}>{f.name}</li>)}
                    </ul>
                  )}
                  {fileErrors.educationalDocs && <p className="text-red-600 text-xs mt-1">{fileErrors.educationalDocs}</p>}
                </div>
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

              {/* Current Docs */}
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

              {/* Uploaders */}
              <div className="grid grid-cols-2 gap-6">
                {[
                  { key: 'releaseLetter', label: 'Release Letter' },
                  { key: 'offerLetter', label: 'Offer Letter' },
                  { key: 'experienceLetter', label: 'Experience Letter' },
                  { key: 'bankStatementOrSalarySlip', label: 'Bank Statement/Salary Slip', multiple: true },
                ].map(({ key, label, multiple }) => (
                  <div key={key} className="space-y-3">
                    <label className="block text-sm font-bold text-gray-700">{label}</label>
                    <div className="relative">
                      <input
                        type="file"
                        id={key}
                        name={key}
                        multiple={!!multiple}
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={isSubmitting}
                      />
                      <label
                        htmlFor={key}
                        className={`block w-full px-4 py-4 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all duration-300 ${isSubmitting ? 'border-gray-300 cursor-not-allowed opacity-50' : 'border-purple-300 hover:bg-purple-50 hover:border-purple-400 hover:shadow-lg'}`}
                      >
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-2 shadow-lg">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                            </svg>
                          </div>
                          <span className="text-sm font-bold text-purple-700">Upload {label}</span>
                          <span className="text-xs text-gray-500 mt-1">Click to browse files</span>
                        </div>
                      </label>
                    </div>
                    {uploadStatus[key]?.fileName && (
                      <p className="text-xs mt-2 text-gray-700">Selected: {uploadStatus[key].fileName}</p>
                    )}
                    {fileErrors[key] && <p className="text-red-600 text-xs mt-1">{fileErrors[key]}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
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
                className={`px-10 py-4 bg-gradient-to-r from-green-600 via-blue-600 to-green-700 text-white rounded-xl font-bold transition-all duration-300 shadow-xl hover:shadow-2xl ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:from-green-700 hover:via-blue-700 hover:to-green-800 transform hover:scale-105'}`}
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
