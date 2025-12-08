import React, { useState } from "react";
import { FaPlus, FaUpload, FaTimes } from "react-icons/fa";

export default function AddCustomerForm() {
  const [formData, setFormData] = useState({
    customerId: "",
    name: "",
    mobile: "",
    sex: "",
    email: "",
    creditLimit: "",
    file: null,
  });

  const [agentIds, setAgentIds] = useState([""]);

  const handleChange = (e, index = null) => {
    const { name, value, files } = e.target;
    if (name === "file") {
      setFormData({ ...formData, file: files[0] });
    } else if (name === "agentId" && index !== null) {
      const updatedAgents = [...agentIds];
      updatedAgents[index] = value;
      setAgentIds(updatedAgents);
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleAddAgentId = () => {
    setAgentIds([...agentIds, ""]);
  };

  const handleRemoveAgentId = (index) => {
    const updatedAgents = agentIds.filter((_, i) => i !== index);
    setAgentIds(updatedAgents);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Add your API logic here
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-200 to-blue-400 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl shadow-lg w-full max-w-2xl p-6 space-y-6"
      >
        {/* Customer Details */}
        <div className="space-y-4">
          <h2 className="text-center text-xl font-semibold">Customer Details</h2>
          <input
            type="text"
            name="customerId"
            placeholder="Customer ID"
            className="w-full border rounded px-4 py-2"
            value={formData.customerId}
            onChange={handleChange}
          />
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              name="name"
              placeholder="Enter Name"
              className="flex-1 border rounded px-4 py-2"
              value={formData.name}
              onChange={handleChange}
            />
            <input
              type="text"
              name="mobile"
              placeholder="Mobile no."
              className="flex-1 border rounded px-4 py-2"
              value={formData.mobile}
              onChange={handleChange}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              name="sex"
              placeholder="Sex"
              className="flex-1 border rounded px-4 py-2"
              value={formData.sex}
              onChange={handleChange}
            />
            <input
              type="email"
              name="email"
              placeholder="Enter E-mail"
              className="flex-1 border rounded px-4 py-2"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          <input
            type="text"
            name="creditLimit"
            placeholder="Customer Credit Limit"
            className="w-full border rounded px-4 py-2"
            value={formData.creditLimit}
            onChange={handleChange}
          />
        </div>

        {/* Agent ID */}
        <div className="space-y-2 text-center">
          <h2 className="text-xl font-semibold">Agent ID</h2>
          {agentIds.map((agent, idx) => (
            <div key={idx} className="flex justify-center items-center gap-2 mt-2">
              <input
                type="text"
                name="agentId"
                placeholder="Agent ID"
                className="border rounded px-4 py-2"
                value={agent}
                onChange={(e) => handleChange(e, idx)}
              />
              {agentIds.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveAgentId(idx)}
                  className="text-red-500"
                >
                  <FaTimes />
                </button>
              )}
              {idx === agentIds.length - 1 && (
                <button
                  type="button"
                  onClick={handleAddAgentId}
                  className="text-blue-500"
                >
                  <FaPlus />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Upload Section */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Upload Customer Proof</h2>
          <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg py-10 text-gray-400 cursor-pointer">
            <FaUpload size={32} />
            <input
              type="file"
              name="file"
              className="hidden"
              onChange={handleChange}
            />
          </label>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-3 bg-black text-white rounded-full text-lg hover:opacity-90"
          >
            Add
          </button>
        </div>
      </form>
    </div>
  );
}