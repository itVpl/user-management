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
  const [loading, setLoading] = useState(true);

  // ✅ Fetch shippers from API
  useEffect(() => {
    
    const fetchShippers = async () => {
      setLoading(true); //
      try {
        const res = await axios.get('https://vpl-liveproject-1.onrender.com/api/v1/shipper_driver/shippers');
        setShippers(res.data.data || []);
      } catch (error) {
        console.error('❌ Failed to fetch shippers:', error);
      } finally{
        setLoading(false);
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
    <div className="min-h-screen bg-graient-to-br from-[#e0eafc] to-[#cfdef3] p-10">
  <div className="max-w-8xl mx-auto space-y-8">

    {/* Top Button */}
    <div className="flex justify-end">
      <button
        onClick={() => setShowAddTruckerForm(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        + Add Customer
      </button>
    </div>

    {/* Loading */}
    {loading ? (
       <div className="flex justify-center items-center py-20">
    <div className="w-10 h-10 border-b-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
    ) : !selectedShipment ? (

      // 🧊 Table Card
      <div className="bg-white/60 backdrop-blur-md rounded-3xl shadow-[0_10px_60px_rgba(0,0,0,0.1)] border border-white/40 overflow-hidden">
        <div className="overflow-x-auto rounded-3xl">
          <table className="w-full text-sm text-gray-800">
            <thead className="text-left bg-gray-200 uppercase text-xs font-bold tracking-widest text-gray-600 border-b border-gray-300">
              <tr className=''>
                {["Company", "Phone", "Email", "Status", "Action"].map((h) => (
                  <th className="px-6 py-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {shippers.map((shipper) => (
                <tr key={shipper._id} className="hover:bg-white/70 transition duration-150">
                  <td className="px-6 py-4 font-semibold">{shipper.compName}</td>
                  <td className="px-6 py-4">{shipper.phoneNo}</td>
                  <td className="px-6 py-4">{shipper.email}</td>
                  <td className="px-6 py-4">
                    <span className={getStatusBadge(shipper.status)}>{shipper.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleViewClick(shipper)}
                      className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 shadow-sm"
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

      // 🔎 Details View
      <div className="bg-white/60 rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.1)] border border-white/40 p-10 backdrop-blur-md">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => setSelectedShipment(null)}
            className="w-10 h-10 bg-white rounded-full shadow hover:shadow-md flex justify-center items-center"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex gap-4">
            <button
              onClick={() => handleActionClick('approve')}
              className="bg-green-500 text-white px-6 py-2 rounded-full shadow-md hover:shadow-xl"
            >
              Approve
            </button>
            <button
              onClick={() => handleActionClick('reject')}
              className="bg-red-500 text-white px-6 py-2 rounded-full shadow-md hover:shadow-xl"
            >
              Reject
            </button>
          </div>
          <button className="w-10 h-10 bg-white rounded-full shadow hover:shadow-md flex justify-center items-center">
            <Download size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-gray-800 text-sm">
          {[
            ["Company Name", selectedShipment.compName],
            ["Email", selectedShipment.email],
            ["Phone", selectedShipment.phoneNo],
            ["City", selectedShipment.city],
            ["State", selectedShipment.state],
            ["Country", selectedShipment.country],
            ["Carrier Type", selectedShipment.carrierType?.trim()],
            ["Fleet Size", selectedShipment.fleetsize],
            ["Status", selectedShipment.status],
          ].map(([label, value]) => (
            <div key={label}>
              <strong>{label}:</strong> {value}
            </div>
          ))}
        </div>

        {updatedUser && (
          <div className="mt-10 pt-6 border-t border-gray-300">
            <h3 className="text-lg font-semibold mb-4">🔄 Updated Info</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><strong>Company:</strong> {updatedUser.compName}</div>
              <div><strong>Email:</strong> {updatedUser.email}</div>
              <div><strong>Status:</strong> {updatedUser.status}</div>
              <div><strong>Updated At:</strong> {new Date(updatedUser.statusUpdatedAt).toLocaleString()}</div>
              <div><strong>Updated By:</strong> {updatedUser.statusUpdatedBy || "N/A"}</div>
            </div>
          </div>
        )}
      </div>
    )}

    {/* ➕ Add Modal */}
    {showAddTruckerForm && (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex justify-center items-center px-4">
        <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-auto border border-gray-200 relative">
          <button
            onClick={() => setShowAddTruckerForm(false)}
            className="absolute top-4 right-4 text-gray-600 hover:text-black"
          >
            <X size={24} />
          </button>
          <AddTruckerForm />
        </div>
      </div>
    )}

    {/* Modal */}
    {actionModal && (
      <ActionModal action={actionModal} onClose={() => setActionModal(null)} />
    )}
  </div>
</div>

  );
};

export default ShippersLDocuments;
