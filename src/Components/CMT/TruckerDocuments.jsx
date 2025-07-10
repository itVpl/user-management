import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaArrowLeft, FaDownload } from 'react-icons/fa';
import AddTruckerForm from './AddTruckerform';

export default function TruckerDocuments() {
  const [truckers, setTruckers] = useState([]);
  const [viewDoc, setViewDoc] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [selectedTrucker, setSelectedTrucker] = useState(null);
  const [reason, setReason] = useState('');
  const [showAddTruckerForm, setShowAddTruckerForm] = useState(false);

  useEffect(() => {
    fetchTruckers();
  }, []);

  const fetchTruckers = async () => {
    try {
      const res = await axios.get('https://vpl-liveproject-1.onrender.com/api/v1/shipper_driver/truckers');
      setTruckers(res.data.data || []);
    } catch (err) {
      console.error('Error fetching truckers:', err);
    }
  };

  const handleStatusUpdate = async (status) => {
    try {
      const { _id } = selectedTrucker;
      await axios.patch(`https://vpl-liveproject-1.onrender.com/api/v1/shipper_driver/update-status/${_id}`, {
        status,
        statusReason: reason || null,
      });
      setModalType(null);
      setReason('');
      setSelectedTrucker(null);
      setViewDoc(false);
      fetchTruckers(); // Refresh
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  if (previewImg) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center">
        <div className="relative bg-white rounded-xl overflow-hidden">
          <img src={previewImg} alt="Document Preview" className="max-h-[90vh]" />
          <button
            onClick={() => setPreviewImg(null)}
            className="absolute left-4 top-4 bg-white p-2 rounded-full shadow"
          >
            <FaArrowLeft />
          </button>
        </div>
      </div>
    );
  }

  if (modalType) {
    return (
      <div className="fixed inset-0 z-50 backdrop-blur-sm bg-opacity-40 flex items-center justify-center">
        <div className="bg-white p-6 rounded-xl shadow-md w-[400px] relative">
          <button className="absolute right-4 top-2 text-xl" onClick={() => setModalType(null)}>x</button>
          <textarea
            className="w-full border p-2 rounded mb-4"
            rows={5}
            placeholder={`Type reason of ${modalType}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            onClick={() => handleStatusUpdate(modalType === 'approval' ? 'approved' : modalType === 'rejection' ? 'rejected' : 'resubmit')}
          >
            Submit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowAddTruckerForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + Add Trucker
        </button>
      </div>

      {viewDoc && selectedTrucker ? (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-4">
              <button
                onClick={() => setModalType('approval')}
                className="bg-green-600 text-white px-6 py-2 rounded-full shadow hover:bg-green-700"
              >
                Approve
              </button>
              <button
                onClick={() => setModalType('rejection')}
                className="bg-red-600 text-white px-6 py-2 rounded-full shadow hover:bg-red-700"
              >
                Reject
              </button>
              <button
                onClick={() => setModalType('resubmit')}
                className="bg-blue-500 text-white px-6 py-2 rounded-full shadow hover:bg-blue-600"
              >
                Re-submission
              </button>
            </div>
            <a
              href={`https://vpl-liveproject-1.onrender.com/${selectedTrucker.docUpload}`}
              target="_blank"
              rel="noreferrer"
            >
              <FaDownload className="text-blue-500 text-2xl cursor-pointer" />
            </a>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="text-lg font-semibold mb-2">Company Info</h3>
              <p><strong>Company:</strong> {selectedTrucker.compName}</p>
              <p><strong>MC/DOT No:</strong> {selectedTrucker.mc_dot_no}</p>
              <p><strong>Email:</strong> {selectedTrucker.email}</p>
              <p><strong>Phone:</strong> {selectedTrucker.phoneNo}</p>
              <p><strong>Status:</strong> {selectedTrucker.status}</p>
            </div>
            <div>
              <img
                src={`https://vpl-liveproject-1.onrender.com/${selectedTrucker.docUpload}`}
                alt="Uploaded Doc"
                className="rounded shadow-lg max-h-[250px] w-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : (
        <table className="w-full table-auto bg-white rounded-xl shadow overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Trucker Name</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {truckers.map((t, idx) => (
              <tr key={t._id || idx} className="border-t text-sm">
                <td className="p-3">{new Date(t.createdAt).toLocaleDateString()}</td>
                <td className="p-3">{t.compName}</td>
                <td className="p-3">{t.email}</td>
                <td className="p-3 capitalize">{t.status || 'Pending'}</td>
                <td className="p-3">
                  <button
                    onClick={() => {
                      setViewDoc(true);
                      setSelectedTrucker(t);
                    }}
                    className="bg-gray-300 text-sm px-4 py-1 rounded hover:bg-gray-400"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showAddTruckerForm && (
        <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 z-50 flex justify-center items-center">
          <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-xl overflow-auto max-h-[90vh]">
            <button
              onClick={() => setShowAddTruckerForm(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              ×
            </button>
            <AddTruckerForm />
          </div>
        </div>
      )}
    </div>
  );
}
