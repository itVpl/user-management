import React, { useState } from "react";
import { FaPlus, FaUpload, FaTimes } from "react-icons/fa";
import axios from "axios";

export default function AddCustomerForm() {
  const [formData, setFormData] = useState({
    userType: "shipper",
    compName: "",
    email: "",
    phoneNo: "",
    password: "",
    mc_dot_no: "",
    state: "",
    city: "",
    zipcode: "",
    file: null,
  });

  const [agentIds, setAgentIds] = useState([""]);

  const handleChange = (e, index = null) => {
    const { name, value, files } = e.target;
    if (name === "file") {
      setFormData({ ...formData, file: files[0] });
    } else if (name === "agentId" && index !== null) {
      const updated = [...agentIds];
      updated[index] = value;
      setAgentIds(updated);
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleAddAgentId = () => setAgentIds([...agentIds, ""]);
  const handleRemoveAgentId = (index) =>
    setAgentIds(agentIds.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    const { compName, email, phoneNo, password } = formData;
    if (!compName || !email || !phoneNo || !password) {
      alert("❌ Please fill all required fields.");
      return;
    }

    const form = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (key === "file" && value) {
        form.append("file", value);
      } else {
        form.append(key, value);
      }
    });

    agentIds.forEach((id) => {
      if (id.trim()) form.append("agentIds[]", id.trim());
    });

    try {
      const res = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/employee/add`,
        form,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          withCredentials: true,
        }
      );

      if (res.data.success) {
        alert("✅ Shipper added successfully!");
        // Reset form
        setFormData({
          userType: "shipper",
          compName: "",
          email: "",
          phoneNo: "",
          password: "",
          mc_dot_no: "",
          state: "",
          city: "",
          zipcode: "",
          file: null,
        });
        setAgentIds([""]);
      } else {
        alert("❌ Failed to add shipper.");
      }
    } catch (err) {
      console.error("❌ Submission error:", err.response?.data || err.message);
      alert(`❌ Error: ${err.response?.data?.message || err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-200 to-blue-400 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl shadow-lg w-full max-w-2xl p-6 space-y-6"
      >
        <h2 className="text-center text-xl font-semibold">Customer Registration</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input type="text" name="compName" placeholder="Company Name" value={formData.compName} onChange={handleChange} className="border rounded px-4 py-2" />
          <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} className="border rounded px-4 py-2" />
          <input type="text" name="phoneNo" placeholder="Phone Number" value={formData.phoneNo} onChange={handleChange} className="border rounded px-4 py-2" />
          <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} className="border rounded px-4 py-2" />
          <input type="text" name="mc_dot_no" placeholder="MC/DOT Number" value={formData.mc_dot_no} onChange={handleChange} className="border rounded px-4 py-2" />
          <input type="text" name="state" placeholder="State" value={formData.state} onChange={handleChange} className="border rounded px-4 py-2" />
          <input type="text" name="city" placeholder="City" value={formData.city} onChange={handleChange} className="border rounded px-4 py-2" />
          <input type="text" name="zipcode" placeholder="Zip Code" value={formData.zipcode} onChange={handleChange} className="border rounded px-4 py-2" />
        </div>

        {/* Agent ID Section */}
        <div>
          <h3 className="text-lg font-medium text-center mt-4">Agent IDs</h3>
          {agentIds.map((agentId, index) => (
            <div key={index} className="flex items-center gap-2 mt-2">
              <input
                type="text"
                name="agentId"
                value={agentId}
                placeholder="Agent ID"
                onChange={(e) => handleChange(e, index)}
                className="border rounded px-4 py-2 flex-1"
              />
              {agentIds.length > 1 && (
                <button type="button" onClick={() => handleRemoveAgentId(index)} className="text-red-500">
                  <FaTimes />
                </button>
              )}
              {index === agentIds.length - 1 && (
                <button type="button" onClick={handleAddAgentId} className="text-green-600">
                  <FaPlus />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* File Upload */}
        <div className="text-center mt-4">
          <h3 className="text-lg font-medium mb-2">Upload Verification</h3>
          <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg py-10 text-gray-400 cursor-pointer">
            <FaUpload size={32} />
            <input type="file" name="file" className="hidden" onChange={handleChange} />
            <span className="text-sm mt-2">Click to upload file</span>
          </label>
        </div>

        <button type="submit" className="w-full mt-6 bg-blue-600 text-white py-3 rounded-full text-lg hover:bg-blue-700">
          Submit
        </button>
      </form>
    </div>
  );
}
