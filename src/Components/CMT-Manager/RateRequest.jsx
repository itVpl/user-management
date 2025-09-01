import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Clock, CheckCircle, Search, Truck, Calendar, DollarSign } from 'lucide-react';

const statusColors = {
  Assigned: 'bg-orange-500',
  Posted: 'bg-blue-500',
  'In Transit': 'bg-blue-700',
  pending: 'bg-yellow-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  accepted: 'bg-green-600',
  completed: 'bg-purple-500',
  delivered: 'bg-indigo-500'
};

const NINETY_MIN_MS = 90 * 60 * 1000;
const LS_START_KEY = 'rr_timer_start';
const LS_STOP_KEY = 'rr_timer_stop';

const loadShort = (id) => {
  const s = (id ?? '').toString();
  return s ? `L-${s.slice(-4)}` : 'L-0000';
};

function readLS(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}');
  } catch {
    return {};
  }
}
function writeLS(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

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
  const [driverName, setDriverName] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [isFetching, setIsFetching] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'rate'
  const [pendingRequests, setPendingRequests] = useState([]);
  const [completedRequests, setCompletedRequests] = useState([]);
  const [approvalModal, setApprovalModal] = useState({ visible: false, type: null, approval: null });
  const [approvalReason, setApprovalReason] = useState('');
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);

  // timers
  const [timerStartMap, setTimerStartMap] = useState(() => readLS(LS_START_KEY));
  const [timerStopMap, setTimerStopMap] = useState(() => readLS(LS_STOP_KEY));
  const [tick, setTick] = useState(0); // 1s re-render
  const pollRef = useRef(null);

  const saveStart = (loadId, ts) => {
    if (!loadId) return;
    setTimerStartMap((prev) => {
      const next = { ...prev, [loadId]: ts };
      writeLS(LS_START_KEY, next);
      return next;
    });
    // remove stop if restarting
    setTimerStopMap((prev) => {
      if (!(loadId in prev)) return prev;
      const { [loadId]: _, ...rest } = prev;
      writeLS(LS_STOP_KEY, rest);
      return rest;
    });
  };
  const saveStop = (loadId, ts) => {
    if (!loadId) return;
    setTimerStopMap((prev) => {
      const next = { ...prev, [loadId]: ts };
      writeLS(LS_STOP_KEY, next);
      return next;
    });
  };

  const formatMMSS = (ms) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const renderTimerChip = (loadId) => {
    const start = timerStartMap?.[loadId];
    if (!start) return <span className="text-gray-400 text-xs">—</span>;

    const stop = timerStopMap?.[loadId] || null;
    const nowTs = stop || Date.now();
    const elapsed = Math.max(0, nowTs - start);

    let text = '';
    let cls = 'bg-yellow-100 text-yellow-700';
    let icon = '⏳';

    if (elapsed < NINETY_MIN_MS) {
      const remaining = NINETY_MIN_MS - elapsed;
      text = formatMMSS(remaining);
      cls = 'bg-yellow-100 text-yellow-700';
      icon = '⏳';
    } else {
      const over = elapsed - NINETY_MIN_MS;
      text = `+${formatMMSS(over)}`;
      cls = 'bg-red-100 text-red-700';
      icon = stop ? '⏹️' : '⏰';
    }

    if (stop) {
      cls = 'bg-gray-200 text-gray-700';
      icon = '⏹️';
    }

    return (
      <span className={`text-xs px-3 py-1 rounded-full font-bold inline-flex items-center gap-1 ${cls}`}>
        <span>{icon}</span> {text}
      </span>
    );
  };

  const fetchRateRequests = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        toast.error('Please login to access this resource');
        return;
      }
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      // Pending approvals
      const pendingRes = await axios.get(
        'https://vpl-liveproject-1.onrender.com/api/v1/load-approval/pending',
        { headers }
      );
      const pendingApprovals = pendingRes.data?.data?.approvals || [];

      const transformedPending = pendingApprovals.map((approval) => {
        const loadId = approval?.loadId?._id || null;

        if (!approval.loadId) {
          return {
            _id: approval._id,
            loadId,
            shipmentNumber: `LOAD-${approval._id.slice(-6)}`,
            weight: 0,
            origin: { city: 'N/A', state: 'N/A' },
            destination: { city: 'N/A', state: 'N/A' },
            vehicleType: 'N/A',
            rate: 0,
            commodity: 'N/A',
            pickupDate: null,
            deliveryDate: null,
            status: approval.overallStatus || 'pending',
            shipper: approval.shipper || { compName: 'N/A', email: 'N/A' },
            cmtApprovals: approval.cmtApprovals || [],
            createdAt: approval.createdAt,
            expiresAt: approval.expiresAt,
            userApprovalStatus: approval.userApprovalStatus,
            userAction: approval.userAction,
            userActionAt: approval.userActionAt
          };
        }

        return {
          _id: approval._id, // approval id
          loadId, // real load id for timers
          shipmentNumber: `LOAD-${approval.loadId._id.slice(-6)}`,
          weight: approval.loadId.weight || 0,
          origin: approval.loadId.origin || { city: 'N/A', state: 'N/A' },
          destination: approval.loadId.destination || { city: 'N/A', state: 'N/A' },
          vehicleType: approval.loadId.vehicleType || 'N/A',
          rate: approval.loadId.rate || 0,
          commodity: approval.loadId.commodity || 'N/A',
          pickupDate: approval.loadId.pickupDate,
          deliveryDate: approval.loadId.deliveryDate,
          status: approval.overallStatus || 'pending',
          shipper: approval.shipper || { compName: 'N/A', email: 'N/A' },
          cmtApprovals: approval.cmtApprovals || [],
          createdAt: approval.createdAt,
          expiresAt: approval.expiresAt,
          userApprovalStatus: approval.userApprovalStatus,
          userAction: approval.userAction,
          userActionAt: approval.userActionAt
        };
      });

      // Loads for Rate tab
      const res = await axios.get(
        'https://vpl-liveproject-1.onrender.com/api/v1/load/available/',
        { headers }
      );
      const allRequests = res.data?.loads || [];

      // Split (if you still need)
      const completed = allRequests.filter(
        (req) =>
          req.status === 'In Transit' ||
          req.status === 'Completed' ||
          req.status === 'in_transit' ||
          req.status === 'completed' ||
          req.status === 'delivered' ||
          req.status === 'Bidding' ||
          req.status === 'bidding'
      );

      setPendingRequests(transformedPending);
      setCompletedRequests(completed);
      setRateRequests(allRequests);

      // check first-bid for running timers
      const activeLoadsToCheck = (completed.length ? completed : allRequests).filter(
        (ld) => timerStartMap[ld._id] && !timerStopMap[ld._id]
      );
      if (activeLoadsToCheck.length) await checkFirstBidsForLoads(activeLoadsToCheck);
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.response?.data?.message) toast.error(error.response.data.message);
      else toast.error('Failed to fetch load data');
    } finally {
      setIsFetching(false);
    }
  };

  const fetchTruckers = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        toast.error('Please login to access this resource');
        return;
      }
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const res = await axios.get(
        'https://vpl-liveproject-1.onrender.com/api/v1/shipper_driver/truckers/',
        { headers }
      );
      setTruckers(res.data?.data || []);
    } catch (error) {
      console.error('Error fetching truckers:', error);
      if (error.response?.data?.message) toast.error(error.response.data.message);
      else toast.error('Failed to fetch trucker data');
    }
  };

  const checkFirstBidsForLoads = async (loads) => {
    if (!Array.isArray(loads) || !loads.length) return;
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      for (const ld of loads) {
        const loadId = ld._id;
        if (!timerStartMap[loadId] || timerStopMap[loadId]) continue;
        try {
          const url = `https://vpl-liveproject-1.onrender.com/api/v1/bid/intermediate-approval-status?loadId=${loadId}`;
          const r = await axios.get(url, { headers });
          const bids = r?.data?.bids || r?.data?.data?.bids || [];
          if (bids.length > 0) saveStop(loadId, Date.now());
        } catch {
          // ignore per-load errors
        }
      }
    } catch {}
  };

  // init
  useEffect(() => {
    fetchRateRequests();
    fetchTruckers();
  }, []);

  // 1s ticker
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // 15s polling for running timers (Rate tab)
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      if (activeTab !== 'rate') return;
      const src = completedRequests.length ? completedRequests : rateRequests;
      const running = src.filter((ld) => timerStartMap[ld._id] && !timerStopMap[ld._id]);
      if (running.length) checkFirstBidsForLoads(running);
    }, 15000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeTab, rateRequests, completedRequests, timerStartMap, timerStopMap]);

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
    setDriverName('');
    setVehicleNo('');
  };

  // approval modal
  const openApprovalModal = (approval, type) => {
    setApprovalModal({ visible: true, type, approval });
    setApprovalReason('');
  };
  const closeApprovalModal = () => {
    setApprovalModal({ visible: false, type: null, approval: null });
    setApprovalReason('');
  };

  const handleApprovalSubmit = async () => {
    if (!approvalReason.trim() && approvalModal.type === 'reject') {
      toast.error('Please provide a reason for rejection');
      return;
    }
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const empId = localStorage.getItem('empId') || sessionStorage.getItem('empId');
    if (!token || !empId) {
      toast.error('Missing token or empId. Please log in again.');
      return;
    }

    try {
      setApprovalSubmitting(true);
      const payload = {
        approvalId: approvalModal.approval._id,
        action: approvalModal.type,
        ...(approvalReason.trim() ? { reason: approvalReason } : {})
      };

      const response = await axios.post(
        'https://vpl-liveproject-1.onrender.com/api/v1/load-approval/handle',
        payload,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      if (response.data.success) {
        toast.success(`Load ${approvalModal.type === 'accept' ? 'approved' : 'rejected'} successfully!`);

        // Start the 90-min timer on ACCEPT
        if (approvalModal.type === 'accept') {
          const acceptedLoadId = approvalModal?.approval?.loadId; // string added in transform
          if (acceptedLoadId) saveStart(acceptedLoadId, Date.now());
        }

        // optimistic UI
        setPendingRequests((prev) =>
          prev.map((r) =>
            r._id === approvalModal.approval._id
              ? { ...r, status: approvalModal.type === 'accept' ? 'approved' : 'rejected' }
              : r
          )
        );

        closeApprovalModal();
        setTimeout(() => {
          fetchRateRequests();
        }, 600);
      } else {
        toast.error(response.data.message || 'Action failed');
      }
    } catch (error) {
      console.error('Approval submission error:', error);
      toast.error(error.response?.data?.message || 'Failed to submit action');
    } finally {
      setApprovalSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const empId = localStorage.getItem('empId') || sessionStorage.getItem('empId');
    if (!token || !empId) {
      toast.error('Missing token or empId. Please log in again.');
      return;
    }

    if (!rate || !message || !pickupDate || !deliveryDate || !selectedTrucker || !driverName || !vehicleNo) {
      toast.error('Please fill all fields');
      return;
    }

    const payload = {
      loadId: selectedRequest?._id,
      truckerId: selectedTrucker,
      empId,
      rate: parseInt(rate, 10),
      message,
      estimatedPickupDate: pickupDate,
      estimatedDeliveryDate: deliveryDate,
      driverName,
      vehicleNumber: vehicleNo
    };

    try {
      setSubmitting(true);
      await axios.post(
        'https://vpl-liveproject-1.onrender.com/api/v1/bid/place-by-inhouse/',
        payload,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      toast.success('Bid submitted!');
      // stop timer on first bid (from this UI)
      if (selectedRequest?._id && !timerStopMap[selectedRequest._id]) {
        saveStop(selectedRequest._id, Date.now());
      }

      await fetchRateRequests();
      closeModal();
    } catch (error) {
      console.error('Submission Error:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = useMemo(() => {
    let requests;
    if (activeTab === 'pending') {
      requests = pendingRequests;
    } else {
      requests = completedRequests.length > 0 ? completedRequests : rateRequests;
    }
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((item) => {
      const parts = [
        item._id,
        item.loadId,
        item.shipmentNumber,
        item.shipper?.compName,
        item.shipper?.email,
        item.origin?.city,
        item.origin?.state,
        item.destination?.city,
        item.destination?.state,
        item.vehicleType
      ].map((x) => (x || '').toString().toLowerCase());
      return parts.some((p) => p.includes(q));
    });
  }, [activeTab, search, pendingRequests, completedRequests, rateRequests]);

  const listForValue =
    activeTab === 'rate' ? (completedRequests.length > 0 ? completedRequests : rateRequests) : completedRequests;
  const totalValue = listForValue.reduce((sum, r) => sum + (Number(r.rate) || 0), 0);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Tabs */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
            activeTab === 'pending'
              ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock size={18} />
            <span>Pending Request</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('rate')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
            activeTab === 'rate'
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle size={18} />
            <span>Rate Request</span>
          </div>
        </button>
      </div>

      {/* Pending Tab */}
      {activeTab === 'pending' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-6">
              <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <Clock className="text-yellow-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Pending</p>
                    <p className="text-xl font-bold text-gray-800">{pendingRequests.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Truck className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Approved</p>
                    <p className="text-xl font-bold text-blue-600">
                      {pendingRequests.filter((req) => req.status === 'approved').length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Calendar className="text-orange-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Pending Approval</p>
                    <p className="text-xl font-bold text-orange-600">
                      {pendingRequests.filter((req) => req.status === 'pending').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search pending requests..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto bg-white rounded-2xl shadow-xl border border-gray-100">
            {isFetching ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : (
              <table className="min-w-full table-auto text-sm text-left">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Load ID</th>
                    <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Shipper</th>
                    <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Weight</th>
                    <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Pick-Up</th>
                    <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Drop</th>
                    <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Vehicle</th>
                    <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Rate</th>
                    <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((item, index) => (
                    <tr
                      key={item._id}
                      className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-700">{loadShort(item.loadId || item._id)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-medium text-gray-700">{item.shipper?.compName || 'N/A'}</span>
                          <p className="text-xs text-gray-500">{item.shipper?.email || ''}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-700">{item.weight} Kg</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-medium text-gray-700">{item.origin?.city || '—'}</span>
                          <p className="text-xs text-gray-500">{item.origin?.state || ''}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-medium text-gray-700">{item.destination?.city || '—'}</span>
                          <p className="text-xs text-gray-500">{item.destination?.state || ''}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-700">{item.vehicleType || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-green-600">
                          ${item.rate?.toLocaleString() || '0'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-white text-xs px-3 py-1 rounded-full font-bold ${
                            statusColors[item.status] || 'bg-gray-500'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {item.status !== 'approved' && item.status !== 'rejected' ? (
                            <>
                              <button
                                onClick={() => openApprovalModal(item, 'accept')}
                                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-2 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl text-xs"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => openApprovalModal(item, 'reject')}
                                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-2 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl text-xs"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span
                              className={`text-xs px-3 py-2 rounded-xl font-semibold ${
                                item.status === 'approved'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {item.status === 'approved' ? '✅ Accepted' : '❌ Rejected'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredRequests.length === 0 && (
                    <tr>
                      <td colSpan="9" className="text-center py-12">
                        <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">
                          {search ? 'No pending requests found matching your search' : 'No pending requests found'}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {search ? 'Try adjusting your search terms' : 'All requests have been processed'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Rate Request Tab */}
      {activeTab === 'rate' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-6">
              <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="text-green-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      Total {activeTab === 'rate' ? (completedRequests.length > 0 ? 'Completed' : 'All') : 'Completed'}
                    </p>
                    <p className="text-xl font-bold text-gray-800">
                      {activeTab === 'rate'
                        ? completedRequests.length > 0
                          ? completedRequests.length
                          : rateRequests.length
                        : completedRequests.length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="text-purple-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Value</p>
                    <p className="text-xl font-bold text-purple-600">${totalValue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search completed requests..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto bg-white rounded-2xl shadow-xl border border-gray-100">
            {isFetching ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : (
              <table className="min-w-full table-auto text-sm text-left">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Load ID</th>
                    <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Shipment No</th>
                    <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Weight</th>
                    <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Pick-Up</th>
                    <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Drop</th>
                    <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Vehicle</th>
                    <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Rate</th>
                    <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Time</th>
                    <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((item, index) => (
                    <tr
                      key={item._id}
                      className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-700">{loadShort(item._id)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-700">{item.shipmentNumber || 'N/A'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-700">{item.weight} Kg</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-medium text-gray-700">{item.origin?.city || '—'}</span>
                          <p className="text-xs text-gray-500">{item.origin?.state || ''}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-medium text-gray-700">{item.destination?.city || '—'}</span>
                          <p className="text-xs text-gray-500">{item.destination?.state || ''}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-700">{item.vehicleType || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-green-600">
                          ${item.rate?.toLocaleString() || '0'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-white text-xs px-3 py-1 rounded-full font-bold ${
                            statusColors[item.status] || 'bg-gray-500'
                          }`}
                        >
                          {item.status || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{renderTimerChip(item._id)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openModal(item)}
                          className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredRequests.length === 0 && (
                    <tr>
                      <td colSpan="10" className="text-center py-12">
                        <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">
                          {search ? 'No requests found matching your search' : 'No requests found'}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {search
                            ? 'Try adjusting your search terms'
                            : activeTab === 'rate'
                            ? completedRequests.length > 0
                              ? 'No completed requests found'
                              : 'No requests available'
                            : 'No requests have been completed yet'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Bid Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300 p-4 overflow-hidden">
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl w-full max-w-3xl h-[85vh] flex flex-col border border-blue-100">
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
              <div className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white px-6 py-4 rounded-t-3xl shadow flex justify-between items-center flex-shrink-0">
                <div>
                  <h2 className="text-2xl font-semibold flex items-center gap-2">Rate Request Form</h2>
                  <p className="text-sm text-blue-100 mt-1">Enter your bid and trucker details below</p>
                </div>
                <button
                  onClick={closeModal}
                  type="button"
                  className="text-white text-3xl hover:text-gray-200"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-700 bg-blue-50 px-4 py-3 rounded-lg mb-6">
                  <div>
                    <strong>Pickup:</strong>
                    <br />
                    {selectedRequest?.origin?.city || '—'}
                  </div>
                  <div>
                    <strong>Drop:</strong>
                    <br />
                    {selectedRequest?.destination?.city || '—'}
                  </div>
                  <div>
                    <strong>Weight:</strong>
                    <br />
                    {selectedRequest?.weight} Kg
                  </div>
                  <div>
                    <strong>Vehicle Type:</strong>
                    <br />
                    {selectedRequest?.vehicleType || '—'}
                  </div>
                  <div>
                    <strong>Commodity:</strong>
                    <br />
                    {selectedRequest?.commodity || 'N/A'}
                  </div>
                  <div>
                    <strong>Shipper:</strong>
                    <br />
                    {selectedRequest?.shipper?.compName || 'N/A'}
                  </div>
                  <div>
                    <strong>Rate:</strong>
                    <br />${selectedRequest?.rate?.toLocaleString() || '0'}
                  </div>
                  <div>
                    <strong>Status:</strong>
                    <br />
                    {selectedRequest?.status || 'N/A'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-gray-700 text-sm font-medium mb-1">Select Trucker</label>
                    <select
                      value={selectedTrucker}
                      onChange={(e) => setSelectedTrucker(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2"
                    >
                      <option value="">Choose Trucker (compName)</option>
                      {truckers.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.compName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">Driver Name</label>
                    <input
                      type="text"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="w-full border border-gray-300 px-4 py-2 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">Vehicle Number</label>
                    <input
                      type="text"
                      value={vehicleNo}
                      onChange={(e) => setVehicleNo(e.target.value)}
                      className="w-full border border-gray-300 px-4 py-2 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">Pickup Date</label>
                    <input
                      type="datetime-local"
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className="w-full border border-gray-300 px-4 py-2 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">Delivery Date</label>
                    <input
                      type="datetime-local"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full border border-gray-300 px-4 py-2 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">Rate ($)</label>
                    <input
                      type="number"
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      className="w-full border border-gray-300 px-4 py-2 rounded-xl"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-gray-700 text-sm font-medium mb-1">Message</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 px-4 py-2 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-8 py-4 rounded-b-3xl border-t border-gray-200 flex justify-end gap-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2.5 rounded-lg font-semibold text-white ${
                    submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {submitting ? 'Submitting...' : 'Submit Bid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approval/Rejection Modal */}
      {approvalModal.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl w-full max-w-2xl p-8 border border-blue-100">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white px-6 py-4 rounded-xl shadow mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  {approvalModal.type === 'accept' ? 'Accept Load' : 'Reject Load'}
                </h2>
                <p className="text-sm text-blue-100 mt-1">
                  {approvalModal.type === 'accept'
                    ? 'Approve this load request'
                    : 'Reject this load request with a reason'}
                </p>
              </div>
              <button onClick={closeApprovalModal} type="button" className="text-white text-3xl hover:text-gray-200">
                ×
              </button>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-700 bg-blue-50 px-4 py-3 rounded-lg mb-6">
              <div>
                <strong>Shipment:</strong>
                <br />
                {approvalModal.approval?.shipmentNumber || 'N/A'}
              </div>
              <div>
                <strong>Shipper:</strong>
                <br />
                {approvalModal.approval?.shipper?.compName || 'N/A'}
              </div>
              <div>
                <strong>Weight:</strong>
                <br />
                {approvalModal.approval?.weight || 0} Kg
              </div>
              <div>
                <strong>Rate:</strong>
                <br />${approvalModal.approval?.rate?.toLocaleString() || '0'}
              </div>
              <div>
                <strong>Pickup:</strong>
                <br />
                {approvalModal.approval?.origin?.city || 'N/A'}
              </div>
              <div>
                <strong>Drop:</strong>
                <br />
                {approvalModal.approval?.destination?.city || 'N/A'}
              </div>
              <div>
                <strong>Vehicle:</strong>
                <br />
                {approvalModal.approval?.vehicleType || 'N/A'}
              </div>
              <div>
                <strong>Status:</strong>
                <br />
                {approvalModal.approval?.status || 'N/A'}
              </div>
            </div>

            {/* Reason */}
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                {approvalModal.type === 'accept' ? 'Approval Comments (Optional)' : 'Rejection Reason *'}
              </label>
              <textarea
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                rows={4}
                placeholder={
                  approvalModal.type === 'accept'
                    ? 'Add any comments about this approval...'
                    : 'Please provide a reason for rejecting this load...'
                }
                className="w-full border border-gray-300 px-4 py-3 rounded-xl"
                required={approvalModal.type === 'reject'}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={closeApprovalModal}
                disabled={approvalSubmitting}
                className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprovalSubmit}
                disabled={approvalSubmitting}
                className={`px-6 py-3 rounded-lg font-semibold text-white ${
                  approvalSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : approvalModal.type === 'accept'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {approvalSubmitting ? 'Processing...' : approvalModal.type === 'accept' ? 'Accept Load' : 'Reject Load'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RateRequest;
