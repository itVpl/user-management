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

  const [uploadStatus, setUploadStatus] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateFile = (file, maxSize = 10 * 1024 * 1024) => { // 10MB default
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
    
    // Update upload status
    setUploadStatus(prev => ({
      ...prev,
      [name]: { status: 'selected', fileName: fileList[0]?.name || `${fileList.length} files selected` }
    }));
    
    console.log(`File selected for ${name}:`, fileList);
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
    setIsSubmitting(true);

    try {
      // Client-side required field validation
      const requiredFields = ['empId', 'password', 'employeeName', 'sex', 'email', 'mobileNo', 'alternateNo', 'department', 'designation', 'basicSalary', 'dateOfBirth', 'dateOfJoining'];
      for (let field of requiredFields) {
        if (!formData[field]) {
          alert(`Please fill in the required field: ${field}`);
          setIsSubmitting(false);
          return;
        }
      }

      const submitData = new FormData();

      // Add form data
      Object.entries(formData).forEach(([key, val]) => {
        // Format date fields to DD-MM-YYYY format for API
        if (key === 'dateOfBirth' || key === 'dateOfJoining') {
          submitData.append(key, formatDateForAPI(val));
        } else {
          submitData.append(key, val);
        }
      });

      // Add files with detailed logging
      Object.entries(files).forEach(([key, val]) => {
        if (Array.isArray(val)) {
          val.forEach((file, index) => {
            submitData.append(key, file);
            console.log(`Adding file ${index + 1} for ${key}:`, file.name, file.size, file.type);
          });
        } else if (val) {
          submitData.append(key, val);
          console.log(`Adding single file for ${key}:`, val.name, val.size, val.type);
        }
      });

      // Log FormData contents for debugging
      console.log('FormData contents:');
      for (let [key, value] of submitData.entries()) {
        if (value instanceof File) {
          console.log(`${key}:`, value.name, value.size, value.type);
        } else {
          console.log(`${key}:`, value);
        }
      }

      // Update status for offer letter and experience letter specifically
      if (files.offerLetter) {
        setUploadStatus(prev => ({ ...prev, offerLetter: { status: 'uploading', fileName: files.offerLetter.name } }));
      }
      if (files.experienceLetter) {
        setUploadStatus(prev => ({ ...prev, experienceLetter: { status: 'uploading', fileName: files.experienceLetter.name } }));
      }

      const response = await axios.post('https://vpl-liveproject-1.onrender.com/api/v1/inhouseUser', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
        timeout: 60000, // 60 second timeout
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log('Upload progress:', percentCompleted + '%');
        }
      });

      console.log('API Response:', response.data);
      
      // Update status to success
      Object.keys(files).forEach(key => {
        if (files[key]) {
          setUploadStatus(prev => ({ ...prev, [key]: { status: 'success', fileName: Array.isArray(files[key]) ? files[key][0]?.name : files[key].name } }));
        }
      });

      alert('User added successfully!');
      onClose();
    } catch (err) {
      console.error('Error details:', err);
      
      // Update status to error
      Object.keys(files).forEach(key => {
        if (files[key]) {
          setUploadStatus(prev => ({ ...prev, [key]: { status: 'error', fileName: Array.isArray(files[key]) ? files[key][0]?.name : files[key].name } }));
        }
      });

      let errorMessage = 'Failed to add user';
      if (err.response) {
        console.error('Response error:', err.response.data);
        errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        console.error('Request error:', err.request);
        errorMessage = 'Network error. Please check your connection.';
      } else {
        console.error('Other error:', err.message);
        errorMessage = err.message;
      }
      
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFileStatusIcon = (status) => {
    switch (status) {
      case 'selected': return '📁';
      case 'uploading': return '⏳';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '📄';
    }
  };

  const getFileStatusColor = (status) => {
    switch (status) {
      case 'selected': return 'text-blue-600';
      case 'uploading': return 'text-yellow-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
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
                        disabled={isSubmitting}
                      />
                      <label
                        htmlFor={doc.key}
                        className={`block w-full px-6 py-6 border-2 border-dashed rounded-xl text-center transition-all duration-300 bg-white shadow-sm ${
                          isSubmitting 
                            ? 'border-gray-300 cursor-not-allowed opacity-50' 
                            : 'border-purple-300 cursor-pointer hover:bg-purple-50 hover:border-purple-400 hover:shadow-lg'
                        }`}
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
                      
                      {/* File Status Display */}
                      {uploadStatus[doc.key] && (
                        <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{getFileStatusIcon(uploadStatus[doc.key].status)}</span>
                              <span className={`text-sm font-medium ${getFileStatusColor(uploadStatus[doc.key].status)}`}>
                                {uploadStatus[doc.key].fileName}
                              </span>
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

            {/* Debug Section - Show selected files */}
            <div className="bg-gradient-to-br from-gray-50 via-slate-50 to-zinc-50 rounded-2xl p-6 shadow-xl border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-gray-600 to-slate-600 rounded-full flex items-center justify-center mr-3 shadow-lg">
                  <span className="text-white font-bold text-sm">🔍</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">File Upload Status</h3>
                  <p className="text-gray-600 text-sm">Check which files are ready for upload</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(files).map(([key, file]) => {
                  if (!file || (Array.isArray(file) && file.length === 0)) return null;
                  
                  const fileName = Array.isArray(file) ? file[0]?.name : file.name;
                  const fileSize = Array.isArray(file) ? file[0]?.size : file.size;
                  const fileType = Array.isArray(file) ? file[0]?.type : file.type;
                  
                  return (
                    <div key={key} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-gray-800 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                          <div className="text-xs text-gray-600 truncate">{fileName}</div>
                          <div className="text-xs text-gray-500">
                            {(fileSize / 1024 / 1024).toFixed(2)} MB • {fileType}
                          </div>
                        </div>
                        <div className="ml-2">
                          {uploadStatus[key] && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              uploadStatus[key].status === 'success' ? 'bg-green-100 text-green-800' :
                              uploadStatus[key].status === 'error' ? 'bg-red-100 text-red-800' :
                              uploadStatus[key].status === 'uploading' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {uploadStatus[key].status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {Object.values(files).every(file => !file || (Array.isArray(file) && file.length === 0)) && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No files selected for upload
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-6 pt-8 border-t-2 border-gray-200">
              <button 
                type="button" 
                onClick={onClose}
                disabled={isSubmitting}
                className={`px-10 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl ${
                  isSubmitting 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-gray-50 hover:border-gray-400'
                }`}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className={`px-10 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 text-white rounded-xl font-bold transition-all duration-300 shadow-xl hover:shadow-2xl ${
                  isSubmitting 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:from-blue-700 hover:via-purple-700 hover:to-blue-800 transform hover:scale-105'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating User...</span>
                  </div>
                ) : (
                  'Create User'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddUserModal;
