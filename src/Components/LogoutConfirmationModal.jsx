import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, X } from 'lucide-react';
import API_CONFIG from '../config/api.js';

const LogoutConfirmationModal = ({ isOpen, onClose, onConfirmLogout }) => {
  const [targetStatus, setTargetStatus] = useState(null);
  const [missedFollowUps, setMissedFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);
  const [error, setError] = useState(null);

  // Check target status and missed follow-ups when modal opens
  useEffect(() => {
    if (isOpen) {
      Promise.all([checkTargetStatus(), checkMissedFollowUps()]).finally(() => {
        setLoading(false);
      });
    } else {
      // Reset states when modal closes
      setTargetStatus(null);
      setMissedFollowUps([]);
      setLoading(true);
      setError(null);
    }
  }, [isOpen]);

  const checkTargetStatus = async () => {
    try {
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
        baseURL: "https://vpl-liveproject-1.onrender.com",
        withCredentials: false,
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
    }
  };

  const checkMissedFollowUps = async () => {
    try {
      setLoadingFollowUps(true);
      const user = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user"));
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      if (!user || !token) {
        setMissedFollowUps([]);
        return;
      }

      // Only check for Sales department
      const { department } = user;
      if (department !== "Sales" && department !== "sales") {
        setMissedFollowUps([]);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      
      const api = axios.create({
        baseURL: API_CONFIG.BASE_URL || "https://vpl-liveproject-1.onrender.com",
        withCredentials: false,
      });

      api.interceptors.request.use((config) => {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      });

      const response = await api.get(`${API_CONFIG.BASE_URL || "https://vpl-liveproject-1.onrender.com"}/api/v1/sales-followup/my-followups`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      });

      if (response.data.success) {
        const followUps = response.data.data || [];
        
        // Filter missed follow-ups (nextFollowUpDate === today but not updated/completed)
        const missed = followUps
          .filter(item => {
            const latestFollowUp = item.followUps?.length ? item.followUps[item.followUps.length - 1] : null;
            const nextFollowUpDate = latestFollowUp?.nextFollowUpDate
              ? new Date(latestFollowUp.nextFollowUpDate).toISOString().split('T')[0]
              : '';
            
            // Check if follow-up is due today and not cancelled
            return nextFollowUpDate === today && 
                   item.status !== 'cancelled' &&
                   // Check if it's not completed (no update today)
                   (!latestFollowUp?.callingDate || 
                    new Date(latestFollowUp.callingDate).toISOString().split('T')[0] !== today);
          })
          .map(item => ({
            id: item._id,
            customerName: item.customerName,
            phone: item.phone,
            nextFollowUpDate: item.followUps?.length 
              ? new Date(item.followUps[item.followUps.length - 1].nextFollowUpDate).toISOString().split('T')[0]
              : ''
          }));

        setMissedFollowUps(missed);
      } else {
        setMissedFollowUps([]);
      }
    } catch (err) {
      console.error("Error checking missed follow-ups:", err);
      // Don't show error, just set empty array
      setMissedFollowUps([]);
    } finally {
      setLoadingFollowUps(false);
    }
  };

  const handleLogout = () => {
    onConfirmLogout();
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in-0 zoom-in-95 duration-200">
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
            <p className="text-gray-600">Checking target status and follow-ups...</p>
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
        ) : targetStatus?.isComplete && missedFollowUps.length === 0 ? (
          // Target is complete and no missed follow-ups - show normal logout confirmation
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
          // Target is incomplete or missed follow-ups exist - show warning
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {!targetStatus?.isComplete && missedFollowUps.length > 0 
                ? 'Target Incomplete & Missed Follow-ups!' 
                : !targetStatus?.isComplete 
                  ? 'Target Incomplete!' 
                  : 'Missed Follow-ups!'}
            </h3>
            <p className="text-gray-600 mb-4">
              {!targetStatus?.isComplete 
                ? "Your daily target is not completed. If you logout now, it will be counted as half day."
                : "You have missed follow-ups scheduled for today. Please update them before logging out."}
            </p>
            
            {/* Target details */}
            {!targetStatus?.isComplete && (
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
            )}

            {/* Missed Follow-ups */}
            {missedFollowUps.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4 mb-4 text-left border border-red-200">
                <h4 className="font-medium text-red-800 mb-2">Missed Follow-ups ({missedFollowUps.length}):</h4>
                <div className="space-y-2 text-sm max-h-40 overflow-y-auto">
                  {missedFollowUps.map((followUp, index) => (
                    <div key={followUp.id} className="flex items-start gap-2 pb-2 border-b border-red-100 last:border-0">
                      <span className="text-red-600 font-medium">{index + 1}.</span>
                      <div className="flex-1">
                        <span className="font-medium text-gray-800">{followUp.customerName || 'N/A'}</span>
                        {followUp.phone && (
                          <span className="text-gray-600 ml-2">({followUp.phone})</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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
