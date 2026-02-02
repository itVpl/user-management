import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, X, Truck } from 'lucide-react';
import API_CONFIG from '../config/api';

const LogoutConfirmationModal = ({ isOpen, onClose, onConfirmLogout }) => {
  const [targetStatus, setTargetStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rateRequestsWithoutBid, setRateRequestsWithoutBid] = useState([]);
  const [loadingRateRequests, setLoadingRateRequests] = useState(false);

  // Check target status when modal opens
  useEffect(() => {
    if (isOpen) {
      checkTargetStatus();
      // For CMT users, also fetch rate requests without bids
      const user = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
      const department = typeof user?.department === 'string' 
        ? user.department 
        : user?.department?.name || '';
      const departmentLower = department.toLowerCase();
      const isCMT = departmentLower === 'cmt' || departmentLower.includes('cmt');
      
      if (isCMT) {
        fetchRateRequestsWithoutBid();
      }
    }
  }, [isOpen]);

  const checkTargetStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user"));
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      if (!user || !token) {
        setError("User not found. Please login again.");
        return;
      }

      const { empId, department } = user;
      const today = new Date().toISOString().split('T')[0];

      // Determine endpoint based on department
      let endpoint = "";
      if (department === "Sales" || department === "sales") {
        endpoint = "/api/v1/inhouseUser/sales/report";
      } else if (department === "CMT" || department === "cmt") {
        endpoint = "/api/v1/inhouseUser/cmt/report";
      } else {
        // For other departments, assume target is complete
        setTargetStatus({ isComplete: true });
        setLoading(false);
        return;
      }

      const api = axios.create({
        baseURL: API_CONFIG.BASE_URL,
        withCredentials: true, // 🔥 CRITICAL: Required for Safari/iOS cross-site cookies
      });

      api.interceptors.request.use((config) => {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      });

      const response = await api.get(endpoint, {
        params: { date: today, empId }
      });

      const report = response.data?.data;
      if (report) {
        const isComplete = String(report.status).toLowerCase() === "completed";
        setTargetStatus({
          isComplete,
          status: report.status,
          talkTime: report.talkTime,
          deliveryOrders: report.deliveryOrdersCount,
          truckerCount: report.truckerCount,
          department
        });
      } else {
        setTargetStatus({ isComplete: true }); // If no report, assume complete
      }

    } catch (err) {
      console.error("Error checking target status:", err);
      setError("Failed to check target status. Please try again.");
      setTargetStatus({ isComplete: true }); // Default to complete on error
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setRateRequestsWithoutBid([]);
    onConfirmLogout();
    onClose();
  };

  const handleCancel = () => {
    setRateRequestsWithoutBid([]);
    onClose();
  };

  // Fetch rate requests where user hasn't placed a bid today
  // Using same API as RateRequest.jsx to get consistent data
  const fetchRateRequestsWithoutBid = async () => {
    try {
      setLoadingRateRequests(true);
      const user = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      if (!user || !token) {
        setLoadingRateRequests(false);
        return;
      }

      const empId = user.empId || user.employeeId;
      if (!empId) {
        setLoadingRateRequests(false);
        return;
      }

      // Format date as YYYY-MM-DD (same as RateRequest.jsx)
      const today = new Date();
      const ymd = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      const todayStr = ymd(today);

      const api = axios.create({
        baseURL: API_CONFIG.BASE_URL,
        withCredentials: true, // 🔥 CRITICAL: Required for Safari/iOS cross-site cookies
      });

      api.interceptors.request.use((config) => {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
        config.headers['Content-Type'] = 'application/json';
        return config;
      });

      // Fetch approved loads for today (same API as RateRequest.jsx)
      const response = await api.get('/api/v1/load-approval/pending', {
        params: {
          status: 'approved',
          fromDate: todayStr,
          toDate: todayStr,
          page: 1,
          limit: 100 // Get all loads for today
        }
      });

      let approvedApprovals = [];
      if (Array.isArray(response.data)) {
        approvedApprovals = response.data;
      } else {
        approvedApprovals = response.data?.approvals || response.data?.data?.approvals || [];
      }

      if (approvedApprovals.length === 0) {
        setRateRequestsWithoutBid([]);
        setLoadingRateRequests(false);
        return;
      }

      // Transform approvals to get load IDs (same structure as RateRequest.jsx)
      const loadIds = approvedApprovals
        .map(approval => approval?.loadId?._id || null)
        .filter(id => id !== null);

      if (loadIds.length === 0) {
        setRateRequestsWithoutBid([]);
        setLoadingRateRequests(false);
        return;
      }

      // Check which loads have bids from this user
      const loadsWithoutBid = [];
      
      for (const approval of approvedApprovals) {
        const loadId = approval?.loadId?._id;
        if (!loadId) continue;

        try {
          // Check if user has placed a bid on this load
          const bidResponse = await api.get('/api/v1/bid/intermediate-approval-status', {
            params: { loadId }
          });

          const bids = bidResponse?.data?.bids || bidResponse?.data?.data?.bids || [];
          
          // Check if any bid belongs to current user
          const userHasBid = bids.some(bid => {
            const bidEmpId = bid.empId || bid.createdBy?.empId || bid.createdBy?._id;
            return bidEmpId === empId || bidEmpId === user.employeeId;
          });

          // If user hasn't placed a bid, add to list
          if (!userHasBid) {
            const load = approval.loadId;
            loadsWithoutBid.push({
              _id: approval._id,
              loadId: loadId,
              weight: load?.weight || 0,
              origin: load?.origin || load?.origins?.[0] || {},
              destination: load?.destination || load?.destinations?.[0] || {}
            });
          }
        } catch (bidErr) {
          // If error checking bid, assume user hasn't bid (safer to show it)
          console.warn(`Error checking bid for load ${loadId}:`, bidErr);
          const load = approval.loadId;
          loadsWithoutBid.push({
            _id: approval._id,
            loadId: loadId,
            weight: load?.weight || 0,
            origin: load?.origin || load?.origins?.[0] || {},
            destination: load?.destination || load?.destinations?.[0] || {}
          });
        }
      }

      setRateRequestsWithoutBid(loadsWithoutBid);
    } catch (err) {
      console.error("Error fetching rate requests without bid:", err);
      // Don't show error to user, just log it
      setRateRequestsWithoutBid([]);
    } finally {
      setLoadingRateRequests(false);
    }
  };

  const loadShort = (id) => {
    const s = (id ?? '').toString();
    return s ? `L-${s.slice(-4)}` : 'L-0000';
  };

  if (!isOpen) return null;

  const isCMTWithRateRequests = targetStatus?.department?.toLowerCase() === 'cmt' && rateRequestsWithoutBid.length > 0;
  
  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className={`bg-white rounded-2xl shadow-2xl ${isCMTWithRateRequests ? 'max-w-lg' : 'max-w-md'} w-full p-6 relative animate-in fade-in-0 zoom-in-95 duration-200`}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <X size={20} />
        </button>

        {loading ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Checking target status...</p>
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Error</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={handleLogout}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Yes, Logout
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : targetStatus?.isComplete ? (
          // Target is complete - show normal logout confirmation
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Logout Confirmation</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to logout?</p>
            <div className="flex gap-3">
              <button
                onClick={handleLogout}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Yes, Logout
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          // Target is incomplete - show warning
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Target Incomplete!</h3>
            <p className="text-gray-600 mb-4">
              Your daily target is not completed. If you logout now, it will be counted as half day.
            </p>
            
            {/* Target details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
              <h4 className="font-medium text-gray-800 mb-2">Target Status:</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium text-amber-600">{targetStatus?.status || 'Incomplete'}</span>
                </div>
                {targetStatus?.talkTime && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Talk Time:</span>
                    <span className="font-medium">{targetStatus.talkTime.formatted || `${targetStatus.talkTime.hours?.toFixed(2)}h`}</span>
                  </div>
                )}
                {targetStatus?.department?.toLowerCase() === 'sales' && targetStatus?.deliveryOrders !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery Orders:</span>
                    <span className="font-medium">{targetStatus.deliveryOrders}</span>
                  </div>
                )}
                {targetStatus?.department?.toLowerCase() === 'cmt' && targetStatus?.truckerCount !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Truckers Added:</span>
                    <span className="font-medium">{targetStatus.truckerCount}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Rate Requests Without Bid - Only for CMT users */}
            {targetStatus?.department?.toLowerCase() === 'cmt' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-left">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="w-5 h-5 text-red-600" />
                  <h4 className="font-medium text-gray-800">Pending Rate Requests:</h4>
                </div>
                {loadingRateRequests ? (
                  <div className="text-center py-4">
                    <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-sm text-gray-600 mt-2">Loading...</p>
                  </div>
                ) : rateRequestsWithoutBid.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {rateRequestsWithoutBid.map((load, index) => (
                      <div key={load.loadId || load._id || index} className="bg-white rounded-lg p-3 border border-red-200">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-800 text-sm">
                                {loadShort(load.loadId || load._id)}
                              </span>
                            </div>
                            {load.origin && (
                              <div className="text-xs text-gray-600">
                                <span className="font-medium">
                                  {load.origin?.city || 'N/A'}, {load.origin?.state || ''}
                                </span>
                                {' → '}
                                <span className="font-medium">
                                  {load.destination?.city || 'N/A'}, {load.destination?.state || ''}
                                </span>
                              </div>
                            )}
                            {load.weight > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                Weight: {load.weight} lbs
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 text-center py-2">
                    No rate requests found without bids for today.
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleLogout}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Yes, Logout
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogoutConfirmationModal;
