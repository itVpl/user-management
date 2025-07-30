import React, { useState } from 'react';

const AssignAgent = () => {
  const [showModal, setShowModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [formData, setFormData] = useState({
    customerName: '',
    contactNumber: '',
    email: '',
    assignedAgent: '',
  });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setCustomers((prev) => [...prev, formData]);
    setFormData({
      customerName: '',
      contactNumber: '',
      email: '',
      assignedAgent: '',
    });
    setShowModal(false);
  };

  return (
    <div className="min-h-screen  from-blue-50 to-white p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Customer Assignments</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-6 py-2 rounded-full shadow-lg font-medium transition-all duration-300"
        >
          ➕ Assign Agent
        </button>
      </div>

      {/* Table */}
      <div className="grid gap-4">
        {customers.length === 0 ? (
          <div className="text-center text-gray-500 text-lg">No customers assigned yet.</div>
        ) : (
          customers.map((cust, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all border-l-4 border-blue-500"
            >
              <div className="grid md:grid-cols-4 sm:grid-cols-2 gap-3 text-gray-700">
                <div>
                  <p className="font-semibold text-sm text-gray-500">Customer</p>
                  <p className="text-lg">{cust.customerName}</p>
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-500">Contact</p>
                  <p className="text-lg">{cust.contactNumber}</p>
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-500">Email</p>
                  <p className="text-lg">{cust.email}</p>
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-500">Agent</p>
                  <p className="text-lg font-medium text-blue-600">{cust.assignedAgent}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 backdrop-blur-sm bg-black/30 flex justify-center items-center px-4">
          <div className="bg-white w-full max-w-xl p-8 rounded-2xl shadow-2xl relative transition-all duration-300 scale-100 animate-[fadeIn_0.3s_ease-out]">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Assign Agent to Customer</h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <input
                type="text"
                name="customerName"
                placeholder="Customer Name"
                value={formData.customerName}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-400 outline-none"
                required
              />
              <input
                type="text"
                name="contactNumber"
                placeholder="Contact Number"
                value={formData.contactNumber}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-400 outline-none"
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-400 outline-none"
                required
              />
              <input
                type="text"
                name="assignedAgent"
                placeholder="Assigned Agent Name"
                value={formData.assignedAgent}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-400 outline-none"
                required
              />

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-2 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow font-medium transition-all"
                >
                  Submit
                </button>
              </div>
            </form>

            {/* Close Icon */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl font-bold focus:outline-none"
              title="Close"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignAgent;
