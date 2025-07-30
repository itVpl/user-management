import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const statusColors = {
  Assigned: 'bg-orange-500',
  Posted: 'bg-blue-500',
  'In Transit': 'bg-blue-700',
};

const RateRequest = () => {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [rate, setRate] = useState('');
  const [message, setMessage] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [rateRequests, setRateRequests] = useState([]);
  const [truckers, setTruckers] = useState([]);
  const [selectedTrucker, setSelectedTrucker] = useState('');
  const [isFetching, setIsFetching] = useState(true);

  const fetchRateRequests = async () => {
    try {
      const res = await axios.get('https://vpl-liveproject-1.onrender.com/api/v1/load/available/');
      setRateRequests(res.data?.loads || []);
    } catch (error) {
      toast.error('Failed to fetch load data');
      console.error(error);
    } finally {
      setIsFetching(false);
    }
  };

  const fetchTruckers = async () => {
    try {
      const res = await axios.get('https://vpl-liveproject-1.onrender.com/api/v1/shipper_driver/truckers/');
      setTruckers(res.data?.data || []);
    } catch (error) {
      toast.error('Failed to fetch trucker data');
      console.error(error);
    }
  };

  useEffect(() => {
    fetchRateRequests();
    fetchTruckers();
  }, []);

  const openModal = (request) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
    setRate('');
    setMessage('');
    setPickupDate('');
    setDeliveryDate('');
    setSelectedTrucker('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🟡 Submit button clicked');

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const empId = localStorage.getItem('empId') || sessionStorage.getItem('empId');

    if (!token || !empId) {
      toast.error('Missing token or empId. Please log in again.');
      console.log('🚫 Token or empId missing');
      return;
    }

    if (!rate || !message || !pickupDate || !deliveryDate || !selectedTrucker) {
      toast.error('Please fill all fields');
      return;
    }

    const payload = {
      loadId: selectedRequest?._id,
      truckerId: selectedTrucker,
      empId,
      rate: parseInt(rate),
      message,
      estimatedPickupDate: pickupDate,
      estimatedDeliveryDate: deliveryDate,
    };

    console.log('📦 Submitting payload:', payload);

    try {
      setSubmitting(true);
      const res = await axios.post(
        'https://vpl-liveproject-1.onrender.com/api/v1/bid/place-by-inhouse/',
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ Response:', res.data);
      toast.success('Bid submitted!');
      await fetchRateRequests(); // 🔁 Refresh list
      closeModal();
    } catch (error) {
      console.error('❌ Submission Error:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = rateRequests.filter((item) =>
    (item.shipmentNumber || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Rate Request</h1>
        <div className="flex gap-3 items-center">
          <input
            type="text"
            placeholder="Search by Shipment No..."
            className="px-3 py-2 border rounded-md outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="bg-blue-100 text-blue-700 px-3 py-2 rounded text-sm font-medium">
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        {isFetching ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <table className="min-w-full table-auto text-sm text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3">Load ID</th>
                <th className="px-4 py-3">Shipment No</th>
                <th className="px-4 py-3">Weight</th>
                <th className="px-4 py-3">Pick-Up</th>
                <th className="px-4 py-3">Drop</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((item) => (
                <tr key={item._id} className="border-b">
                  <td className="px-4 py-3">{item._id}</td>
                  <td className="px-4 py-3">{item.shipmentNumber || 'N/A'}</td>
                  <td className="px-4 py-3">{item.weight} Kg</td>
                  <td className="px-4 py-3">{item.origin?.city || '—'}</td>
                  <td className="px-4 py-3">{item.destination?.city || '—'}</td>
                  <td className="px-4 py-3">{item.vehicleType || '—'}</td>
                  <td className="px-4 py-3">{item.rate || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`text-white text-xs px-3 py-1 rounded-full ${statusColors[item.status] || 'bg-gray-500'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openModal(item)}
                      className="bg-blue-100 text-blue-600 px-3 py-1 rounded hover:bg-blue-200"
                    >
                      Assign RateRequest
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan="9" className="text-center py-4 text-gray-500">
                    No matching records.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl w-full max-w-3xl p-8 border border-blue-100 animate-fade-in scale-100">
            <form onSubmit={handleSubmit}>
              <div className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white px-6 py-4 rounded-xl shadow mb-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-semibold flex items-center gap-2">🚛 Rate Request Form</h2>
                  <p className="text-sm text-blue-100 mt-1">Enter your bid and trucker details below</p>
                </div>
                <button onClick={closeModal} type="button" className="text-white text-3xl hover:text-gray-200">&times;</button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-700 bg-blue-50 px-4 py-3 rounded-lg mb-6 shadow-inner">
                <div><strong>Pickup:</strong><br />{selectedRequest?.origin?.city || '—'}</div>
                <div><strong>Drop:</strong><br />{selectedRequest?.destination?.city || '—'}</div>
                <div><strong>Weight:</strong><br />{selectedRequest?.weight} Kg</div>
                <div><strong>Vehicle Type:</strong><br />{selectedRequest?.vehicleType || '—'}</div>
                <div><strong>Commodity:</strong><br />{selectedRequest?.commodity || 'N/A'}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-gray-700 text-sm font-medium mb-1">Select Trucker</label>
                  <select value={selectedTrucker} onChange={(e) => setSelectedTrucker(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 shadow-sm focus:ring-2 focus:ring-indigo-400">
                    <option value="">Choose Trucker (compName)</option>
                    {truckers.map((t) => (
                      <option key={t._id} value={t._id}>{t.compName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">📅 Pickup Date</label>
                  <input type="datetime-local" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)}
                    className="w-full border border-gray-300 px-4 py-2 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-400" />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">🚚 Delivery Date</label>
                  <input type="datetime-local" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full border border-gray-300 px-4 py-2 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-400" />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">💰 Rate (₹)</label>
                  <input type="number" value={rate} onChange={(e) => setRate(e.target.value)}
                    className="w-full border border-gray-300 px-4 py-2 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-400" placeholder="e.g. 32000" />
                </div>

                <div className="col-span-2">
                  <label className="block text-gray-700 text-sm font-medium mb-1">✉️ Message</label>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
                    placeholder="Mention availability, timeline, or instructions"
                    className="w-full border border-gray-300 px-4 py-2 rounded-xl shadow-sm resize-none focus:ring-2 focus:ring-indigo-400"></textarea>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-4">
                <button type="button" onClick={closeModal}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 shadow">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className={`px-5 py-2.5 rounded-lg font-semibold text-white shadow transition ${
                    submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}>
                  {submitting ? 'Submitting...' : 'Submit Bid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RateRequest;
