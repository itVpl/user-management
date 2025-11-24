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
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!enabled || !empId) return;

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
            return doItem.empId === empId;
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
            // Find new DO assignments
            const newDOs = assignedDOs.filter((doItem) => {
              const doId = doItem._id || doItem.doId;
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

    // Then check every 10 seconds
    intervalRef.current = setInterval(checkForNewDOAssignments, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [empId, enabled]);

  const clearNotification = () => {
    setNewDOAssignment(null);
  };

  return { newDOAssignment, clearNotification };
};
