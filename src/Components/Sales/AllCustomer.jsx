import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, User, Mail, Phone, MapPin, CheckCircle, XCircle, Clock, Building, Truck, ChevronDown, UserCheck, X, DollarSign, CreditCard, Send } from 'lucide-react';
import API_CONFIG from '../../config/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AllCustomer = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reassign Modal State
  const [reassignModal, setReassignModal] = useState({ visible: false, customer: null });
  const [salesUsers, setSalesUsers] = useState([]);
  const [selectedSalesUser, setSelectedSalesUser] = useState('');
  const [reassignDescription, setReassignDescription] = useState('');
  const [reassignSubmitting, setReassignSubmitting] = useState(false);
  const [salesUserSearch, setSalesUserSearch] = useState('');
  const [isSalesDropdownOpen, setIsSalesDropdownOpen] = useState(false);

  // Credit Limit Modal State
  const [creditLimitModal, setCreditLimitModal] = useState({ visible: false, customer: null });
  const [creditLimitAmount, setCreditLimitAmount] = useState('');
  const [creditLimitSubmitting, setCreditLimitSubmitting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchSalesUsers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/shipper_driver/shippers`);
      if (response.data && response.data.success) {
        // Sort by createdAt descending (newest first)
        const sortedData = response.data.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setCustomers(sortedData);
      } else {
        console.error('Failed to fetch customers: API success false');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesUsers = async () => {
    try {
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/inhouseUser/department/Sales`,
        { headers: API_CONFIG.getAuthHeaders() }
      );
      if (response.data && response.data.employees) {
        setSalesUsers(response.data.employees);
      }
    } catch (error) {
      console.error('Error fetching Sales users:', error);
    }
  };

  // Reassign Handlers
  const handleReAssign = (customer) => {
    setReassignModal({ visible: true, customer });
    setSelectedSalesUser('');
    setReassignDescription('');
    setSalesUserSearch('');
    setIsSalesDropdownOpen(false);
  };

  const closeReassignModal = () => {
    setReassignModal({ visible: false, customer: null });
    setSelectedSalesUser('');
    setReassignDescription('');
    setReassignSubmitting(false);
    setSalesUserSearch('');
    setIsSalesDropdownOpen(false);
  };

  const handleSalesUserSelect = (userId, name) => {
    setSelectedSalesUser(userId);
    setSalesUserSearch(name);
    setIsSalesDropdownOpen(false);
  };

  const filteredSalesUsers = salesUsers.filter(user => 
    user.employeeName?.toLowerCase().includes(salesUserSearch.toLowerCase()) ||
    user.empId?.toLowerCase().includes(salesUserSearch.toLowerCase()) ||
    user.email?.toLowerCase().includes(salesUserSearch.toLowerCase())
  );

  const selectedSalesUserName = salesUsers.find(u => u._id === selectedSalesUser)?.employeeName || '';

  const handleReassignSubmit = async () => {
    if (!selectedSalesUser) {
      toast.error('Please select a Sales user to assign the customer to');
      return;
    }

    if (!reassignDescription.trim()) {
      toast.error('Please provide a description for re-assignment');
      return;
    }

    try {
      setReassignSubmitting(true);
      
      const selectedUser = salesUsers.find(user => user._id === selectedSalesUser);
      if (!selectedUser) {
        toast.error('Selected Sales user not found');
        return;
      }

      const payload = {
        newSalesEmpId: selectedUser.empId,
        reason: reassignDescription.trim()
      };

      const response = await axios.put(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/reassign-shipper/${reassignModal.customer?._id}`,
        payload,
        { headers: API_CONFIG.getAuthHeaders() }
      );

      if (response.data.success || response.status === 200) {
        toast.success(`Customer re-assigned successfully to ${selectedUser.employeeName}!`);
        closeReassignModal();
        fetchCustomers();
      } else {
        toast.error(response.data.message || 'Failed to re-assign customer');
      }

    } catch (error) {
      console.error('Re-assign error:', error);
      toast.error(error.response?.data?.message || 'Failed to re-assign customer. Please try again.');
    } finally {
      setReassignSubmitting(false);
    }
  };

  // Credit Limit Handlers
  const handleAddCreditLimit = (customer) => {
    setCreditLimitModal({ visible: true, customer });
    setCreditLimitAmount(customer.creditLimit || '');
  };

  const closeCreditLimitModal = () => {
    setCreditLimitModal({ visible: false, customer: null });
    setCreditLimitAmount('');
    setCreditLimitSubmitting(false);
    setEmailSent(false);
  };

  const handleCreditLimitSubmit = async () => {
    if (!creditLimitAmount.trim()) {
      toast.error('Please enter a credit limit amount');
      return;
    }

    const amount = parseFloat(creditLimitAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid credit limit amount');
      return;
    }

    try {
      setCreditLimitSubmitting(true);

      const payload = {
        creditLimit: amount
      };

      const response = await axios.patch(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/${creditLimitModal.customer?._id}/credit-limit`,
        payload,
        { headers: API_CONFIG.getAuthHeaders() }
      );

      if (response.data.success || response.status === 200) {
        toast.success(`Credit limit updated successfully for ${creditLimitModal.customer?.compName}!`);
        closeCreditLimitModal();
        fetchCustomers();
      } else {
        toast.error(response.data.message || 'Failed to update credit limit');
      }

    } catch (error) {
      console.error('Credit limit update error:', error);
      toast.error(error.response?.data?.message || 'Failed to update credit limit. Please try again.');
    } finally {
      setCreditLimitSubmitting(false);
    }
  };

  // Send Credit Limit Form Email Handler
  const handleSendCreditLimitFormEmail = async () => {
    if (!creditLimitModal.customer?._id) {
      toast.error('Customer ID is required');
      return;
    }

    setSendingEmail(true);
    try {
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/${creditLimitModal.customer._id}/send-credit-limit-form`,
        {},
        { headers: API_CONFIG.getAuthHeaders() }
      );

      if (response.data.success) {
        setEmailSent(true);
        toast.success(`Credit limit form email sent successfully to ${creditLimitModal.customer?.email || 'shipper'}!`);
      } else {
        toast.error(response.data.message || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending credit limit form email:', error);
      toast.error(error.response?.data?.message || 'Failed to send email. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.compName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.mc_dot_no?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Generate pagination page numbers (smart pagination)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 7; // Maximum number of page buttons to show
    
    if (totalPages <= maxVisiblePages) {
      // If total pages are less than max, show all
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage <= 4) {
        // Near the beginning
        for (let i = 2; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // Near the end
        pages.push('ellipsis');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle
        pages.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  // Status color helper
  const statusColor = (status) => {
    if (!status) return 'bg-yellow-100 text-yellow-800';
    if (status === 'approved') return 'bg-green-100 text-green-800';
    if (status === 'rejected') return 'bg-red-100 text-red-800';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
            <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <User className="text-blue-600" size={20} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Total Customers</p>
                        <p className="text-xl font-bold text-gray-800">{customers.length}</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                type="text"
                placeholder="Search Customers..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col justify-center items-center h-96 bg-white rounded-2xl shadow-lg border border-gray-100">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-xl font-semibold text-gray-800 mb-2">Loading Customers...</p>
          </div>
        </div>
      ) : (
        <>
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Company Name</th>
                  <th className="text-left py-3 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">MC/DOT No</th>
                  <th className="text-left py-3 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Contact Info</th>
                  <th className="text-left py-3 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Location</th>
                  <th className="text-left py-3 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Credit Limit</th>
                  <th className="text-left py-3 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Added By</th>
                  <th className="text-left py-3 px-4 text-gray-800 font-bold text-sm uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                            <User className="w-16 h-16 text-gray-300 mb-4" />
                            <p className="text-gray-500 text-lg">No customers found</p>
                            <p className="text-gray-400 text-sm">Try adjusting your search terms</p>
                        </div>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((customer, idx) => (
                    <tr 
                      key={customer._id || idx} 
                      className={`border-b border-gray-100 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-blue-50/30`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                            {/* <div className="bg-blue-100 p-2 rounded-lg">
                                <Building size={16} className="text-blue-600" />
                            </div> */}
                            <div>
                                <div className="font-semibold text-gray-800">{customer.compName}</div>
                                <div className="text-xs text-gray-500 capitalize">{customer.userType}</div>
                            </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-700">{customer.mc_dot_no || 'N/A'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm text-gray-700">
                                <Mail size={12} className="text-gray-400" />
                                {customer.email}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Phone size={12} className="text-gray-400" />
                                {customer.phoneNo}
                            </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        <div className="flex items-start gap-1">
                            <MapPin size={14} className="text-gray-400 mt-0.5" />
                            <div>
                                <div>{customer.city}, {customer.state}</div>
                                <div className="text-xs text-gray-500">{customer.country}</div>
                            </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-blue-600">
                          ${customer.creditLimit ? parseFloat(customer.creditLimit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                {customer.addedBy?.employeeName?.charAt(0) || 'A'}
                             </div>
                             <div>
                                <div className="text-sm font-medium">{customer.addedBy?.employeeName || 'N/A'}</div>
                                {customer.addedBy?.department && <div className="text-xs text-gray-500">{customer.addedBy.department}</div>}
                             </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        <div className="flex items-center gap-2">
                          <button
                              onClick={() => handleReAssign(customer)}
                              className="px-3 py-1 text-orange-600 text-xs rounded-md transition-colors border border-orange-300 hover:bg-orange-50"
                          >
                              Re-Assign
                          </button>
                          <button
                              onClick={() => handleAddCreditLimit(customer)}
                              className="px-3 py-1 text-blue-600 text-xs rounded-md transition-colors border border-blue-300 hover:bg-blue-50 flex items-center gap-1"
                          >
                              <CreditCard size={12} />
                              Add Credit Limit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {filteredCustomers.length > 0 && (
            <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
            <div className="text-sm text-gray-600">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredCustomers.length)} of {filteredCustomers.length} customers
                {searchTerm && ` (filtered from ${customers.length} total)`}
            </div>
            {totalPages > 1 && (
            <div className="flex gap-2 items-center">
                <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                Previous
                </button>
                {getPageNumbers().map((page, index) => {
                  if (page === 'ellipsis') {
                    return (
                      <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                        ...
                      </span>
                    );
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => paginate(page)}
                      className={`px-3 py-2 border rounded-lg transition-colors text-sm font-medium ${
                        currentPage === page
                          ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                          : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                Next
                </button>
            </div>
            )}
            </div>
        )}
        </>
      )}

      {/* Re-Assign Modal */}
      {reassignModal.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl w-full max-w-2xl p-8 border border-orange-100">
            <div className="bg-gradient-to-r from-orange-600 to-red-500 text-white px-6 py-4 rounded-xl shadow mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  Re-Assign Customer
                </h2>
                <p className="text-sm text-orange-100 mt-1">
                  Select a Sales user to reassign this customer
                </p>
              </div>
              <button 
                onClick={closeReassignModal} 
                type="button" 
                className="text-white text-3xl hover:text-gray-200"
              >
                <X size={28} />
              </button>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4 text-sm text-gray-700 bg-orange-50 px-4 py-3 rounded-lg mb-6">
              <div>
                <strong>Company Name:</strong>
                <br />
                {reassignModal.customer?.compName || 'N/A'}
              </div>
              <div>
                <strong>MC/DOT No:</strong>
                <br />
                {reassignModal.customer?.mc_dot_no || 'N/A'}
              </div>
              <div>
                <strong>Email:</strong>
                <br />
                {reassignModal.customer?.email || 'N/A'}
              </div>
              <div>
                <strong>Phone:</strong>
                <br />
                {reassignModal.customer?.phoneNo || 'N/A'}
              </div>
              <div>
                <strong>Status:</strong>
                <br />
                {reassignModal.customer?.status || 'N/A'}
              </div>
              <div>
                <strong>Current Owner:</strong>
                <br />
                {reassignModal.customer?.addedBy?.employeeName || 'N/A'}
              </div>
            </div>

            {/* Sales User Selection */}
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Select Sales User <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={salesUserSearch}
                  onChange={(e) => {
                    setSalesUserSearch(e.target.value);
                    setIsSalesDropdownOpen(true);
                  }}
                  onFocus={() => setIsSalesDropdownOpen(true)}
                  placeholder="Search Sales user by name, ID, or email..."
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 cursor-pointer"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
                
                {isSalesDropdownOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {/* Clear/Unselect option */}
                    {selectedSalesUser && (
                      <div
                        onClick={() => {
                          setSelectedSalesUser('');
                          setSalesUserSearch('');
                          setIsSalesDropdownOpen(false);
                        }}
                        className="px-4 py-3 hover:bg-red-50 cursor-pointer border-b border-gray-100 transition-colors duration-150"
                      >
                        <div className="font-medium text-red-600 flex items-center gap-2">
                          <X size={16} />
                          Clear Selection
                        </div>
                      </div>
                    )}
                    
                    {filteredSalesUsers.length > 0 ? (
                      filteredSalesUsers.map((user) => (
                        <div
                          key={user._id}
                          onClick={() => handleSalesUserSelect(user._id, `${user.employeeName} (${user.empId})`)}
                          className={`px-4 py-3 hover:bg-orange-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150 ${
                            selectedSalesUser === user._id ? 'bg-orange-50' : ''
                          }`}
                        >
                          <div className="font-medium text-gray-900">{user.employeeName}</div>
                          <div className="text-sm text-gray-600">{user.empId} - {user.designation}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-gray-500 text-center">
                        No Sales users found matching "{salesUserSearch}"
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {selectedSalesUser && (
                <div className="mt-3 p-3 bg-orange-50 border-2 border-orange-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <div className="text-sm text-orange-800">
                        <span className="font-semibold">Selected:</span> {selectedSalesUserName}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSalesUser('');
                        setSalesUserSearch('');
                      }}
                      className="text-red-600 hover:text-red-800 hover:bg-red-100 p-2 rounded-lg transition-all duration-150"
                      title="Clear Selection"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Reason for Re-assignment <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reassignDescription}
                onChange={(e) => setReassignDescription(e.target.value)}
                placeholder="Please explain why this customer is being re-assigned..."
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 h-24 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={closeReassignModal}
                disabled={reassignSubmitting}
                className="px-6 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleReassignSubmit}
                disabled={reassignSubmitting}
                className={`px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-red-500 text-white font-medium shadow-lg hover:shadow-orange-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center gap-2 ${
                  reassignSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {reassignSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <UserCheck size={18} />
                    Confirm Re-Assign
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credit Limit Modal */}
      {creditLimitModal.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl w-full max-w-md p-8 border border-blue-100">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-4 rounded-xl shadow mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  <CreditCard size={24} />
                  Add Credit Limit
                </h2>
                <p className="text-sm text-blue-100 mt-1">
                  Set credit limit for this customer
                </p>
              </div>
              <button 
                onClick={closeCreditLimitModal} 
                type="button" 
                className="text-white text-3xl hover:text-gray-200"
              >
                <X size={28} />
              </button>
            </div>

            {/* Customer Details */}
            <div className="space-y-3 text-sm text-gray-700 bg-blue-50 px-4 py-3 rounded-lg mb-6">
              {/* First Line: Company Name and MC/DOT No */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Company Name:</strong>
                  <br />
                  <span className="text-gray-800">{creditLimitModal.customer?.compName || 'N/A'}</span>
                </div>
                <div>
                  <strong>MC/DOT No:</strong>
                  <br />
                  <span className="text-gray-800">{creditLimitModal.customer?.mc_dot_no || 'N/A'}</span>
                </div>
              </div>
              {/* Second Line: Added By and Credit Limit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Added By:</strong>
                  <br />
                  <span className="text-gray-800">{creditLimitModal.customer?.addedBy?.employeeName || 'N/A'}</span>
                </div>
                <div>
                  <strong>Current Credit Limit:</strong>
                  <br />
                  <span className="font-semibold text-blue-600">
                    ${creditLimitModal.customer?.creditLimit ? parseFloat(creditLimitModal.customer.creditLimit).toLocaleString() : '0.00'}
                  </span>
                </div>
              </div>
            </div>

            {/* Credit Limit Input */}
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Credit Limit Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="number"
                  value={creditLimitAmount}
                  onChange={(e) => setCreditLimitAmount(e.target.value)}
                  placeholder="Enter credit limit amount..."
                  min="0"
                  step="0.01"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Enter the maximum credit amount allowed for this customer
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={closeCreditLimitModal}
                disabled={creditLimitSubmitting || sendingEmail}
                className="px-6 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSendCreditLimitFormEmail}
                disabled={sendingEmail || emailSent}
                className={`px-6 py-2.5 rounded-xl font-medium shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center gap-2 ${
                  emailSent 
                    ? 'bg-green-600 text-white hover:shadow-green-500/30' 
                    : sendingEmail
                    ? 'bg-gray-400 text-white opacity-70 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-500 text-white hover:shadow-purple-500/30'
                }`}
              >
                {sendingEmail ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Sending...
                  </>
                ) : emailSent ? (
                  <>
                    <CheckCircle size={18} />
                    Email Sent
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Send Form Email
                  </>
                )}
              </button>
              <button
                onClick={handleCreditLimitSubmit}
                disabled={creditLimitSubmitting}
                className={`px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center gap-2 ${
                  creditLimitSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {creditLimitSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard size={18} />
                    Update Credit Limit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="light" />
    </div>
  );
};

export default AllCustomer;
