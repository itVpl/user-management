// Components/AddTruckerForm.jsx
import React, { useState } from "react";
import axios from "axios";
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

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
    file: null,
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "file") {
      setFormData({ ...formData, file: files[0] });
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

    const truckerData = {
      compName: formData.compName,
      mc_dot_no: formData.mc_dot_no,
      carrierType: formData.carrierType,
      fleetsize: parseInt(formData.fleetsize) || 0,
      compAdd: formData.compAdd,
      country: formData.country,
      state: formData.state,
      city: formData.city,
      zipcode: formData.zipcode,
      phoneNo: formData.phoneNo,
      email: formData.email,
      password: formData.password
    };

    try {
      const res = await axios.post(
        "https://vpl-liveproject-1.onrender.com/api/v1/shipper_driver/cmt/add-trucker",
        truckerData,
        {
          headers: {
            "Content-Type": "application/json",
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
          file: null,
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
    }
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

        {/* Create Account Card */}
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl mb-1 p-8 flex flex-col items-center">
          <h4 className="text-2xl font-bold mb-4 text-center">Create Account</h4>
          <div className="w-full flex flex-col gap-4 mb-4">
            {/* Email | Upload Docs */}
            <div className="grid grid-cols-2 gap-4">
              <input type="email" name="email" placeholder="Enter E-mail" value={formData.email} onChange={handleChange} className="border border-gray-400 px-4 py-2 rounded-lg" required />
              <input type="file" name="file" onChange={handleChange} className="border border-gray-400 px-4 py-2 rounded-lg" />
            </div>
            {/* Create Password | Re-enter Password */}
            <div className="grid grid-cols-2 gap-4">
              <input type="password" name="password" placeholder="Create Password" value={formData.password} onChange={handleChange} className="border border-gray-400 px-4 py-2 rounded-lg" required />
              <input type="password" name="confirmPassword" placeholder="Re-enter Password" value={formData.confirmPassword} onChange={handleChange} className="border border-gray-400 px-4 py-2 rounded-lg" required />
            </div>
          </div>
          <button type="submit" className="w-full bg-black text-white py-3 rounded-full text-lg font-bold hover:opacity-90 transition">Add Trucker</button>
        </div>
      </form>
    </div>
  );
}
