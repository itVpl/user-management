import { useState, useEffect, useRef } from "react";
import axios from "axios";
import API_CONFIG from "../config/api.js";

const getAuthToken = () =>
  localStorage.getItem("authToken") ||
  sessionStorage.getItem("authToken") ||
  localStorage.getItem("token") ||
  sessionStorage.getItem("token");

export const useAssignmentNotification = (empId, enabled = true) => {
  const [newAssignment, setNewAssignment] = useState(null);
  const previousAssignmentIdsRef = useRef(new Set());
  const assignmentTimestampsRef = useRef(new Map()); // Track assignment timestampss
  const acknowledgedLoadIdsRef = useRef(new Set()); // Track loadIds that user has acknowledged
  const intervalRef = useRef(null);

  // Track previous empId to only reset when it actually changes
  const previousEmpIdRef = useRef(null);

  // Load acknowledged loads from localStorage on mount
  useEffect(() => {
    if (empId) {
      const storageKey = `acknowledgedLoads_${empId}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const acknowledgedIds = JSON.parse(stored);
          acknowledgedLoadIdsRef.current = new Set(acknowledgedIds);
          console.log(
            "📦 Loaded acknowledged loads from storage:",
            Array.from(acknowledgedIds)
          );
        } catch (error) {
          console.error("Error loading acknowledged loads:", error);
        }
      }
    }
  }, [empId]);

  useEffect(() => {
    if (!enabled || !empId) {
      console.log("⏸️ useAssignmentNotification: Disabled or no empId", {
        enabled,
        empId,
      });
      setNewAssignment(null);
      previousEmpIdRef.current = null;
      return;
    }

    // Load acknowledged loads from localStorage first
    const storageKey = `acknowledgedLoads_${empId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const acknowledgedIds = JSON.parse(stored);
        acknowledgedLoadIdsRef.current = new Set(acknowledgedIds);
        console.log(
          "📦 Loaded acknowledged loads from storage:",
          Array.from(acknowledgedIds)
        );
      } catch (error) {
        console.error("Error loading acknowledged loads:", error);
      }
    }

    // Reset tracking only when empId actually changes (user switches)
    if (previousEmpIdRef.current !== empId) {
      console.log("🔄 EmpId changed, resetting tracking:", {
        previous: previousEmpIdRef.current,
        current: empId,
      });
      previousAssignmentIdsRef.current = new Set();
      assignmentTimestampsRef.current = new Map();
      // Don't clear acknowledgedLoadIdsRef - keep it from localStorage
      // acknowledgedLoadIdsRef.current is already loaded above
      setNewAssignment(null);
      previousEmpIdRef.current = empId;
    }

    console.log(
      "🔄 useAssignmentNotification: Starting to check for assignments",
      { empId, enabled }
    );

    const checkForNewAssignments = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;

        const response = await axios.get(
          `${API_CONFIG.BASE_URL}/api/v1/bid/cmt-assigned-loads/${empId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.data?.success) {
          // The API endpoint already filters by empId, so we trust the API response
          const allAssignedLoads = response.data.data?.assignedLoads || [];
          console.log(
            "📋 API Response - All assigned loads:",
            allAssignedLoads.length
          );

          // Log first assignment structure for debugging
          if (allAssignedLoads.length > 0) {
            console.log("🔍 Sample assignment structure:", {
              firstAssignment: allAssignedLoads[0],
              cmtAssignment: allAssignedLoads[0]?.cmtAssignment,
              assignedCMTUser:
                allAssignedLoads[0]?.cmtAssignment?.assignedCMTUser,
              empId: empId,
            });
          }

          // Since API endpoint already includes empId, it should filter by empId
          // Filter out null loads and use all returned loads
          const assignedLoads = allAssignedLoads.filter((assignedLoad) => {
            // Only filter out if load is missing
            if (!assignedLoad.load) {
              console.warn("⚠️ Assignment missing load object:", assignedLoad);
              return false;
            }
            return true;
          });

          // console.log(
          //   "📦 Filtered assigned loads (removed null loads):",
          //   assignedLoads.length
          // );

          // Log structure of first assignment for debugging
          if (assignedLoads.length > 0) {
            const firstLoad = assignedLoads[0];
            console.log("🔍 First assignment structure:", {
              hasLoad: !!firstLoad.load,
              loadId: firstLoad.load?._id,
              cmtAssignment: firstLoad.cmtAssignment,
              assignedCMTUser: firstLoad.cmtAssignment?.assignedCMTUser,
              assignmentId: firstLoad._id,
              fullStructure: JSON.stringify(firstLoad, null, 2).substring(
                0,
                500
              ), // First 500 chars
            });
          } else if (allAssignedLoads.length > 0) {
            // If we filtered out all loads, log why
            console.error("❌ All loads were filtered out!", {
              totalLoads: allAssignedLoads.length,
              sampleLoad: allAssignedLoads[0],
              empId: empId,
            });
          }

          // Track assignments by loadId to detect both new assignments and reassignments
          // When a load is reassigned, it might get a new assignment _id, so we track by loadId
          const currentAssignmentMap = new Map();
          assignedLoads.forEach((al) => {
            const loadId = al.load?._id;
            if (!loadId) {
              console.warn("⚠️ Assignment missing loadId:", al);
              return;
            }

            // Use loadId as the key to track reassignments
            const assignmentTimestamp =
              al.cmtAssignment?.assignedAt ||
              al.assignedAt ||
              al.createdAt ||
              new Date().toISOString();

            // Store both the assignment ID and timestamp
            currentAssignmentMap.set(loadId, {
              timestamp: assignmentTimestamp,
              assignment: al,
              assignmentId: al._id || al.cmtAssignment?._id,
            });
          });

          const previousAssignmentIds = previousAssignmentIdsRef.current;
          const previousTimestamps = assignmentTimestampsRef.current;

          // On first load, just store the IDs and timestamps (don't show popup for existing assignments)
          if (previousAssignmentIds.size === 0) {
            console.log(
              "🔵 First load - storing existing assignments, no popup"
            );
            // First load - store all current assignments
            previousAssignmentIdsRef.current = new Set(
              Array.from(currentAssignmentMap.keys())
            );
            const timestampsMap = new Map();
            currentAssignmentMap.forEach((data, loadId) => {
              timestampsMap.set(loadId, data.timestamp);
              // Also store assignment ID to detect reassignments with new assignment IDs
              if (data.assignmentId) {
                timestampsMap.set(loadId + "_assignmentId", data.assignmentId);
              }
            });
            assignmentTimestampsRef.current = timestampsMap;
          } else {
            // Find new or reassigned assignments
            const newAssignments = [];

            assignedLoads.forEach((al) => {
              const loadId = al.load?._id;
              if (!loadId) {
                console.warn("⚠️ Assignment missing loadId:", al);
                return;
              }

              // Skip if user has already acknowledged this load
              if (acknowledgedLoadIdsRef.current.has(loadId)) {
                // console.log("✅ Load already acknowledged, skipping:", loadId);
              }

              const currentData = currentAssignmentMap.get(loadId);
              if (!currentData) return;

              const currentTimestamp = currentData.timestamp;
              const previousTimestamp = previousTimestamps.get(loadId);

              // Check if it's a new assignment (loadId not in previous set)
              const isNewAssignment = !previousAssignmentIds.has(loadId);

              // Check if it's a reassignment (same loadId but different/updated timestamp or different assignment IDs)
              const previousAssignmentId = previousTimestamps.get(
                loadId + "_assignmentId"
              );
              const currentAssignmentId = currentData.assignmentId;
              const isReassignment =
                previousAssignmentIds.has(loadId) &&
                previousTimestamp &&
                currentTimestamp &&
                (currentTimestamp !== previousTimestamp ||
                  currentAssignmentId !== previousAssignmentId) &&
                new Date(currentTimestamp) >= new Date(previousTimestamp);

              if (isNewAssignment) {
                console.log("🆕 New assignment detected for loadId:", loadId);
                newAssignments.push(al);
              } else if (isReassignment) {
                // console.log("🔄 Reassignment detected for loadId:", loadId, {
                //   previousTimestamp,
                //   currentTimestamp,
                //   previousAssignmentId,
                //   currentAssignmentId,
                // });
                newAssignments.push(al);
              }
            });

            // If new assignment or reassignment found, show notification for the latest one
            if (newAssignments.length > 0) {
              // Sort by timestamp to get the most recent
              newAssignments.sort((a, b) => {
                const timestampA =
                  a.cmtAssignment?.assignedAt ||
                  a.assignedAt ||
                  a.createdAt ||
                  "";
                const timestampB =
                  b.cmtAssignment?.assignedAt ||
                  b.assignedAt ||
                  b.createdAt ||
                  "";
                return new Date(timestampB) - new Date(timestampA);
              });

              const latestAssignment =
                newAssignments[newAssignments.length - 1];
              const load = latestAssignment.load;
              const loadId = load?._id;

              // Final check: Skip if this load has already been acknowledged
              if (loadId && acknowledgedLoadIdsRef.current.has(loadId)) {
                console.log(
                  "✅ Load already acknowledged (final check), skipping popup:",
                  loadId
                );
                // Update refs to mark as seen so it won't trigger again
                previousAssignmentIdsRef.current.add(loadId);
                if (
                  latestAssignment.cmtAssignment?.assignedAt ||
                  latestAssignment.assignedAt ||
                  latestAssignment.createdAt
                ) {
                  const timestamp =
                    latestAssignment.cmtAssignment?.assignedAt ||
                    latestAssignment.assignedAt ||
                    latestAssignment.createdAt;
                  assignmentTimestampsRef.current.set(loadId, timestamp);
                  if (
                    latestAssignment._id ||
                    latestAssignment.cmtAssignment?._id
                  ) {
                    assignmentTimestampsRef.current.set(
                      loadId + "_assignmentId",
                      latestAssignment._id ||
                        latestAssignment.cmtAssignment?._id
                    );
                  }
                }
              } else {
                // Check if this is a reassignment (loadId was in previous set)
                const isReassignment =
                  loadId && previousAssignmentIds.has(loadId);

                // Build assignment data for notification
                const assignmentData = {
                  assignmentId:
                    latestAssignment._id || latestAssignment.cmtAssignment?._id,
                  loadId: load?._id,
                  shipmentNo: load?.shipmentNumber || "N/A",
                  shipperName: load?.shipper?.compName || "N/A",
                  pickupAddress: load?.origin
                    ? `${load.origin.city || ""}, ${
                        load.origin.state || ""
                      }`.trim() || "N/A"
                    : "N/A",
                  deliveryAddress: load?.destination
                    ? `${load.destination.city || ""}, ${
                        load.destination.state || ""
                      }`.trim() || "N/A"
                    : "N/A",
                  assignedAt:
                    latestAssignment.cmtAssignment?.assignedAt ||
                    latestAssignment.assignedAt ||
                    latestAssignment.createdAt,
                  isReassignment: isReassignment,
                };

                console.log(
                  "🚚 New Load Assignment/Reassignment Detected - Showing Popup:",
                  assignmentData
                );
                setNewAssignment(assignmentData);
              }
            } else {
              console.log("ℹ️ No new assignments detected");
            }

            // Update refs with current data
            previousAssignmentIdsRef.current = new Set(
              Array.from(currentAssignmentMap.keys())
            );
            const timestampsMap = new Map();
            currentAssignmentMap.forEach((data, loadId) => {
              timestampsMap.set(loadId, data.timestamp);
              // Also store assignment ID to detect reassignments with new assignment IDs
              if (data.assignmentId) {
                timestampsMap.set(loadId + "_assignmentId", data.assignmentId);
              }
            });
            assignmentTimestampsRef.current = timestampsMap;
          }
        } else {
          console.warn("⚠️ API response not successful:", response.data);
        }
      } catch (error) {
        console.error("Error checking for new assignments:", error);
      }
    };

    // Check immediately on mount
    checkForNewAssignments();

    // Then check every 30 seconds (reduced from 10s to prevent 429 errors)
    intervalRef.current = setInterval(checkForNewAssignments, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [empId, enabled]);

  const clearNotification = () => {
    // Mark the current assignment as acknowledged so it doesn't show again
    if (newAssignment?.loadId) {
      const loadId = newAssignment.loadId;
      console.log("✅ Marking load as acknowledged:", loadId);

      // Add to acknowledged set
      acknowledgedLoadIdsRef.current.add(loadId);

      // Also add to previousAssignmentIds so it's treated as "already seen"
      previousAssignmentIdsRef.current.add(loadId);

      // Update timestamp so reassignment detection won't trigger
      if (newAssignment.assignedAt) {
        assignmentTimestampsRef.current.set(loadId, newAssignment.assignedAt);
        if (newAssignment.assignmentId) {
          assignmentTimestampsRef.current.set(
            loadId + "_assignmentId",
            newAssignment.assignmentId
          );
        }
      }

      // Persist to localStorage
      if (empId) {
        const storageKey = `acknowledgedLoads_${empId}`;
        const acknowledgedArray = Array.from(acknowledgedLoadIdsRef.current);
        localStorage.setItem(storageKey, JSON.stringify(acknowledgedArray));
        console.log(
          "💾 Saved acknowledged loads to storage:",
          acknowledgedArray
        );
      }
    }
    setNewAssignment(null);
  };

  return { newAssignment, clearNotification };
};
