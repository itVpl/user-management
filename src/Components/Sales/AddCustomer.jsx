import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { User, Building2, FileText, PlusCircle, X } from 'lucide-react';
import API_CONFIG from '../../config/api.js';

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
      alert('Please fill all fields correctly!');
      return;
    }

    const token = sessionStorage.getItem('token');
    if (!token) {
      alert('Token not found. Please login again.');
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
        alert('✅ Customer added successfully!');
        handleClose();
        fetchAllCustomers();
      } else {
        alert('❌ Failed: ' + res.data.message || 'Unknown error');
      }
    } catch (error) {
      console.error("❌ Error in Add Customer:", error?.response?.data || error.message);
      alert("❌ Failed: " + (error?.response?.data?.message || 'Unexpected error'));
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (name, placeholder, type = 'text') => (
    <div>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={formData[name]}
        onChange={handleChange}
        onBlur={handleBlur}
        className="border p-2 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
      {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]}</p>}
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

          <div className="bg-white w-[250px] shadow-md rounded-2xl px-4 py-3 flex items-center space-x-4">
            <div className="bg-yellow-100 p-2 rounded-lg">
              <FileText className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-gray-600">Pending Docs</h2>
              <p className="text-xl font-bold text-yellow-600">{totalStats.pendingCustomers}</p>
            </div>
          </div>
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

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-[700px] p-8 relative max-h-[90vh] overflow-y-auto">
            <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-bold text-blue-600 mb-2">Add Customer</h2>
            <div className="h-[1px] bg-gray-200 mb-6"></div>

            <div className="grid grid-cols-2 gap-4">
              {renderInput('compName', 'Full Name')}
              {renderInput('mc_dot_no', 'MC-DOT No')}
              {renderInput('phoneNo', 'Phone')}
              {renderInput('email', 'Email', 'email')}
              {renderInput('country', 'Country')}
              {renderInput('state', 'State')}
              {renderInput('city', 'City')}
              {renderInput('zipcode', 'Zip Code')}
              {renderInput('compAdd', 'Address')}
              {renderInput('password', 'Password', 'password')}
            </div>

            <div className="mt-8 flex justify-center gap-4">
              <button onClick={handleClose} className="px-5 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={!formValid}
                className={`px-5 py-2 rounded-md text-white transition ${
                  formValid ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-300 cursor-not-allowed'
                }`}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AddCustomer;
