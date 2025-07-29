import React, { useState } from 'react';
import axios from 'axios';

const AddUserModal = ({ onClose }) => {
  
  const initialFields = [
    { name: 'empId', placeholder: 'Employee ID', required: true, label: 'Employee ID', icon: '👤' },
    { name: 'password', placeholder: 'Create Password', required: true, label: 'Password', type: 'password', icon: '🔒' },
    { name: 'employeeName', placeholder: 'Enter Name', required: true, label: 'Full Name', icon: '👨‍💼' },
    { name: 'sex', placeholder: 'Sex', required: true, label: 'Gender', icon: '⚧' },
    { name: 'email', placeholder: 'Enter E-mail', required: true, label: 'Email Address', type: 'email', icon: '📧' },
    { name: 'mobileNo', placeholder: 'Mobile no.', required: true, label: 'Mobile Number', icon: '📱' },
    { name: 'alternateNo', placeholder: 'Alternate mobile no.', required: true, label: 'Alternate Number', icon: '📞' },
    { name: 'emergencyNo', placeholder: 'Emergency no.', label: 'Emergency Contact', icon: '🚨' },
    { name: 'department', placeholder: 'Department', required: true, label: 'Department', icon: '🏢' },
    { name: 'designation', placeholder: 'Enter Designation', required: true, label: 'Designation', icon: '💼' },
    { name: 'dateOfBirth', placeholder: 'Date of Birth', type: 'date', required: true, label: 'Date of Birth', icon: '🎂' },
    { name: 'dateOfJoining', placeholder: 'Date of Joining', type: 'date', required: true, label: 'Date of Joining', icon: '📅' },
    { name: 'accountHolderName', placeholder: 'Account Holder Name', label: 'Account Holder Name', icon: '👤' },
    { name: 'accountNumber', placeholder: 'Account Number', label: 'Account Number', icon: '🏦' },
    { name: 'ifscCode', placeholder: 'IFSC Code', label: 'IFSC Code', icon: '🏛️' },
    { name: 'basicSalary', placeholder: 'Basic Salary', label: 'Basic Salary', icon: '💰' }
  ];

  const [formData, setFormData] = useState(
    initialFields.reduce((acc, field) => ({ ...acc, [field.name]: '' }), { role: 'superadmin' })
  );

  const [files, setFiles] = useState({
    pancard: null,
    aadharcard: null,
    educationalDocs: [],
    releaseLetter: null,
    offerLetter: null,
    experienceLetter: null,
    bankStatementOrSalarySlip: [],
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files: selected } = e.target;
    setFiles(prev => ({
      ...prev,
      [name]: name === 'educationalDocs' || name === 'bankStatementOrSalarySlip' ? Array.from(selected) : selected[0]
    }));
  };

  // Function to convert date from YYYY-MM-DD to DD-MM-YYYY format
  const formatDateForAPI = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side required field validation
    const requiredFields = ['empId', 'password', 'employeeName', 'sex', 'email', 'mobileNo', 'alternateNo', 'department', 'designation', 'basicSalary', 'dateOfBirth', 'dateOfJoining'];
    for (let field of requiredFields) {
      if (!formData[field]) {
        alert(`Please fill in the required field: ${field}`);
        return;
      }
    }

    const submitData = new FormData();

    Object.entries(formData).forEach(([key, val]) => {
      // Format date fields to DD-MM-YYYY format for API
      if (key === 'dateOfBirth' || key === 'dateOfJoining') {
        submitData.append(key, formatDateForAPI(val));
      } else {
        submitData.append(key, val);
      }
    });

    Object.entries(files).forEach(([key, val]) => {
      if (Array.isArray(val)) {
        val.forEach(file => submitData.append(key, file));
      } else if (val) {
        submitData.append(key, val);
      }
    });

    try {
      await axios.post('https://vpl-liveproject-1.onrender.com/api/v1/inhouseUser', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });
      alert('User added successfully!');
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to add user');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm overflow-hidden">
      <div className="bg-white rounded-3xl shadow-2xl w-[98%] max-w-7xl h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white p-8 rounded-t-3xl flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold mb-2">Add New User</h2>
              <p className="text-blue-100 text-lg">Fill in the details to create a new user account</p>
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
          <form onSubmit={handleSubmit} className="p-8 space-y-10">
            {/* Employee Details */}
            <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-8 shadow-xl border border-blue-200">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mr-4 shadow-lg">
                  <span className="text-white font-bold text-lg">1</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">👥 Employee Details</h3>
                  <p className="text-gray-600">Basic information about the employee</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                {initialFields.slice(0, 12).map((field) => (
                  <div key={field.name} className="space-y-3">
                    <label className="block text-sm font-bold text-gray-700 flex items-center">
                      <span className="mr-2 text-lg">{field.icon}</span>
                      {field.label} {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <div className="relative">
                      <input
                        name={field.name}
                        type={field.type || 'text'}
                        placeholder={field.placeholder}
                        value={formData[field.name]}
                        onChange={handleInputChange}
                        required={field.required}
                        className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all duration-300 bg-white shadow-sm hover:shadow-md"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Identity Docs */}
            <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl p-8 shadow-xl border border-green-200">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center mr-4 shadow-lg">
                  <span className="text-white font-bold text-lg">2</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">🆔 Identity Documents</h3>
                  <p className="text-gray-600">Upload required identity verification documents</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                {[
                  { key: 'pancard', label: 'PAN Card', required: true, icon: '🆔' },
                  { key: 'aadharcard', label: 'Aadhar Card', required: true, icon: '🆔' },
                  { key: 'educationalDocs', label: 'Educational Documents', required: false, icon: '📚' }
                ].map((doc) => (
                  <div key={doc.key} className="space-y-3">
                    <label className="block text-sm font-bold text-gray-700 flex items-center">
                      <span className="mr-2 text-lg">{doc.icon}</span>
                      {doc.label} {doc.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        id={doc.key}
                        name={doc.key}
                        multiple={doc.key === 'educationalDocs'}
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label
                        htmlFor={doc.key}
                        className="block w-full px-6 py-6 border-2 border-dashed border-green-300 rounded-xl text-center cursor-pointer hover:bg-green-50 hover:border-green-400 hover:shadow-lg transition-all duration-300 bg-white shadow-sm"
                      >
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-3 shadow-lg">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                            </svg>
                          </div>
                          <span className="text-sm font-bold text-green-700">Upload {doc.label}</span>
                          <span className="text-xs text-gray-500 mt-1">Click to browse files</span>
                        </div>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Previous Company Docs */}
            <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 rounded-2xl p-8 shadow-xl border border-purple-200">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mr-4 shadow-lg">
                  <span className="text-white font-bold text-lg">3</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">🏢 Previous Company Documents</h3>
                  <p className="text-gray-600">Documents from previous employment</p>
                </div>
              </div>
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
                      />
                      <label
                        htmlFor={doc.key}
                        className="block w-full px-6 py-6 border-2 border-dashed border-purple-300 rounded-xl text-center cursor-pointer hover:bg-purple-50 hover:border-purple-400 hover:shadow-lg transition-all duration-300 bg-white shadow-sm"
                      >
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-3 shadow-lg">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                            </svg>
                          </div>
                          <span className="text-sm font-bold text-purple-700">Upload {doc.label}</span>
                          <span className="text-xs text-gray-500 mt-1">Click to browse files</span>
                        </div>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Banking Details */}
            <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 rounded-2xl p-8 shadow-xl border border-orange-200">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-full flex items-center justify-center mr-4 shadow-lg">
                  <span className="text-white font-bold text-lg">4</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">🏦 Banking Details</h3>
                  <p className="text-gray-600">Bank account information for salary processing</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                {initialFields.slice(12).map((field) => (
                  <div key={field.name} className="space-y-3">
                    <label className="block text-sm font-bold text-gray-700 flex items-center">
                      <span className="mr-2 text-lg">{field.icon}</span>
                      {field.label}
                    </label>
                    <div className="relative">
                      <input
                        name={field.name}
                        type={field.type || 'text'}
                        placeholder={field.placeholder}
                        value={formData[field.name]}
                        onChange={handleInputChange}
                        required={field.required}
                        className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-500 transition-all duration-300 bg-white shadow-sm hover:shadow-md"
                      />
                    </div>
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
                className="px-10 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 text-white rounded-xl font-bold hover:from-blue-700 hover:via-purple-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl"
              >
                Create User
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddUserModal;
