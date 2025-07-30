// Components/AddTruckerForm.jsx
import React, { useState } from "react";
import axios from "axios";
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import { FileText, Upload, CheckCircle, XCircle } from 'lucide-react';

export default function AddTruckerForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    compName: "",
    compAdd: "",
    country: "",
    state: "",
    city: "",
    zipcode: "",
    phoneNo: "",
    mc_dot_no: "",
    carrierType: "",
    fleetsize: "",
    email: "",
    password: "",
    confirmPassword: "",
    // Document uploads
    brokeragePacket: null,
    carrierPartnerAgreement: null,
    w9Form: null,
    mcAuthority: null,
    safetyLetter: null,
    bankingInfo: null,
    inspectionLetter: null,
    insurance: null,
  });

  const [uploadStatus, setUploadStatus] = useState({
    brokeragePacket: false,
    carrierPartnerAgreement: false,
    w9Form: false,
    mcAuthority: false,
    safetyLetter: false,
    bankingInfo: false,
    inspectionLetter: false,
    insurance: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const documentFields = [
    { key: 'brokeragePacket', label: 'Brokerage Packet', required: true },
    { key: 'carrierPartnerAgreement', label: 'Carrier Partner Agreement', required: true },
    { key: 'w9Form', label: 'W9 Form', required: true },
    { key: 'mcAuthority', label: 'MC Authority', required: true },
    { key: 'safetyLetter', label: 'Safety Letter', required: true },
    { key: 'bankingInfo', label: 'Banking Information', required: true },
    { key: 'inspectionLetter', label: 'Inspection Letter', required: true },
    { key: 'insurance', label: 'Insurance', required: true },
  ];

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setFormData({ ...formData, [name]: files[0] });
      setUploadStatus({ ...uploadStatus, [name]: true });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alertify.error("❌ Passwords do not match.");
      return;
    }

    // Check if all required documents are uploaded
    const missingDocuments = documentFields
      .filter(doc => doc.required && !formData[doc.key])
      .map(doc => doc.label);

    if (missingDocuments.length > 0) {
      alertify.error(`❌ Please upload the following documents: ${missingDocuments.join(', ')}`);
      return;
    }

    setIsSubmitting(true);

    const truckerData = new FormData();
    
    // Add basic information
    truckerData.append('compName', formData.compName);
    truckerData.append('mc_dot_no', formData.mc_dot_no);
    truckerData.append('carrierType', formData.carrierType);
    truckerData.append('fleetsize', parseInt(formData.fleetsize) || 0);
    truckerData.append('compAdd', formData.compAdd);
    truckerData.append('country', formData.country);
    truckerData.append('state', formData.state);
    truckerData.append('city', formData.city);
    truckerData.append('zipcode', formData.zipcode);
    truckerData.append('phoneNo', formData.phoneNo);
    truckerData.append('email', formData.email);
    truckerData.append('password', formData.password);

    // Add documents
    documentFields.forEach(doc => {
      if (formData[doc.key]) {
        truckerData.append(doc.key, formData[doc.key]);
      }
    });

    try {
      const res = await axios.post(
        "https://vpl-liveproject-1.onrender.com/api/v1/shipper_driver/cmt/add-trucker",
        truckerData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          withCredentials: true,
        }
      );

      if (res.status === 200 || res.data.success) {
        alertify.success("✅ Trucker added successfully!");
        setFormData({
          compName: "",
          compAdd: "",
          country: "",
          state: "",
          city: "",
          zipcode: "",
          phoneNo: "",
          mc_dot_no: "",
          carrierType: "",
          fleetsize: "",
          email: "",
          password: "",
          confirmPassword: "",
          brokeragePacket: null,
          carrierPartnerAgreement: null,
          w9Form: null,
          mcAuthority: null,
          safetyLetter: null,
          bankingInfo: null,
          inspectionLetter: null,
          insurance: null,
        });
        setUploadStatus({
          brokeragePacket: false,
          carrierPartnerAgreement: false,
          w9Form: false,
          mcAuthority: false,
          safetyLetter: false,
          bankingInfo: false,
          inspectionLetter: false,
          insurance: false,
        });
        // Close modal after successful submission
        if (onSuccess) {
          onSuccess();
        }
      } else {
        alertify.error("❌ Failed to add trucker.");
      }
    } catch (error) {
      console.error("❌ Submission error:", error.response?.data || error.message);
      alertify.error(`❌ Error: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUploadIcon = (fieldName) => {
    if (uploadStatus[fieldName]) {
      return <CheckCircle className="text-green-500" size={20} />;
    }
    return <Upload className="text-gray-400" size={20} />;
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-transparent py-8 px-2">
      {/* Basic Details Card */}
      <form onSubmit={handleSubmit} className="w-full max-w-2xl flex flex-col gap-4">
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl mb-1 p-8 flex flex-col items-center">
          <h4 className="text-2xl font-bold mb-4 text-center">Basic Details</h4>
          <div className="w-full flex flex-col gap-4">
            {/* Company Name full width */}
            <input
              type="text"
              name="compName"
              placeholder="Company Name"
              value={formData.compName}
              onChange={handleChange}
              className="w-full border border-gray-400 px-4 py-2 rounded-lg"
              required
            />
            {/* Company Add | Country */}
            <div className="grid grid-cols-2 gap-4">
              <input type="text" name="compAdd" placeholder="Company Address" value={formData.compAdd} onChange={handleChange} className="border border-gray-400 px-4 py-2 rounded-lg" />
              <input type="text" name="country" placeholder="Country" value={formData.country} onChange={handleChange} className="border border-gray-400 px-4 py-2 rounded-lg" />
            </div>
            {/* State | City */}
            <div className="grid grid-cols-2 gap-4">
              <input type="text" name="state" placeholder="State" value={formData.state} onChange={handleChange} className="border border-gray-400 px-4 py-2 rounded-lg" />
              <input type="text" name="city" placeholder="City" value={formData.city} onChange={handleChange} className="border border-gray-400 px-4 py-2 rounded-lg" />
            </div>
            {/* Zip Code | Phone */}
            <div className="grid grid-cols-2 gap-4">
              <input type="text" name="zipcode" placeholder="Zip Code" value={formData.zipcode} onChange={handleChange} className="border border-gray-400 px-4 py-2 rounded-lg" />
              <input type="text" name="phoneNo" placeholder="Phone" value={formData.phoneNo} onChange={handleChange} className="border border-gray-400 px-4 py-2 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Fleet Details Card */}
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl mb-1 p-8 flex flex-col items-center">
          <h4 className="text-2xl font-bold mb-4 text-center">Fleet Details</h4>
          <div className="w-full grid grid-cols-3 gap-4">
            <input type="text" name="mc_dot_no" placeholder="MC/DOT No" value={formData.mc_dot_no} onChange={handleChange} className="border border-gray-400 px-4 py-2 rounded-lg" />
            <input type="text" name="carrierType" placeholder="Carrier Type" value={formData.carrierType} onChange={handleChange} className="border border-gray-400 px-4 py-2 rounded-lg" />
            <input type="text" name="fleetsize" placeholder="Fleet Size" value={formData.fleetsize} onChange={handleChange} className="border border-gray-400 px-4 py-2 rounded-lg" />
          </div>
        </div>

        {/* Document Upload Card */}
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl mb-1 p-8 flex flex-col items-center">
          <h4 className="text-2xl font-bold mb-4 text-center">Required Documents</h4>
          <div className="w-full grid grid-cols-2 gap-4">
            {documentFields.map((doc) => (
              <div key={doc.key} className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <FileText size={16} />
                  {doc.label}
                  {doc.required && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    type="file"
                    name={doc.key}
                    onChange={handleChange}
                    className="w-full border border-gray-400 px-4 py-2 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    required={doc.required}
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    {getUploadIcon(doc.key)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Create Account Card */}
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl mb-1 p-8 flex flex-col items-center">
          <h4 className="text-2xl font-bold mb-4 text-center">Create Account</h4>
          <div className="w-full flex flex-col gap-4 mb-4">
            {/* Email */}
            <input type="email" name="email" placeholder="Enter E-mail" value={formData.email} onChange={handleChange} className="w-full border border-gray-400 px-4 py-2 rounded-lg" required />
            {/* Create Password | Re-enter Password */}
            <div className="grid grid-cols-2 gap-4">
              <input type="password" name="password" placeholder="Create Password" value={formData.password} onChange={handleChange} className="border border-gray-400 px-4 py-2 rounded-lg" required />
              <input type="password" name="confirmPassword" placeholder="Re-enter Password" value={formData.confirmPassword} onChange={handleChange} className="border border-gray-400 px-4 py-2 rounded-lg" required />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className={`w-full py-3 rounded-full text-lg font-bold transition flex items-center justify-center gap-2 ${
              isSubmitting 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-black text-white hover:opacity-90'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Adding Trucker...
              </>
            ) : (
              'Add Trucker'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
