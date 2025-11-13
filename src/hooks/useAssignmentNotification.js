import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api.js';

const getAuthToken = () =>
  localStorage.getItem('authToken') ||
  sessionStorage.getItem('authToken') ||
  localStorage.getItem('token') ||
  sessionStorage.getItem('token');

export const useAssignmentNotification = (empId, enabled = true) => {
  const [newAssignment, setNewAssignment] = useState(null);
  const [previousAssignments, setPreviousAssignments] = useState(new Set());
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!enabled || !empId) return;

    const checkForNewAssignments = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;

        const response = await axios.get(
          `${API_CONFIG.BASE_URL}/api/v1/bid/cmt-assigned-loads/${empId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.data?.success) {
          const assignedLoads = response.data.data?.assignedLoads || [];
          
          // Find new assignments (not in previous set)
          const currentAssignmentIds = new Set(
            assignedLoads.map(al => al._id || al.load?._id || al.load?._id).filter(Boolean)
          );

          // On first load, just store the IDs
          setPreviousAssignments(prev => {
            if (prev.size === 0) {
              return currentAssignmentIds;
            }

            // Find new assignments
            const newAssignments = assignedLoads.filter(al => {
              const assignmentId = al._id || al.load?._id || al.load?._id;
              return assignmentId && !prev.has(assignmentId);
            });

            // If new assignment found, show notification for the latest one
            if (newAssignments.length > 0) {
              const latestAssignment = newAssignments[newAssignments.length - 1];
              const load = latestAssignment.load;
              
              // Build assignment data for notification
              const assignmentData = {
                assignmentId: latestAssignment._id,
                loadId: load?._id,
                shipmentNo: load?.shipmentNumber || 'N/A',
                shipperName: load?.shipper?.compName || 'N/A',
                pickupAddress: load?.origin 
                  ? `${load.origin.city || ''}, ${load.origin.state || ''}`.trim() || 'N/A'
                  : 'N/A',
                deliveryAddress: load?.destination
                  ? `${load.destination.city || ''}, ${load.destination.state || ''}`.trim() || 'N/A'
                  : 'N/A',
                assignedAt: latestAssignment.assignedAt || latestAssignment.createdAt
              };

              setNewAssignment(assignmentData);
            }

            return currentAssignmentIds;
          });
        }
      } catch (error) {
        console.error('Error checking for new assignments:', error);
      }
    };

    // Check immediately on mount
    checkForNewAssignments();

    // Then check every 10 seconds
    intervalRef.current = setInterval(checkForNewAssignments, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [empId, enabled]);

  const clearNotification = () => {
    setNewAssignment(null);
  };

  return { newAssignment, clearNotification };
};

