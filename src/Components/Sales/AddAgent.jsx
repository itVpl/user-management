import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import SalesDayAgentWorkspace from './SalesDayAgentWorkspace.jsx';
import { isSalesDayShiftTiming, userHasAddAgentModuleSync } from '../../utils/salesDayAgentEligibility';
import { employeeHasMenuModule } from '../../utils/employeeModuleAccess';

function readUser() {
  try {
    const raw = sessionStorage.getItem('user') || localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Sales day-shift **Add Agent** — only `sales-day-agent` APIs (via SalesDayAgentWorkspace).
 * Legacy event / manual customer entry stays on `/AddCustomer`.
 */
export default function AddAgent() {
  const location = useLocation();
  const [allow, setAllow] = useState(null);

  useEffect(() => {
    const user = readUser();
    const dayShift = isSalesDayShiftTiming(user);
    const syncModule = userHasAddAgentModuleSync(user);
    if (!dayShift) {
      setAllow(false);
      return;
    }
    if (syncModule) {
      setAllow(true);
      return;
    }
    let cancelled = false;
    setAllow(null);
    (async () => {
      try {
        const ok = await employeeHasMenuModule('Add Agent');
        if (!cancelled) setAllow(!!ok);
      } catch {
        if (!cancelled) setAllow(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.key, location.pathname]);

  const user = readUser();
  const dayShift = isSalesDayShiftTiming(user);

  if (allow === null) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-600 text-sm">
          Loading…
        </div>
      </div>
    );
  }

  if (!dayShift) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-lg">
          <h1 className="text-lg font-semibold text-gray-900">Add Agent (day shift)</h1>
          <p className="text-gray-600 text-sm mt-2">
            This screen is only for Sales employees on <strong>day shift</strong>. Night-shift customer entry uses{' '}
            <Link to="/AddCustomer" className="text-blue-600 font-medium hover:underline">
              Add Customer
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  if (!allow) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-lg">
          <h1 className="text-lg font-semibold text-gray-900">No access</h1>
          <p className="text-gray-600 text-sm mt-2">
            You do not have the <strong>Add Agent</strong> module assigned. Ask HR to enable it, then sign in again.
          </p>
          <Link to="/dashboard" className="inline-block mt-4 text-sm text-blue-600 font-medium hover:underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Add Agent</h1>
        <p className="text-gray-600 mt-2 text-sm max-w-3xl">
          Day-shift import: download the CSV template, upload your file, then use Review &amp; filter to search and set
          dispositions. Follow-ups schedule email and in-app reminders when due.
        </p>
      </div>
      <SalesDayAgentWorkspace />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}
