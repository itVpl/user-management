import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api';
import {
  persistFromMyTruckersApi,
  readAssignedTruckersSnapshot,
} from '../utils/truckerAssignmentStorage';

/**
 * Quota assignments (targetNewTruckerCount / addedCount) + optional legacy linked truckers.
 * Seeds from session (login); refreshes from GET my-truckers on mount and tab focus.
 */
export function useMyAssignedTruckers({ enabled = true } = {}) {
  const initial = readAssignedTruckersSnapshot();
  const [truckers, setTruckers] = useState(initial.truckers);
  const [windows, setWindows] = useState(initial.windows);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const token =
      sessionStorage.getItem('token') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('authToken') ||
      localStorage.getItem('authToken');
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const url = `${API_CONFIG.BASE_URL}/api/v1/trucker-assignments/my-truckers`;
      const res = await axios.get(url, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success) {
        persistFromMyTruckersApi(res.data);
        setTruckers(res.data.truckers || []);
        const assignments = res.data.assignments || [];
        setWindows(
          assignments.map((a) => ({
            assignmentId: a.assignmentId,
            startDate: a.startDate,
            endDate: a.endDate,
            notes: a.notes ?? '',
            targetNewTruckerCount: a.targetNewTruckerCount,
            addedCount: a.addedCount,
          }))
        );
      }
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to refresh');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) return;
    const onVis = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [enabled, refresh]);

  return { truckers, windows, loading, error, refresh };
}
