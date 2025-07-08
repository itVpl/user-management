// File: src/components/AddUserModal.jsx
import React, { useState } from 'react';
import axios from 'axios';
import './AddUser.css'; // Assuming you have some styles for the modal

const AddUserModal = ({ onClose }) => {
  const initialFields = [
    { name: 'empId', placeholder: 'Employee ID' },
    { name: 'password', placeholder: 'Create Password' },
    { name: 'employeeName', placeholder: 'Enter Name' },
    { name: 'sex', placeholder: 'Sex' },
    { name: 'email', placeholder: 'Enter E-mail' },
    { name: 'mobileNo', placeholder: 'Mobile no.' },
    { name: 'alternateNo', placeholder: 'Alternate mobile no.' },
    { name: 'emergencyNo', placeholder: 'Emergency no.' },
    { name: 'department', placeholder: 'Department' },
    { name: 'designation', placeholder: 'Enter Designation' },
    { name: 'dateOfJoining', placeholder: 'Date of Joining', type: 'date' },
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
      await axios.post('http://localhost:4000/api/v1/inhouseUser', submitData, {
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
          <h2 className="text-xl font-semibold"></h2>
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
                  className="border p-1 rounded"
                />
              ))}
            </div>
          </div>

    {/* Identity Docs */}
<div className="bg-white rounded-xl p-4 shadow">
  <h3 className="font-semibold text-lg mb-3">Identity Docs</h3>
  <div className="grid grid-cols-3 gap-3">
    {/* Pancard */}
    <div className="relative">
      <input
        type="file"
        id="pancard"
        name="pancard"
        onChange={handleFileChange}
        className="hidden"
      />
      <label
        htmlFor="pancard"
        className="block w-full border p-2 rounded text-gray-700 cursor-pointer hover:bg-gray-100 text-center"
      >
        Upload Pancard
      </label>
    </div>

    {/* Aadharcard */}
    <div className="relative">
      <input
        type="file"
        id="aadharcard"
        name="aadharcard"
        onChange={handleFileChange}
        className="hidden"
      />
      <label
        htmlFor="aadharcard"
        className="block w-full border p-2 rounded text-gray-700 cursor-pointer hover:bg-gray-100 text-center"
      >
        Upload Aadharcard
      </label>
    </div>

    {/* Educational Docs */}
    <div className="relative">
      <input
        type="file"
        id="educationalDocs"
        name="educationalDocs"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      <label
        htmlFor="educationalDocs"
        className="block w-full border p-2 rounded text-gray-700 cursor-pointer hover:bg-gray-100 text-center"
      >
        Upload Educational Docs
      </label>
    </div>
  </div>
</div>

{/* Previous Company Docs */}
<div className="bg-white rounded-xl p-4 shadow mt-6">
  <h3 className="font-semibold text-lg mb-3">Previous Company Docs</h3>
  <div className="grid grid-cols-2 gap-3">
    {/* Release Letter */}
    <div className="relative">
      <input
        type="file"
        id="releaseLetter"
        name="releaseLetter"
        onChange={handleFileChange}
        className="hidden"
      />
      <label
        htmlFor="releaseLetter"
        className="block w-full border p-2 rounded text-gray-700 cursor-pointer hover:bg-gray-100 text-center"
      >
        Upload Release Letter
      </label>
    </div>

    {/* Offer Letter */}
    <div className="relative">
      <input
        type="file"
        id="offerLetter"
        name="offerLetter"
        onChange={handleFileChange}
        className="hidden"
      />
      <label
        htmlFor="offerLetter"
        className="block w-full border p-2 rounded text-gray-700 cursor-pointer hover:bg-gray-100 text-center"
      >
        Upload Offer Letter
      </label>
    </div>

    {/* Experience Letter */}
    <div className="relative">
      <input
        type="file"
        id="experienceLetter"
        name="experienceLetter"
        onChange={handleFileChange}
        className="hidden"
      />
      <label
        htmlFor="experienceLetter"
        className="block w-full border p-2 rounded text-gray-700 cursor-pointer hover:bg-gray-100 text-center"
      >
        Upload Experience Letter
      </label>
    </div>

    {/* Bank Statement or Salary Slip */}
    <div className="relative">
      <input
        type="file"
        id="bankStatementOrSalarySlip"
        name="bankStatementOrSalarySlip"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      <label
        htmlFor="bankStatementOrSalarySlip"
        className="block w-full border p-2 rounded text-gray-700 cursor-pointer hover:bg-gray-100 text-center"
      >
        Upload Bank Statement / Salary Slip
      </label>
    </div>
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
                  className="border p-2 rounded"
                />
              ))}
            </div>
          </div>


             {/* <div className="container">
      <form className="form">
        <div
          className="file-upload-wrapper"
          data-text="Upload Aadhar Card"
        >
          <input
            name="file-upload-field"
            type="file"
            className="file-upload-field"
          />
        </div>
      </form>
    </div> */}

          <button type="submit" className="w-full bg-black text-white py-3 rounded-full text-lg">Submit</button>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;
