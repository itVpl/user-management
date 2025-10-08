import { useEffect, useMemo, useRef, useState } from 'react';
 import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Clock, CheckCircle, Search, Truck, Calendar, DollarSign } from 'lucide-react';
import API_CONFIG from '../../config/api.js';
 const getAuthToken = () =>
   localStorage.getItem('authToken') ||
   sessionStorage.getItem('authToken') ||
   localStorage.getItem('token') ||
   sessionStorage.getItem('token');

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
 const location = useLocation();

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
  const [truckerSearch, setTruckerSearch] = useState('');
  const [isTruckerDropdownOpen, setIsTruckerDropdownOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [formErrors, setFormErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'rate'
  const [pendingRequests, setPendingRequests] = useState([]);
  const [completedRequests, setCompletedRequests] = useState([]);
  const [approvalModal, setApprovalModal] = useState({ visible: false, type: null, approval: null });
  const [approvalReason, setApprovalReason] = useState('');
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [autoAcceptTimer, setAutoAcceptTimer] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [loadTimers, setLoadTimers] = useState({});

  // timers
  const [timerStartMap, setTimerStartMap] = useState(() => readLS(LS_START_KEY));
  const [timerStopMap, setTimerStopMap] = useState(() => readLS(LS_STOP_KEY));
  const [tick, setTick] = useState(0); // 1s re-render
  const pollRef = useRef(null);
// 💡 double-submit lock (same load pe multiple auto-accept calls na ho)
const autoAcceptingRef = useRef(new Set());

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
      const token = getAuthToken();
      if (!token) {
        toast.error('Please login to access this resource');
        return;
      }
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      // Pending approvals
      const pendingRes = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/load-approval/pending`,
        { headers }
      );
      const pendingApprovals = pendingRes.data?.data?.approvals || [];

      const transformedPending = pendingApprovals.map((approval) => {
        const loadId = approval?.loadId?._id || null;

        if (!approval.loadId) {
          return {
            _id: approval._id,
            loadId,
            shipmentNumber: null,
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
          shipmentNumber: approval.loadId.shipmentNumber || null,
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

      // Approved loads for Rate tab - using new API endpoint
      const approvedRes = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/load-approval/pending?status=approved`,
        { headers }
      );
      const approvedApprovals = approvedRes.data?.data?.approvals || [];

      const transformedApproved = approvedApprovals.map((approval) => {
        const loadId = approval?.loadId?._id || null;

        if (!approval.loadId) {
          return {
            _id: approval._id,
            loadId,
            shipmentNumber: null,
            weight: 0,
            origin: { city: 'N/A', state: 'N/A' },
            destination: { city: 'N/A', state: 'N/A' },
            vehicleType: 'N/A',
            rate: 0,
            commodity: 'N/A',
            pickupDate: null,
            deliveryDate: null,
            status: approval.overallStatus || 'approved',
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
          shipmentNumber: approval.loadId.shipmentNumber || null,
          weight: approval.loadId.weight || 0,
          origin: approval.loadId.origin || { city: 'N/A', state: 'N/A' },
          destination: approval.loadId.destination || { city: 'N/A', state: 'N/A' },
          vehicleType: approval.loadId.vehicleType || 'N/A',
          rate: approval.loadId.rate || 0,
          commodity: approval.loadId.commodity || 'N/A',
          pickupDate: approval.loadId.pickupDate,
          deliveryDate: approval.loadId.deliveryDate,
          status: approval.overallStatus || 'approved',
          shipper: approval.shipper || { compName: 'N/A', email: 'N/A' },
          cmtApprovals: approval.cmtApprovals || [],
          createdAt: approval.createdAt,
          expiresAt: approval.expiresAt,
          userApprovalStatus: approval.userApprovalStatus,
          userAction: approval.userAction,
          userActionAt: approval.userActionAt
        };
      });
// ---- broadcast new pending approvals (cross-tab + same tab) ----
try {
  const prevIdsJson = localStorage.getItem('rr_prev_pending_ids') || '[]';
  let prevIds;
  try { prevIds = JSON.parse(prevIdsJson); } catch { prevIds = []; }
  const prevSet = new Set(prevIds);

  const onlyPending = transformedPending.filter(a => a.status === 'pending');
  const newbies = onlyPending.filter(a => !prevSet.has(a._id));

  if (newbies.length) {
    newbies.forEach((approval) => {
      // 1) BroadcastChannel
      if ('BroadcastChannel' in window) {
        try {
          const bc = new BroadcastChannel('rr_events');
          bc.postMessage({ type: 'RR_NEW_ASSIGNMENT', approval });
          bc.close?.();
        } catch {}
      }
      // 2) localStorage pulse (fallback)
      try {
        localStorage.setItem('rr_new_assignment', JSON.stringify(approval));
        setTimeout(() => localStorage.removeItem('rr_new_assignment'), 0);
      } catch {}
    });
  }

  const nextIds = onlyPending.map(a => a._id);
  localStorage.setItem('rr_prev_pending_ids', JSON.stringify(nextIds));
} catch {}

      setPendingRequests(transformedPending);
      setCompletedRequests(transformedApproved);
      setRateRequests(transformedApproved);

      // check first-bid for running timers
      const activeLoadsToCheck = transformedApproved.filter(
        (ld) => timerStartMap[ld.loadId] && !timerStopMap[ld.loadId]
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
      const token = getAuthToken();
      if (!token) {
        toast.error('Please login to access this resource');
        return;
      }
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/truckers/`,
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
      const token = getAuthToken();
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      for (const ld of loads) {
        const loadId = ld.loadId || ld._id;
        if (!timerStartMap[loadId] || timerStopMap[loadId]) continue;
        try {
          const url = `${API_CONFIG.BASE_URL}/api/v1/bid/intermediate-approval-status?loadId=${loadId}`;
          const r = await axios.get(url, { headers });
          const bids = r?.data?.bids || r?.data?.data?.bids || [];
          if (bids.length > 0) saveStop(loadId, Date.now());
        } catch {
          // ignore per-load errors
        }
      }
    } catch {}
  };
 // navigate("/RateRequest", { state: { openApprovalFromBroadcast: approval } }) se aane par modal open
 useEffect(() => {
   const approval = location?.state?.openApprovalFromBroadcast;
   if (approval) {
     setActiveTab('pending');
     openApprovalModal(approval, 'approval');
     // state clear so refresh pe dubara na khule
     window.history.replaceState({}, document.title);
   }
   // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

  // init
  useEffect(() => {
    fetchRateRequests();
    fetchTruckers();
  }, []);

  // Start auto-accept timer for new pending requests
  // ✅ Stable auto-accept countdown (interval clear + single fire)
useEffect(() => {
  const timers = {};

  pendingRequests.forEach((request) => {
    const id = request._id;
    // sirf pending items pe timer chalao, aur agar timer init nahi hua to hi
    if (request.status === "pending" && loadTimers[id] == null) {
      // init at 30s
      setLoadTimers((prev) => ({ ...prev, [id]: 30 }));

      timers[id] = setInterval(() => {
        setLoadTimers((prev) => {
          const cur = prev[id] ?? 30;
          const next = cur - 1;

          if (next <= 0) {
            // interval turant clear, ek hi baar auto-accept fire
            clearInterval(timers[id]);
            delete timers[id];

            // sentinel -1 => finish ho gaya, dobara mat chalana
            const after = { ...prev, [id]: -1 };
            // allow state update flush, then call
            setTimeout(() => handleAutoAcceptFromTable(request), 0);

            return after;
          }

          return { ...prev, [id]: next };
        });
      }, 1000);
    }
  });

  return () => {
    Object.values(timers).forEach((t) => clearInterval(t));
  };
  // ⚠️ dependency me loadTimers bhi rakho, warna stale state rahegi
}, [pendingRequests, loadTimers]);

useEffect(() => {
  const done = new Set(
    pendingRequests.filter(r => r.status !== 'pending').map(r => r._id)
  );
  if (done.size === 0) return;

  setLoadTimers(prev => {
    const copy = { ...prev };
    done.forEach(id => { delete copy[id]; });
    return copy;
  });
}, [pendingRequests]);

  // 1s ticker
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Close trucker dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isTruckerDropdownOpen && !event.target.closest('.trucker-dropdown-container')) {
        setIsTruckerDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTruckerDropdownOpen]);

  // 15s polling for running timers (Rate tab)
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      if (activeTab !== 'rate') return;
      const src = completedRequests.length ? completedRequests : rateRequests;
      const running = src.filter((ld) => timerStartMap[ld.loadId] && !timerStopMap[ld.loadId]);
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
    setTruckerSearch('');
    setIsTruckerDropdownOpen(false);
    setFormErrors({});
    setTouchedFields({});
  };

  // approval modal
  const openApprovalModal = (approval, type) => {
    setApprovalModal({ visible: true, type, approval });
    setApprovalReason('');
    setTimeRemaining(30);
    
    // Start auto-accept timer
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Auto-accept after 30 seconds
          handleAutoAccept(approval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setAutoAcceptTimer(timer);
  };
  
  const closeApprovalModal = () => {
    setApprovalModal({ visible: false, type: null, approval: null });
    setApprovalReason('');
    setTimeRemaining(30);
    
    // Clear auto-accept timer
    if (autoAcceptTimer) {
      clearInterval(autoAcceptTimer);
      setAutoAcceptTimer(null);
    }
  };
  
  const handleAutoAccept = async (approval) => {
  const id = approval._id;
  if (autoAcceptingRef.current.has(id)) return;   // ✅ lock
  autoAcceptingRef.current.add(id);

  try {
    const token = getAuthToken();
    const empId = localStorage.getItem('empId') || sessionStorage.getItem('empId');
    if (!token || !empId) {
      toast.error('Missing token or empId. Please log in again.');
      return;
    }

    const payload = {
      approvalId: id,
      action: 'accept',
      reason: 'Auto-accepted after 30 seconds'
    };

    const response = await axios.post(
      `${API_CONFIG.BASE_URL}/api/v1/load-approval/handle`,
      payload,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    if (response.data.success) {
      toast.success('Load auto-accepted successfully!');
      const acceptedLoadId = approval?.loadId?._id || approval?.loadId;
      if (acceptedLoadId) saveStart(acceptedLoadId, Date.now());

      setPendingRequests(prev =>
        prev.map(r => (r._id === id ? { ...r, status: 'approved' } : r))
      );

      closeApprovalModal();   // timer bhi clear ho jayega
      setTimeout(() => { fetchRateRequests(); }, 1000);
    } else {
      toast.error('Auto-accept failed. Please try again.');
    }
  } catch (error) {
    console.error('Auto-accept failed:', error);
    toast.error('Auto-accept failed. Please try again.');
  } finally {
    autoAcceptingRef.current.delete(id);  // ✅ unlock
  }
};


  const handleAutoAcceptFromTable = async (request) => {
  const id = request._id;

  // ✅ already in-flight? to dobara mat bhejo
  if (autoAcceptingRef.current.has(id)) return;
  autoAcceptingRef.current.add(id);

  try {
    const token = getAuthToken();
    const empId = localStorage.getItem('empId') || sessionStorage.getItem('empId');
    if (!token || !empId) {
      toast.error('Missing token or empId. Please log in again.');
      return;
    }

    const payload = {
      approvalId: id,
      action: 'accept',
      reason: 'Auto-accepted after 30 seconds',
    };

    const response = await axios.post(
      `${API_CONFIG.BASE_URL}/api/v1/load-approval/handle`,
      payload,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    if (response.data.success) {
      toast.success('Load auto-accepted successfully!');

      // 90-min timer start
      const acceptedLoadId = request?.loadId?._id || request?.loadId;
      if (acceptedLoadId) saveStart(acceptedLoadId, Date.now());

      // optimistic UI
      setPendingRequests((prev) =>
        prev.map((r) => (r._id === id ? { ...r, status: 'approved' } : r))
      );

      // timer state cleanup
      setLoadTimers((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });

      setTimeout(() => {
        fetchRateRequests();
      }, 1000);
    } else {
      toast.error('Auto-accept failed. Please try again.');
    }
  } catch (error) {
    console.error('Auto-accept failed:', error?.response?.data || error.message);
    toast.error(error?.response?.data?.message || 'Auto-accept failed.');
  } finally {
    autoAcceptingRef.current.delete(id);
  }
};


  const handleManualAcceptFromTable = async (request) => {
    try {
      const token = getAuthToken();
      const empId = localStorage.getItem('empId') || sessionStorage.getItem('empId');
      
      if (!token || !empId) {
        toast.error('Missing token or empId. Please log in again.');
        return;
      }

      const payload = {
        approvalId: request._id,
        action: 'accept',
        reason: 'Manually accepted by user'
      };

      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/load-approval/handle`,
        payload,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      if (response.data.success) {
        toast.success('Load accepted successfully!');
        
        // Start the 90-min timer on ACCEPT
        const acceptedLoadId = request?.loadId?._id || request?.loadId;
        if (acceptedLoadId) saveStart(acceptedLoadId, Date.now());

        // optimistic UI
        setPendingRequests((prev) =>
          prev.map((r) =>
            r._id === request._id
              ? { ...r, status: 'approved' }
              : r
          )
        );

        // Remove timer
        setLoadTimers(prev => {
          const newTimers = { ...prev };
          delete newTimers[request._id];
          return newTimers;
        });

        setTimeout(() => {
          fetchRateRequests();
        }, 1000);
      } else {
        toast.error('Failed to accept load. Please try again.');
      }
    } catch (error) {
      console.error('Manual accept failed:', error);
      toast.error('Failed to accept load. Please try again.');
    }
  };

  const handleApprovalSubmit = async () => {
    const token = getAuthToken();
    const empId = localStorage.getItem('empId') || sessionStorage.getItem('empId');
    if (!token || !empId) {
      toast.error('Missing token or empId. Please log in again.');
      return;
    }

    try {
      setApprovalSubmitting(true);
      const payload = {
        approvalId: approvalModal.approval._id,
        action: 'accept', // Only accept action now
        ...(approvalReason.trim() ? { reason: approvalReason } : {})
      };

      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/load-approval/handle`,
        payload,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      if (response.data.success) {
        toast.success('Load accepted successfully!');

        // Start the 90-min timer on ACCEPT
        const acceptedLoadId = approvalModal?.approval?.loadId?._id || approvalModal?.approval?.loadId;
        if (acceptedLoadId) saveStart(acceptedLoadId, Date.now());

        // optimistic UI
        setPendingRequests((prev) =>
          prev.map((r) =>
            r._id === approvalModal.approval._id
              ? { ...r, status: 'approved' }
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

    const token = getAuthToken();
    const empId = localStorage.getItem('empId') || sessionStorage.getItem('empId');
    if (!token || !empId) {
      toast.error('Missing token or empId. Please log in again.');
      return;
    }

    // Validate form before submission
    if (!validateForm()) {
      toast.error('Please fix all validation errors before submitting');
      return;
    }

    const payload = {
      loadId: selectedRequest?.loadId || selectedRequest?._id,
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
        `${API_CONFIG.BASE_URL}/api/v1/bid/place-by-inhouse/`,
        payload,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      toast.success('Bid submitted!');
      // stop timer on first bid (from this UI)
      const loadId = selectedRequest?.loadId || selectedRequest?._id;
      if (loadId && !timerStopMap[loadId]) {
        saveStop(loadId, Date.now());
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

  // Filter truckers based on search
  const filteredTruckers = useMemo(() => {
    if (!truckerSearch.trim()) return truckers;
    return truckers.filter(trucker => 
      trucker.compName?.toLowerCase().includes(truckerSearch.toLowerCase()) ||
      trucker.email?.toLowerCase().includes(truckerSearch.toLowerCase()) ||
      trucker.phoneNo?.includes(truckerSearch)
    );
  }, [truckers, truckerSearch]);

  // Get selected trucker name for display
  const selectedTruckerName = useMemo(() => {
    const trucker = truckers.find(t => t._id === selectedTrucker);
    return trucker?.compName || '';
  }, [truckers, selectedTrucker]);

  const handleTruckerSelect = (truckerId, truckerName) => {
    setSelectedTrucker(truckerId);
    setTruckerSearch(truckerName);
    setIsTruckerDropdownOpen(false);
    // Clear trucker error when selected
    if (formErrors.trucker) {
      setFormErrors(prev => ({ ...prev, trucker: '' }));
    }
  };

  // Export to CSV function
  const exportToCSV = () => {
    try {
      const dataToExport = filteredRequests.map((item, index) => ({
        'S.No': index + 1,
        'Load ID': loadShort(item._id),
        'Shipment Number': item.shipmentNumber || 'N/A',
        'Weight (Kg)': item.weight || 0,
        'Pickup City': item.origin?.city || 'N/A',
        'Pickup State': item.origin?.state || 'N/A',
        'Delivery City': item.destination?.city || 'N/A',
        'Delivery State': item.destination?.state || 'N/A',
        'Vehicle Type': item.vehicleType || 'N/A',
        'Rate ($)': item.rate || 0,
        'Status': item.status || 'N/A',
        'Shipper Company': item.shipper?.compName || 'N/A',
        'Shipper Email': item.shipper?.email || 'N/A',
        'Commodity': item.commodity || 'N/A',
        'Pickup Date': item.pickupDate ? new Date(item.pickupDate).toLocaleDateString() : 'N/A',
        'Delivery Date': item.deliveryDate ? new Date(item.deliveryDate).toLocaleDateString() : 'N/A',
        'Created At': item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'
      }));

      // Convert to CSV
      const headers = Object.keys(dataToExport[0] || {});
      const csvContent = [
        headers.join(','),
        ...dataToExport.map(row => 
          headers.map(header => {
            const value = row[header];
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `Rate_Request_Data_${currentDate}.csv`;
      link.setAttribute('download', filename);
      
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Data exported successfully as ${filename}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data. Please try again.');
    }
  };

  // Validation functions
  const validateField = (name, value) => {
    let error = '';
    
    switch (name) {
      case 'trucker':
        if (!value || value.trim() === '') {
          error = 'Please select a trucker';
        }
        break;
      case 'driverName':
        if (!value || value.trim() === '') {
          error = 'Driver name is required';
        } else if (value.trim().length < 2) {
          error = 'Driver name must be at least 2 characters';
        } else if (!/^[a-zA-Z\s]+$/.test(value.trim())) {
          error = 'Driver name can only contain letters and spaces';
        }
        break;
      case 'vehicleNo':
        if (!value || value.trim() === '') {
          error = 'Vehicle number is required';
        } else if (value.trim().length < 3) {
          error = 'Vehicle number must be at least 3 characters';
        }
        break;
      case 'pickupDate':
        if (!value) {
          error = 'Pickup date is required';
        } else {
          const pickupDateValue = new Date(value);
          const now = new Date();
          if (pickupDateValue < now) {
            error = 'Pickup date cannot be in the past';
          }
        }
        break;
      case 'deliveryDate':
        if (!value) {
          error = 'Delivery date is required';
        } else {
          const deliveryDateValue = new Date(value);
          const pickupDateValue = new Date(pickupDate);
          const now = new Date();
          if (deliveryDateValue < now) {
            error = 'Delivery date cannot be in the past';
          } else if (pickupDate && deliveryDateValue <= pickupDateValue) {
            error = 'Delivery date must be after pickup date';
          }
        }
        break;
      case 'rate':
        if (!value || value.trim() === '') {
          error = 'Rate is required';
        } else {
          const rateNum = parseFloat(value);
          if (isNaN(rateNum) || rateNum <= 0) {
            error = 'Rate must be a positive number';
          } else if (rateNum < 1) {
            error = 'Rate must be at least $1';
          } else if (rateNum > 1000000) {
            error = 'Rate cannot exceed $1,000,000';
          }
        }
        break;
      case 'message':
        if (!value || value.trim() === '') {
          error = 'Message is required';
        } else if (value.trim().length < 10) {
          error = 'Message must be at least 10 characters';
        } else if (value.trim().length > 500) {
          error = 'Message cannot exceed 500 characters';
        }
        break;
      default:
        break;
    }
    
    return error;
  };

  const handleFieldBlur = (fieldName) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
    
    let value;
    switch (fieldName) {
      case 'trucker':
        value = selectedTrucker;
        break;
      case 'driverName':
        value = driverName;
        break;
      case 'vehicleNo':
        value = vehicleNo;
        break;
      case 'pickupDate':
        value = pickupDate;
        break;
      case 'deliveryDate':
        value = deliveryDate;
        break;
      case 'rate':
        value = rate;
        break;
      case 'message':
        value = message;
        break;
      default:
        value = '';
    }
    
    const error = validateField(fieldName, value);
    setFormErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  const handleFieldChange = (fieldName, value) => {
    // Clear error when user starts typing
    if (formErrors[fieldName]) {
      setFormErrors(prev => ({ ...prev, [fieldName]: '' }));
    }
    
    // Update the respective state
    switch (fieldName) {
      case 'driverName':
        setDriverName(value);
        break;
      case 'vehicleNo':
        setVehicleNo(value);
        break;
      case 'pickupDate':
        setPickupDate(value);
        break;
      case 'deliveryDate':
        setDeliveryDate(value);
        break;
      case 'rate':
        setRate(value);
        break;
      case 'message':
        setMessage(value);
        break;
      default:
        break;
    }
  };

  const validateForm = () => {
    const errors = {};
    const fields = {
      trucker: selectedTrucker,
      driverName: driverName,
      vehicleNo: vehicleNo,
      pickupDate: pickupDate,
      deliveryDate: deliveryDate,
      rate: rate,
      message: message
    };

    Object.keys(fields).forEach(field => {
      const error = validateField(field, fields[field]);
      if (error) {
        errors[field] = error;
      }
    });

    setFormErrors(errors);
    setTouchedFields({
      trucker: true,
      driverName: true,
      vehicleNo: true,
      pickupDate: true,
      deliveryDate: true,
      rate: true,
      message: true
    });

    return Object.keys(errors).length === 0;
  };

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
                          {item.status !== 'approved' ? (
                            <div className="flex items-center gap-2">
                              {(loadTimers[item._id] ?? 0) > 0 ? (
                                <div className="flex items-center gap-2">
                                  <div className="text-center">
                                    <div className="text-lg font-bold text-orange-600">{loadTimers[item._id]}s</div>
                                    <div className="text-xs text-orange-500">Auto-accept</div>
                                  </div>
                                  <button
                                    onClick={() => handleManualAcceptFromTable(item)}
                                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-2 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl text-xs"
                                  >
                                    Accept Now
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs px-3 py-2 rounded-xl font-semibold bg-yellow-100 text-yellow-700">
                                  ⏳ Processing...
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs px-3 py-2 rounded-xl font-semibold bg-green-100 text-green-700">
                              ✅ Accepted
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
              
              <button
                onClick={exportToCSV}
                disabled={filteredRequests.length === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                  filteredRequests.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl'
                }`}
                title={filteredRequests.length === 0 ? 'No data to export' : `Export ${filteredRequests.length} records to CSV`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export to CSV
                {filteredRequests.length > 0 && (
                  <span className="bg-white/20 text-xs px-2 py-1 rounded-full">
                    {filteredRequests.length}
                  </span>
                )}
              </button>
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
                    {/* <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Shipment No</th> */}
                    <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Weight</th>
                    <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Pick-Up</th>
                    <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Drop</th>
                    <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Vehicle</th>
                    <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Rate</th>
                    <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                    {/* <th className="px-4 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Time</th> */}
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
                      {/* <td className="px-4 py-3">
                        <span className="font-medium text-gray-700">{item.shipmentNumber || 'N/A'}</span>
                      </td> */}
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
                      {/* <td className="px-4 py-3">{renderTimerChip(item.loadId)}</td> */}
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
                      <td colSpan="8" className="text-center py-12">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md transition-opacity duration-300 p-4 overflow-hidden">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col border border-gray-200 overflow-hidden">
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
              <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white px-8 py-6 rounded-t-3xl shadow-lg flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">Rate Request Form</h2>
                    <p className="text-sm text-emerald-100 mt-1">Submit your bid with trucker and delivery details</p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  type="button"
                  className="text-white hover:text-gray-200 hover:bg-white/10 p-2 rounded-xl transition-all duration-200"
                  aria-label="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
                {/* Load Details Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">Load Information</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pickup Location</div>
                      <div className="text-sm font-semibold text-gray-800">{selectedRequest?.origin?.city || '—'}</div>
                      <div className="text-xs text-gray-500">{selectedRequest?.origin?.state || ''}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Delivery Location</div>
                      <div className="text-sm font-semibold text-gray-800">{selectedRequest?.destination?.city || '—'}</div>
                      <div className="text-xs text-gray-500">{selectedRequest?.destination?.state || ''}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Weight</div>
                      <div className="text-sm font-semibold text-gray-800">{selectedRequest?.weight} Kg</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vehicle Type</div>
                      <div className="text-sm font-semibold text-gray-800">{selectedRequest?.vehicleType || '—'}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Commodity</div>
                      <div className="text-sm font-semibold text-gray-800">{selectedRequest?.commodity || 'N/A'}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Shipper</div>
                      <div className="text-sm font-semibold text-gray-800">{selectedRequest?.shipper?.compName || 'N/A'}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rate</div>
                      <div className="text-sm font-semibold text-emerald-600">${selectedRequest?.rate?.toLocaleString() || '0'}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</div>
                      <div className="text-sm font-semibold text-gray-800">{selectedRequest?.status || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">Bid Details</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-gray-700 text-sm font-semibold mb-2">
                        Select Trucker <span className="text-red-500">*</span>
                      </label>
                      <div className="relative trucker-dropdown-container">
                      <input
                        type="text"
                        value={truckerSearch}
                        onChange={(e) => {
                          setTruckerSearch(e.target.value);
                          setIsTruckerDropdownOpen(true);
                        }}
                        onFocus={() => setIsTruckerDropdownOpen(true)}
                        onClick={() => setIsTruckerDropdownOpen(true)}
                        onBlur={() => handleFieldBlur('trucker')}
                        placeholder="Search trucker by name, email, or phone..."
                        className={`w-full border-2 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 cursor-pointer transition-all duration-200 ${
                          touchedFields.trucker && formErrors.trucker
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                            : 'border-gray-200 focus:ring-emerald-500 focus:border-emerald-500 hover:border-gray-300'
                        }`}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      
                      {isTruckerDropdownOpen && (
                        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                          {/* Clear/Unselect option */}
                          {selectedTrucker && (
                            <div
                              onClick={() => {
                                setSelectedTrucker('');
                                setTruckerSearch('');
                                setIsTruckerDropdownOpen(false);
                              }}
                              className="px-4 py-3 hover:bg-red-50 cursor-pointer border-b border-gray-100 transition-colors duration-150"
                            >
                              <div className="font-medium text-red-600 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Clear Selection
                              </div>
                            </div>
                          )}
                          
                          {filteredTruckers.length > 0 ? (
                            filteredTruckers.map((trucker) => (
                              <div
                                key={trucker._id}
                                onClick={() => handleTruckerSelect(trucker._id, trucker.compName)}
                                className={`px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150 ${
                                  selectedTrucker === trucker._id ? 'bg-blue-50' : ''
                                }`}
                              >
                                <div className="font-medium text-gray-900">{trucker.compName}</div>
                                <div className="text-sm text-gray-500">{trucker.email}</div>
                                {trucker.phoneNo && (
                                  <div className="text-sm text-gray-500">{trucker.phoneNo}</div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-gray-500 text-center">
                              No truckers found matching "{truckerSearch}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {touchedFields.trucker && formErrors.trucker && (
                      <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formErrors.trucker}
                      </div>
                    )}
                    
                    {selectedTrucker && (
                      <div className="mt-3 p-3 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                            <div className="text-sm text-emerald-800">
                              <span className="font-semibold">Selected:</span> {selectedTruckerName}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTrucker('');
                              setTruckerSearch('');
                              handleFieldBlur('trucker');
                            }}
                            className="text-red-600 hover:text-red-800 hover:bg-red-100 p-2 rounded-lg transition-all duration-150"
                            title="Clear Selection"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-semibold mb-2">
                        Driver Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={driverName}
                        onChange={(e) => handleFieldChange('driverName', e.target.value)}
                        onBlur={() => handleFieldBlur('driverName')}
                        placeholder="Enter driver's full name"
                        className={`w-full border-2 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                          touchedFields.driverName && formErrors.driverName
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                            : 'border-gray-200 focus:ring-emerald-500 focus:border-emerald-500 hover:border-gray-300'
                        }`}
                      />
                      {touchedFields.driverName && formErrors.driverName && (
                        <div className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formErrors.driverName}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-semibold mb-2">
                        Vehicle Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={vehicleNo}
                        onChange={(e) => handleFieldChange('vehicleNo', e.target.value)}
                        onBlur={() => handleFieldBlur('vehicleNo')}
                        placeholder="Enter vehicle registration number"
                        className={`w-full border-2 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                          touchedFields.vehicleNo && formErrors.vehicleNo
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                            : 'border-gray-200 focus:ring-emerald-500 focus:border-emerald-500 hover:border-gray-300'
                        }`}
                      />
                      {touchedFields.vehicleNo && formErrors.vehicleNo && (
                        <div className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formErrors.vehicleNo}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-semibold mb-2">
                        Pickup Date & Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={pickupDate}
                        onChange={(e) => handleFieldChange('pickupDate', e.target.value)}
                        onBlur={() => handleFieldBlur('pickupDate')}
                        className={`w-full border-2 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                          touchedFields.pickupDate && formErrors.pickupDate
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                            : 'border-gray-200 focus:ring-emerald-500 focus:border-emerald-500 hover:border-gray-300'
                        }`}
                      />
                      {touchedFields.pickupDate && formErrors.pickupDate && (
                        <div className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formErrors.pickupDate}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-semibold mb-2">
                        Delivery Date & Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={deliveryDate}
                        onChange={(e) => handleFieldChange('deliveryDate', e.target.value)}
                        onBlur={() => handleFieldBlur('deliveryDate')}
                        className={`w-full border-2 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                          touchedFields.deliveryDate && formErrors.deliveryDate
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                            : 'border-gray-200 focus:ring-emerald-500 focus:border-emerald-500 hover:border-gray-300'
                        }`}
                      />
                      {touchedFields.deliveryDate && formErrors.deliveryDate && (
                        <div className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formErrors.deliveryDate}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-semibold mb-2">
                        Bid Rate ($) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={rate}
                        onChange={(e) => handleFieldChange('rate', e.target.value)}
                        onBlur={() => handleFieldBlur('rate')}
                        placeholder="Enter your bid amount"
                        min="1"
                        max="1000000"
                        className={`w-full border-2 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                          touchedFields.rate && formErrors.rate
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                            : 'border-gray-200 focus:ring-emerald-500 focus:border-emerald-500 hover:border-gray-300'
                        }`}
                      />
                      {touchedFields.rate && formErrors.rate && (
                        <div className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formErrors.rate}
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-gray-700 text-sm font-semibold mb-2">
                        Additional Message <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => handleFieldChange('message', e.target.value)}
                        onBlur={() => handleFieldBlur('message')}
                        rows={4}
                        placeholder="Add any additional notes or requirements..."
                        maxLength="500"
                        className={`w-full border-2 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 resize-none ${
                          touchedFields.message && formErrors.message
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                            : 'border-gray-200 focus:ring-emerald-500 focus:border-emerald-500 hover:border-gray-300'
                        }`}
                      />
                      <div className="flex justify-between items-center mt-1">
                        {touchedFields.message && formErrors.message ? (
                          <div className="text-sm text-red-600 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formErrors.message}
                          </div>
                        ) : (
                          <div></div>
                        )}
                        <div className="text-xs text-gray-500">
                          {message.length}/500 characters
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 rounded-b-3xl border-t border-gray-200 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Note:</span> All fields are required to submit your bid
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-3 bg-white text-gray-700 border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`px-8 py-3 rounded-xl font-semibold text-white transition-all duration-200 flex items-center gap-2 ${
                      submitting 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {submitting ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Submit Bid
                      </>
                    )}
                  </button>
                </div>
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
                  Accept Load
                </h2>
                <p className="text-sm text-blue-100 mt-1">
                  Accept this load request or it will auto-accept in {timeRemaining} seconds
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-bold">{timeRemaining}s</div>
                  <div className="text-xs text-blue-100">Auto-accept</div>
                </div>
                <button onClick={closeApprovalModal} type="button" className="text-white text-3xl hover:text-gray-200">
                  ×
                </button>
              </div>
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
                Approval Comments (Optional)
              </label>
              <textarea
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                rows={4}
                placeholder="Add any comments about this approval..."
                className="w-full border border-gray-300 px-4 py-3 rounded-xl"
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
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {approvalSubmitting ? 'Processing...' : 'Accept Load'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RateRequest;
