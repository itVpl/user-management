// Components/AddTruckerForm.jsx
import React, { useState } from "react";

export default function AddTruckerForm({ type }) {
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData, userType: type };
    console.log("🚛 Submitted Trucker Data:", payload);
    // Submit via Axios here
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-b from-blue-200 to-blue-400">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl shadow-xl w-full max-w-3xl p-8 space-y-8"
      >
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-center">Basic Details</h2>
          <input
            type="text"
            name="compName"
            placeholder="Company Name"
            value={formData.compName}
            onChange={handleChange}
            className="w-full border px-4 py-2 rounded"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="compAdd"
              placeholder="Company Address"
              value={formData.compAdd}
              onChange={handleChange}
              className="border px-4 py-2 rounded"
            />
            <input
              type="text"
              name="country"
              placeholder="Country"
              value={formData.country}
              onChange={handleChange}
              className="border px-4 py-2 rounded"
            />
            <input
              type="text"
              name="state"
              placeholder="State"
              value={formData.state}
              onChange={handleChange}
              className="border px-4 py-2 rounded"
            />
            <input
              type="text"
              name="city"
              placeholder="City"
              value={formData.city}
              onChange={handleChange}
              className="border px-4 py-2 rounded"
            />
            <input
              type="text"
              name="zipcode"
              placeholder="Zip Code"
              value={formData.zipcode}
              onChange={handleChange}
              className="border px-4 py-2 rounded"
            />
            <input
              type="text"
              name="phoneNo"
              placeholder="Phone No"
              value={formData.phoneNo}
              onChange={handleChange}
              className="border px-4 py-2 rounded"
            />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-center">Fleet Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              name="mc_dot_no"
              placeholder="MC/DOT No"
              value={formData.mc_dot_no}
              onChange={handleChange}
              className="border px-4 py-2 rounded"
            />
            <input
              type="text"
              name="carrierType"
              placeholder="Carrier Type"
              value={formData.carrierType}
              onChange={handleChange}
              className="border px-4 py-2 rounded"
            />
            <input
              type="text"
              name="fleetsize"
              placeholder="Fleet Size"
              value={formData.fleetsize}
              onChange={handleChange}
              className="border px-4 py-2 rounded"
            />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-center">Create Account</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="email"
              name="email"
              placeholder="Enter E-mail"
              value={formData.email}
              onChange={handleChange}
              className="border px-4 py-2 rounded"
            />
            <input
              type="file"
              name="file"
              onChange={handleChange}
              className="border px-4 py-2 rounded"
            />
            <input
              type="password"
              name="password"
              placeholder="Create Password"
              value={formData.password}
              onChange={handleChange}
              className="border px-4 py-2 rounded"
            />
            <input
              type="password"
              name="confirmPassword"
              placeholder="Re-enter Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="border px-4 py-2 rounded"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-black text-white py-3 rounded-full text-lg hover:opacity-90"
        >
          Add Trucker
        </button>
      </form>
    </div>
  );
}
