import { useState, useEffect, useRef } from "react";
import axios from "axios";
import API_CONFIG from "../config/api.js";

const getAuthToken = () =>
  localStorage.getItem("authToken") ||
  sessionStorage.getItem("authToken") ||
  localStorage.getItem("token") ||
  sessionStorage.getItem("token");

export const useDOAssignmentNotification = (empId, enabled = true) => {
  const [newDOAssignment, setNewDOAssignment] = useState(null);
  const previousDOIdsRef = useRef(new Set());
  const acknowledgedDOIdsRef = useRef(new Set()); // Track DO IDs that user has acknowledged
  const intervalRef = useRef(null);
  const previousEmpIdRef = useRef(null);

  useEffect(() => {
    if (!enabled || !empId) {
      setNewDOAssignment(null);
      previousEmpIdRef.current = null;
      return;
    }

    // Reset tracking only when empId actually changes (user switches)
    if (previousEmpIdRef.current !== empId) {
      console.log('🔄 DO EmpId changed, resetting tracking:', { 
        previous: previousEmpIdRef.current, 
        current: empId 
      });
      previousDOIdsRef.current = new Set();
      acknowledgedDOIdsRef.current = new Set();
      setNewDOAssignment(null);
      previousEmpIdRef.current = empId;
    }

    const checkForNewDOAssignments = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;

        const response = await axios.get(
          `${
            API_CONFIG.BASE_URL
          }/api/v1/do/do/assigned-to-cmt-user?cmtEmpId=${encodeURIComponent(
            empId
          )}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.data?.success && response.data.data) {
          // Filter to only include DOs assigned to the current user's empId
          const allAssignedDOs = response.data.data?.assignedDOs || [];
          const assignedDOs = allAssignedDOs.filter((doItem) => {
            // Check if this DO is assigned to the current user
            // Check in assignedToCMT object which contains the empId
            const assignedEmpId = doItem.assignedToCMT?.empId || doItem.empId;
            // Only show if the empId matches the current user's empId
            return assignedEmpId === empId;
          });

          // Find new assignments (not in previous set)
          const currentDOIds = new Set(
            assignedDOs
              .map((doItem) => doItem._id || doItem.doId)
              .filter(Boolean)
          );

          // On first load, just store the IDs
          const previousDOIds = previousDOIdsRef.current;
          if (previousDOIds.size === 0) {
            previousDOIdsRef.current = currentDOIds;
          } else {
            // Find new DO assignments (skip if already acknowledged)
            const newDOs = assignedDOs.filter((doItem) => {
              const doId = doItem._id || doItem.doId;
              // Skip if already acknowledged
              if (doId && acknowledgedDOIdsRef.current.has(doId)) {
                console.log('✅ DO already acknowledged, skipping:', doId);
                return false;
              }
              return doId && !previousDOIds.has(doId);
            });

            // If new DO assignment found, show notification for the latest one
            if (newDOs.length > 0) {
              const latestDO = newDOs[newDOs.length - 1];

              // Extract shipper data
              const shipper = latestDO?.shipper || {};
              const pickupLocation = shipper?.pickUpLocations?.[0] || {};
              const dropLocation = shipper?.dropLocations?.[0] || {};

              // Extract DO ID and format it
              const doIdValue = latestDO._id || latestDO.doId || "";
              const doNumber = doIdValue
                ? `DO-${String(doIdValue).slice(-6)}`
                : "N/A";

              // Build DO assignment data for notification
              const doAssignmentData = {
                doId: doIdValue,
                doNumber: doNumber,
                date: latestDO.date || "N/A",
                customerName:
                  latestDO.customerName ||
                  latestDO.customers?.[0]?.billTo ||
                  "N/A",
                loadNo: latestDO.customers?.[0]?.loadNo || "N/A",
                loadType:
                  latestDO.loadReference?.loadType ||
                  latestDO.loadType ||
                  "N/A",
                assignedAt:
                  latestDO.assignedToCMT?.assignedAt ||
                  latestDO.createdAt ||
                  new Date().toISOString(),
                // Origin data from pickUpLocations[0]
                origin: {
                  city: (pickupLocation?.city || "").trim(),
                  state: (pickupLocation?.state || "").trim(),
                  address: (pickupLocation?.address || "").trim(),
                },
                // Destination data from dropLocations[0]
                destination: {
                  city: (dropLocation?.city || "").trim(),
                  state: (dropLocation?.state || "").trim(),
                  address: (dropLocation?.address || "").trim(),
                },
                // Keep shipper reference for backward compatibility
                shipper: shipper,
              };

              setNewDOAssignment(doAssignmentData);
            }

            // Update the ref with current IDs
            previousDOIdsRef.current = currentDOIds;
          }
        }
      } catch (error) {
        console.error("Error checking for new DO assignments:", error);
      }
    };

    // Check immediately on mount
    checkForNewDOAssignments();

    // Then check every 30 seconds (reduced from 10s to prevent 429 errors)
    intervalRef.current = setInterval(checkForNewDOAssignments, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [empId, enabled]);

  const clearNotification = () => {
    // Mark the current DO as acknowledged so it doesn't show again
    if (newDOAssignment?.doId) {
      console.log('✅ Marking DO as acknowledged:', newDOAssignment.doId);
      acknowledgedDOIdsRef.current.add(newDOAssignment.doId);
    }
    setNewDOAssignment(null);
  };

  return { newDOAssignment, clearNotification };
};
