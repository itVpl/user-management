import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { User, Building2, FileText, PlusCircle, X } from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const initialForm = {
  compName: '',
  mc_dot_no: '',
  phoneNo: '',
  email: '',
  password: '',
  compAdd: '',
  country: '',
  state: '',
  city: '',
  zipcode: '',
};

const AddCustomer = () => {
  const [customers, setCustomers] = useState([]);
  const [todayStats, setTodayStats] = useState({ totalAdded: 0 });
  const [totalStats, setTotalStats] = useState({ totalCustomers: 0, pendingCustomers: 0 });
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [formValid, setFormValid] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAllCustomers();
    fetchTodayStats();
  }, []);

  useEffect(() => {
    setFormValid(validateForm(formData));
  }, [formData]);

  const validateForm = (data) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{10}$/;
    const zipRegex = /^[0-9]{5,6}$/;

    return (
      data.compName.trim() !== '' &&
      data.mc_dot_no.trim() !== '' &&
      phoneRegex.test(data.phoneNo) &&
      emailRegex.test(data.email) &&
      data.password.trim().length >= 6 &&
      data.compAdd.trim() !== '' &&
      data.country.trim() !== '' &&
      data.state.trim() !== '' &&
      data.city.trim() !== '' &&
      zipRegex.test(data.zipcode)
    );
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    let errorMsg = '';

    if (name === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errorMsg = 'Invalid email';
    } else if (name === 'phoneNo' && !/^[0-9]{10}$/.test(value)) {
      errorMsg = 'Phone must be 10 digits';
    } else if (name === 'password' && value.length < 6) {
      errorMsg = 'Password must be at least 6 characters';
    } else if (name === 'zipcode' && !/^[0-9]{5,6}$/.test(value)) {
      errorMsg = 'Zipcode must be 5 or 6 digits';
    } else if (value.trim() === '') {
      errorMsg = 'This field is required';
    }

    setErrors((prev) => ({ ...prev, [name]: errorMsg }));
  };

  const fetchAllCustomers = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/shipper_driver/department/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setCustomers(res.data.customers || []);
        setTotalStats(res.data.statistics || {});
      }
    } catch (error) {
      console.error('❌ Error fetching customers:', error);
    }
  };

  const fetchTodayStats = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/shipper_driver/department/today-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setTodayStats(res.data.todayStats || {});
      }
    } catch (error) {
      console.error("❌ Error fetching today's stats:", error);
    }
  };

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setFormData(initialForm);
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formValid) {
      toast.error('Please fill all fields correctly!');
      return;
    }

    const token = sessionStorage.getItem('token');
    if (!token) {
      toast.error('Token not found. Please login again.');
      return;
    }

    try {
      setLoading(true);
      const cleanedData = Object.fromEntries(
        Object.entries(formData).map(([k, v]) => [k, v.trim()])
      );

      console.log('🚀 Submitting Data:', cleanedData);

      const res = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/department/add-customer`,
        cleanedData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

             if (res.data.success) {
         toast.success('✅ Customer added successfully!');
         handleClose();
         fetchAllCustomers();
         fetchTodayStats(); // Also refresh today's stats
       } else {
         toast.error('❌ Failed: ' + res.data.message || 'Unknown error');
       }
         } catch (error) {
       console.error("❌ Error in Add Customer:", error?.response?.data || error.message);
       toast.error("❌ Failed: " + (error?.response?.data?.message || 'Unexpected error'));
     } finally {
      setLoading(false);
    }
  };

  const renderInput = (name, placeholder, type = 'text', icon = null) => (
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          {icon}
        </div>
      )}
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={formData[name]}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
          icon ? 'pl-10' : ''
        } ${errors[name] ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}`}
      />
      {errors[name] && (
        <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <div className="p-6">
      {/* Top Stats */}
      <div className="flex gap-4 mb-6 flex-wrap items-center justify-between">
        <div className="flex gap-4 flex-wrap">
          <div className="bg-white w-[250px] shadow-md rounded-2xl px-4 py-3 flex items-center space-x-4">
            <div className="bg-green-100 p-2 rounded-lg">
              <User className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-gray-600">Total Customers</h2>
              <p className="text-xl font-bold text-green-600">{totalStats.totalCustomers}</p>
            </div>
          </div>

          <div className="bg-white w-[250px] shadow-md rounded-2xl px-4 py-3 flex items-center space-x-4">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-gray-600">Today's Customers</h2>
              <p className="text-xl font-bold text-blue-600">{todayStats.totalAdded}</p>
            </div>
          </div>

          {/* <div className="bg-white w-[250px] shadow-md rounded-2xl px-4 py-3 flex items-center space-x-4">
            <div className="bg-yellow-100 p-2 rounded-lg">
              <FileText className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-gray-600">Pending Docs</h2>
              <p className="text-xl font-bold text-yellow-600">{totalStats.pendingCustomers}</p>
            </div>
          </div> */}
        </div>

        {/* Add Button */}
        <button
          onClick={handleOpen}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition flex items-center gap-2 mt-4 sm:mt-0"
        >
          <PlusCircle className="w-5 h-5" />
          Add Customer
        </button>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded-xl overflow-auto">
        <table className="min-w-full text-sm text-gray-700">
          <thead className="bg-gray-100 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Company Name</th>
              <th className="px-4 py-3 text-left">MC/DOT</th>
              <th className="px-4 py-3 text-left">Country</th>
              <th className="px-4 py-3 text-left">State</th>
              <th className="px-4 py-3 text-left">City</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Added On</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((cust, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-all">
                <td className="px-4 py-3 border-b border-gray-100">{cust.compName}</td>
                <td className="px-4 py-3 border-b border-gray-100">{cust.mc_dot_no}</td>
                <td className="px-4 py-3 border-b border-gray-100">{cust.country}</td>
                <td className="px-4 py-3 border-b border-gray-100">{cust.state}</td>
                <td className="px-4 py-3 border-b border-gray-100">{cust.city}</td>
                <td className="px-4 py-3 border-b border-gray-100">{cust.phoneNo}</td>
                <td className="px-4 py-3 border-b border-gray-100">{cust.email}</td>
                <td className="px-4 py-3 border-b border-gray-100 capitalize">{cust.status}</td>
                <td className="px-4 py-3 border-b border-gray-100">
                  {cust.addedAt ? new Date(cust.addedAt).toLocaleDateString() : 'N/A'}
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-center text-gray-500" colSpan="9">
                  No customer data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

             {/* Enhanced Modal */}
       {open && (
         <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-transparent p-4">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative scrollbar-hide">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <User className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Add New Customer</h2>
                    <p className="text-blue-100">Enter customer information below</p>
                  </div>
                </div>
                <button 
                  onClick={handleClose} 
                  className="text-white hover:text-gray-200 text-2xl font-bold transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

                         {/* Form */}
             <div className="p-8">
               <div className="space-y-6">
                 {/* Company Information */}
                 <div className="space-y-4">
                   <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                     <Building2 className="text-blue-600" size={20} />
                     Company Information
                   </h3>
                   
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     {renderInput('compName', 'Company Name', 'text', <Building2 className="w-5 h-5" />)}
                     {renderInput('mc_dot_no', 'MC/DOT Number', 'text', <FileText className="w-5 h-5" />)}
                     {renderInput('compAdd', 'Company Address', 'text', <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                     </svg>)}
                   </div>
                 </div>

                 {/* Contact Information */}
                 <div className="space-y-4">
                   <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                     <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                     </svg>
                     Contact Information
                   </h3>
                   
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     {renderInput('email', 'Email Address', 'email', <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                     </svg>)}
                     {renderInput('phoneNo', 'Phone Number', 'tel', <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                     </svg>)}
                     {renderInput('password', 'Password', 'password', <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                     </svg>)}
                   </div>
                 </div>

                                 {/* Location Information */}
                 <div className="space-y-4">
                   <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                     <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                     </svg>
                     Location Details
                   </h3>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {renderInput('country', 'Country', 'text', <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                     </svg>)}
                     {renderInput('state', 'State/Province', 'text', <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                     </svg>)}
                     {renderInput('city', 'City', 'text', <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                     </svg>)}
                     {renderInput('zipcode', 'Zip/Postal Code', 'text', <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                     </svg>)}
                   </div>
                 </div>

                {/* Additional Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Additional Information
                  </h3>
                  
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-blue-800">Form Validation</span>
                    </div>
                    <p className="text-xs text-blue-700">
                      All fields are required. Email must be valid format. Phone number must be 10 digits. Password must be at least 6 characters.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
                <button 
                  onClick={handleClose} 
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!formValid || loading}
                  className={`px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 flex items-center gap-2 ${
                    formValid && !loading 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl' 
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-5 h-5" />
                      Create Customer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
       )}

       {/* Toast Container */}
       <ToastContainer
         position="top-right"
         autoClose={3000}
         hideProgressBar={false}
         newestOnTop={false}
         closeOnClick
         rtl={false}
         pauseOnFocusLoss
         draggable
         pauseOnHover
         theme="light"
       />
     </div>
   );
 };

export default AddCustomer;
