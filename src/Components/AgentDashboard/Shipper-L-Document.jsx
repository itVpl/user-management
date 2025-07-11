import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowLeft, Download, X } from 'lucide-react';
import AddTruckerForm from './AddCustomer';

const ShippersLDocuments = () => {
  const [shippers, setShippers] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [reasonText, setReasonText] = useState('');
  const [showAddTruckerForm, setShowAddTruckerForm] = useState(false);
  const [updatedUser, setUpdatedUser] = useState(null);

  // ✅ Fetch shippers from API
  useEffect(() => {
    const fetchShippers = async () => {
      try {
        const res = await axios.get('https://vpl-liveproject-1.onrender.com/api/v1/shipper_driver/shippers');
        setShippers(res.data.data || []);
      } catch (error) {
        console.error('❌ Failed to fetch shippers:', error);
      }
    };
    fetchShippers();
  }, []);

  const getStatusBadge = (status) => {
    const base = 'px-3 py-1 rounded-full text-sm font-medium';
    if (status === 'approved') return `${base} bg-green-600 text-white`;
    if (status === 'rejected') return `${base} bg-red-600 text-white`;
    if (status === 'resubmit') return `${base} bg-blue-500 text-white`;
    return `${base} bg-gray-500 text-white`;
  };

  const handleViewClick = (shipment) => {
    setSelectedShipment(shipment);
    setUpdatedUser(null);
  };

  const handleActionClick = (action) => {
    setActionModal(action);
    setReasonText('');
  };

  const handleSubmitReason = async () => {
    if (!selectedShipment || !actionModal) return;
    const statusMap = {
      approve: 'approved',
      reject: 'rejected',
      resubmit: 'resubmit',
    };
    const status = statusMap[actionModal];

    try {
      const res = await axios.patch(
        `https://vpl-liveproject-1.onrender.com/api/v1/shipper_driver/simple-status/${selectedShipment._id}`,
        { status }
      );
      alert(`Status updated to "${status}" successfully`);
      setUpdatedUser(res.data.user);
      setActionModal(null);
      setReasonText('');
    } catch (err) {
      console.error('❌ Error:', err);
      alert('Failed to update status');
    }
  };

  const ActionModal = ({ action, onClose }) => {
    const placeholder = {
      approve: 'Type reason of approval',
      reject: 'Type reason of rejection',
      resubmit: 'Type reason of Re-submission',
    }[action] || 'Type reason';

    return (
      <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Reason</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
          <textarea
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            placeholder={placeholder}
            className="w-full h-32 p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex justify-end mt-4">
            <button
              onClick={handleSubmitReason}
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex-1 p-6">

        <div className="flex justify-end p-4">
          <button
            onClick={() => setShowAddTruckerForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + Add Customer
          </button>
        </div>

        {!selectedShipment ? (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {shippers.map((shipper) => (
                    <tr key={shipper._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shipper.compName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shipper.phoneNo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shipper.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusBadge(shipper.status)}>{shipper.status}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleViewClick(shipper)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setSelectedShipment(null)}
                className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full hover:bg-gray-200"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex space-x-4">
                <button
                  onClick={() => handleActionClick('approve')}
                  className="px-6 py-2 bg-green-600 text-white rounded-full hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleActionClick('reject')}
                  className="px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
              <button className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full hover:bg-gray-200">
                <Download size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div><strong>Company Name:</strong> {selectedShipment.compName}</div>
              <div><strong>Email:</strong> {selectedShipment.email}</div>
              <div><strong>Phone:</strong> {selectedShipment.phoneNo}</div>
              <div><strong>City:</strong> {selectedShipment.city}</div>
              <div><strong>State:</strong> {selectedShipment.state}</div>
              <div><strong>Country:</strong> {selectedShipment.country}</div>
              <div><strong>Carrier Type:</strong> {selectedShipment.carrierType?.trim()}</div>
              <div><strong>Fleet Size:</strong> {selectedShipment.fleetsize}</div>
              <div><strong>Status:</strong> {selectedShipment.status}</div>
            </div>

            {updatedUser && (
              <div className="mt-6 border-t pt-6">
                <h2 className="text-xl font-semibold mb-4">Updated User Info</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div><strong>Company Name:</strong> {updatedUser.compName}</div>
                  <div><strong>Email:</strong> {updatedUser.email}</div>
                  <div><strong>Status:</strong> {updatedUser.status}</div>
                  <div><strong>Status Updated At:</strong> {new Date(updatedUser.statusUpdatedAt).toLocaleString()}</div>
                  <div><strong>Updated By:</strong> {updatedUser.statusUpdatedBy || "N/A"}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {showAddTruckerForm && (
          <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 z-50 flex justify-center items-center">
            <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-xl overflow-auto max-h-[90vh]">
              <button
                onClick={() => setShowAddTruckerForm(false)}
                className="absolute top-3 right-3 text-gray-500 hover:text-black"
              >
                <X size={24} />
              </button>
              <AddTruckerForm />
            </div>
          </div>
        )}

        {actionModal && (
          <ActionModal
            action={actionModal}
            onClose={() => setActionModal(null)}
          />
        )}
      </div>
    </div>
  );
};

export default ShippersLDocuments;
