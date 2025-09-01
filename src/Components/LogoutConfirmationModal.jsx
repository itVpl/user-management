import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, X } from 'lucide-react';

const LogoutConfirmationModal = ({ isOpen, onClose, onConfirmLogout }) => {
  const [targetStatus, setTargetStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check target status when modal opens
  useEffect(() => {
    if (isOpen) {
      checkTargetStatus();
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
    } finally {
      setLoading(false);
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
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
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
