import React, { useState } from 'react';
import axios from 'axios';

const AddUserModal = ({ onClose }) => {
  const initialFields = [
    { name: 'empId', placeholder: 'Employee ID', required: true },
    { name: 'password', placeholder: 'Create Password', required: true },
    { name: 'employeeName', placeholder: 'Enter Name', required: true },
    { name: 'sex', placeholder: 'Sex', required: true },
    { name: 'email', placeholder: 'Enter E-mail', required: true },
    { name: 'mobileNo', placeholder: 'Mobile no.', required: true },
    { name: 'alternateNo', placeholder: 'Alternate mobile no.', required: true },
    { name: 'emergencyNo', placeholder: 'Emergency no.' },
    { name: 'department', placeholder: 'Department', required: true },
    { name: 'designation', placeholder: 'Enter Designation', required: true },
    { name: 'dateOfJoining', placeholder: 'Date of Joining', type: 'date', required: true },
    { name: 'accountHolderName', placeholder: 'Account Holder Name' },
    { name: 'accountNumber', placeholder: 'Account Number' },
    { name: 'ifscCode', placeholder: 'IFSC Code' }
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side required field validation
    const requiredFields = ['empId', 'password', 'employeeName', 'sex', 'email', 'mobileNo', 'alternateNo', 'department', 'designation', 'dateOfJoining'];
    for (let field of requiredFields) {
      if (!formData[field]) {
        alert(`Please fill in the required field: ${field}`);
        return;
      }
    }

    const submitData = new FormData();

    Object.entries(formData).forEach(([key, val]) => {
      submitData.append(key, val);
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
    <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-md">
      <div className="bg-gradient-to-b from-white to-blue-100 rounded-2xl p-6 w-[900px] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add New User</h2>
          <button onClick={onClose} className="text-xl font-bold">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Employee Details */}
          <div className="bg-white rounded-xl p-4 shadow">
            <h3 className="font-semibold text-lg mb-3">Employee Details</h3>
            <div className="grid grid-cols-3 gap-3">
              {initialFields.slice(0, 11).map((field) => (
                <input
                  key={field.name}
                  name={field.name}
                  type={field.type || 'text'}
                  placeholder={field.placeholder}
                  value={formData[field.name]}
                  onChange={handleInputChange}
                  required={field.required}
                  className="border p-1 rounded"
                />
              ))}
            </div>
          </div>

          {/* Identity Docs */}
          <div className="bg-white rounded-xl p-4 shadow">
            <h3 className="font-semibold text-lg mb-3">Identity Docs</h3>
            <div className="grid grid-cols-3 gap-3">
              {['pancard', 'aadharcard', 'educationalDocs'].map((doc) => (
                <div className="relative" key={doc}>
                  <input
                    type="file"
                    id={doc}
                    name={doc}
                    multiple={doc === 'educationalDocs'}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor={doc}
                    className="block w-full border p-2 rounded text-gray-700 cursor-pointer hover:bg-gray-100 text-center"
                  >
                    Upload {doc}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Previous Company Docs */}
          <div className="bg-white rounded-xl p-4 shadow">
            <h3 className="font-semibold text-lg mb-3">Previous Company Docs</h3>
            <div className="grid grid-cols-2 gap-3">
              {['releaseLetter', 'offerLetter', 'experienceLetter', 'bankStatementOrSalarySlip'].map((doc) => (
                <div className="relative" key={doc}>
                  <input
                    type="file"
                    id={doc}
                    name={doc}
                    multiple={doc === 'bankStatementOrSalarySlip'}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor={doc}
                    className="block w-full border p-2 rounded text-gray-700 cursor-pointer hover:bg-gray-100 text-center"
                  >
                    Upload {doc}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Banking Details */}
          <div className="bg-white rounded-xl p-4 shadow">
            <h3 className="font-semibold text-lg mb-3">Banking Details</h3>
            <div className="grid grid-cols-3 gap-3">
              {initialFields.slice(11).map((field) => (
                <input
                  key={field.name}
                  name={field.name}
                  type={field.type || 'text'}
                  placeholder={field.placeholder}
                  value={formData[field.name]}
                  onChange={handleInputChange}
                  required={field.required}
                  className="border p-2 rounded"
                />
              ))}
            </div>
          </div>

          <button type="submit" className="w-full bg-black text-white py-3 rounded-full text-lg">Submit</button>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;
