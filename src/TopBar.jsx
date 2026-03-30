import React, { useEffect, useRef, useState } from "react";
import Notification from "./assets/Icons super admin/Nav Bar/Blue/Notification.png";
import ProfileIcon from "./assets/Icons super admin/ProfileIcon.png";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import API_CONFIG from "./config/api.js";
import { useEnhancedNotifications } from "./hooks/useEnhancedNotifications";
import LoadChatModalCMT from "./Components/CMT/LoadChatModalCMT";
import sharedSocketService from "./services/sharedSocketService";
import { X } from "lucide-react";

const Topbar = () => {
  const navigate = useNavigate();
  const BASE_8X8 = `${API_CONFIG.BASE_URL}/api/v1/analytics/8x8`;

  const [profileOpen, setProfileOpen] = useState(false);

  // Notification State
  const [notificationOpen, setNotificationOpen] = useState(false);
  const { 
    unreadCount, 
    notifications, 
    clearNotification, 
    clearAllNotifications 
  } = useEnhancedNotifications();
  const [followUpNotifications, setFollowUpNotifications] = useState([]);
  const [followUpToast, setFollowUpToast] = useState(null);
  /** Full follow-up payload (notification item) for read-only details modal */
  const [followUpDetailModal, setFollowUpDetailModal] = useState(null);
  const seenFollowUpIdsRef = useRef(new Set());

  const [chatModalState, setChatModalState] = useState({
    isOpen: false,
    loadId: null,
    receiverEmpId: null,
    receiverName: null
  });
  
  // User department and checklist data
  const [userDepartment, setUserDepartment] = useState(null);
  const [checklistItems, setChecklistItems] = useState(['blank', 'blank', 'blank', 'blank']); // Default blank items
  const [checklistTooltips, setChecklistTooltips] = useState(['', '', '', '']);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  
  // User profile data
  const [userProfile, setUserProfile] = useState({
    name: 'Loading...',
    department: 'Loading...',
    empId: '',
    profileImage: ProfileIcon
  });
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest("#profile-dropdown")) setProfileOpen(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Helper function to format department name
  const formatDepartmentName = (dept) => {
    if (!dept) return 'Employee';
    
    const deptLower = dept.toLowerCase().trim();
    
    // Map department codes to readable names
    const departmentMap = {
      'hr': 'Human Resources',
      'sales': 'Sales',
      'cmt': 'CMT',
      'finance': 'Finance',
      'qa': 'Quality Assurance',
      'admin': 'Administration',
      'it': 'Information Technology',
      'operations': 'Operations',
      'marketing': 'Marketing'
    };
    
    // Check if it's a known department code
    if (departmentMap[deptLower]) {
      return departmentMap[deptLower];
    }
    
    // If not a code, capitalize first letter of each word
    return dept.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Get user department and profile data
  useEffect(() => {
    const userString = localStorage.getItem("user") || sessionStorage.getItem("user");
    
    if (userString) {
      try {
        const userData = JSON.parse(userString);
        console.log('TopBar: User data loaded:', userData); // Debug log
        
        // Set user profile data
        const userName = userData?.employeeName || userData?.name || userData?.firstName || 
                        (userData?.firstName && userData?.lastName ? `${userData.firstName} ${userData.lastName}` : '') ||
                        'User';
        const empId = userData?.empId || userData?.employeeId || '';
        const designation = userData?.designation || userData?.position || userData?.role || '';
        
        // Get department info
        const department = typeof userData?.department === 'string' 
          ? userData.department 
          : userData?.department?.name || '';
        const departmentLower = department.toLowerCase().trim();
        
        // Set profile data with designation if available, otherwise use department
        const displayRole = designation || formatDepartmentName(department);
        
        setUserProfile({
          name: userName,
          department: displayRole,
          empId: empId,
          profileImage: userData?.profileImage || ProfileIcon
        });
        
        setProfileLoaded(true);
        
        // Set department for checklist
        if (departmentLower === 'sales' || departmentLower === 'cmt' || departmentLower.includes('sales') || departmentLower.includes('cmt')) {
          const finalDept = departmentLower.includes('sales') ? 'sales' : 'cmt';
          setUserDepartment(finalDept);
        } else if (departmentLower === 'hr') {
          setUserDepartment('hr');
        } else if (departmentLower === 'finance' || departmentLower.includes('finance')) {
          setUserDepartment('finance');
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
        // Set fallback profile data
        setUserProfile({
          name: 'User',
          department: 'Employee',
          empId: '',
          profileImage: ProfileIcon
        });
        setProfileLoaded(true);
      }
    } else {
      // No user data found, set fallback
      setUserProfile({
        name: 'Guest User',
        department: 'Not Logged In',
        empId: '',
        profileImage: ProfileIcon
      });
      setProfileLoaded(true);
    }
  }, []);

  // Fetch checklist data based on department
  useEffect(() => {
    if (!userDepartment) {
      return;
    }

    const fetchChecklistData = async () => {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const userString = localStorage.getItem("user") || sessionStorage.getItem("user");

      if (!token || !userString) {
        return;
      }

      const userData = JSON.parse(userString);
      const empId = userData?.empId || userData?.employeeId;

      try {
        
        if (!empId) {
          return;
        }

        const today = new Date().toISOString().split('T')[0];
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        // Use dedicated checklist API endpoints
        const checklistEndpoint = userDepartment === 'sales' 
          ? `${API_CONFIG.BASE_URL}/api/v1/checklist/sales?empId=${empId}&date=${today}`
          : `${API_CONFIG.BASE_URL}/api/v1/checklist/cmt?empId=${empId}&date=${today}`;
        
        const checklistRes = await axios.get(checklistEndpoint, { headers }).catch((err) => {
          console.error("Checklist API Error:", err);
          return { data: { success: false, data: [] } };
        });

        if (checklistRes.data?.success && checklistRes.data?.data?.checklist) {
          const checklist = checklistRes.data.data.checklist;
          let items = [];
          let tooltips = [];

          if (userDepartment === 'sales') {
            const getStatus = (item) => {
              if (item?.status === true) return 'completed';
              if (item?.status === false && (item?.actual > 0 || item?.actual !== null)) return 'wrong';
              return 'blank';
            };

            const shouldHideRating = empId === 'VPL006' || empId === 'VPL007' || empId === 'VPL005';

            items = [
              getStatus(checklist.talktime4Hours), 
              getStatus(checklist.threePlusLoadSubmitted),
              getStatus(checklist.attendance),
              ...(shouldHideRating ? [] : [getStatus(checklist.rating)])
            ];

            tooltips = [
              `Talktime: ${(checklist.talktime4Hours?.hours || 0).toFixed(2)} hrs (Target: ${checklist.talktime4Hours?.required || 4} hrs)`,
              `Loads Created: ${checklist.threePlusLoadSubmitted?.count || 0} (Target: ${checklist.threePlusLoadSubmitted?.required || 3}+)`,
              checklist.attendance?.status 
                ? 'Attendance: Present' 
                : 'Attendance: Not marked',
              ...(shouldHideRating ? [] : [
                checklist.rating?.status 
                  ? `Manager Rating: ${checklist.rating?.value || 'Completed'}` 
                  : 'Manager Rating: Pending'
              ])
            ];
          } else if (userDepartment === 'cmt') {
            const getStatus = (item) => {
              if (item?.status === true) return 'completed';
              if (item?.status === false && (item?.actual > 0 || item?.actual !== null)) return 'wrong';
              return 'blank';
            };

            // Fetch attendance separately for login check
            let hasLogin = false;
            try {
              const attendanceRes = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/attendance/my?date=${today}`, { headers });
              const attendanceData = attendanceRes.data;
              hasLogin = attendanceData?.success && (
                attendanceData?.attendance || 
                attendanceData?.attendanceRecord ||
                attendanceData?.date ||
                (attendanceData?.status && attendanceData.status.toLowerCase() !== 'absent') ||
                (attendanceData?.loginTime) ||
                (attendanceData?.success === true)
              );
            } catch (err) {
              console.log("Attendance check failed:", err);
            }

            items = [
              getStatus(checklist.talktime3Hours),
              getStatus(checklist.onePlusTruckerAdded),
              hasLogin ? 'completed' : 'blank',
              getStatus(checklist.threePlusBidPosted)
            ];

            tooltips = [
              `Talktime: ${(checklist.talktime3Hours?.hours || 0).toFixed(2)} hrs (Target: ${checklist.talktime3Hours?.required || 3} hrs)`,
              `Truckers Added: ${checklist.onePlusTruckerAdded?.count || 0} (Target: ${checklist.onePlusTruckerAdded?.required || 1}+)`,
              hasLogin ? 'Attendance: Present' : 'Attendance: Not marked',
              `Bids Submitted: ${checklist.threePlusBidPosted?.count || 0} (Target: ${checklist.threePlusBidPosted?.required || 3}+)`
            ];
          }

          setChecklistItems(items);
          setChecklistTooltips(tooltips);
        } else {
          // Fallback: Set default blank items if API fails
          const shouldHideRating = empId === 'VPL006' || empId === 'VPL007';
          
          if (userDepartment === 'sales') {
            setChecklistItems(shouldHideRating ? ['blank', 'blank', 'blank'] : ['blank', 'blank', 'blank', 'blank']);
            setChecklistTooltips(shouldHideRating ? [
              'Talktime: 0.0 hrs (Target: 3+ hrs)',
              'Loads Created: 0 (Target: 3+)',
              'Attendance: Not marked'
            ] : [
              'Talktime: 0.0 hrs (Target: 3+ hrs)',
              'Loads Created: 0 (Target: 3+)',
              'Attendance: Not marked',
              'Manager Rating: Pending'
            ]);
          } else {
            setChecklistItems(['blank', 'blank', 'blank', 'blank']);
            setChecklistTooltips([
              'Talktime: 0.0 hrs (Target: 3 hrs)',
              'Truckers Added: 0 (Target: 1+)',
              'Attendance: Not marked',
              'Bids Submitted: 0 (Target: 3+)'
            ]);
          }
        }
       } catch (error) {
         console.error("Error fetching checklist data:", error);
         const shouldHideRating = empId === 'VPL006' || empId === 'VPL007';
         
         if (userDepartment === 'sales') {
           setChecklistItems(shouldHideRating ? ['blank', 'blank', 'blank'] : ['blank', 'blank', 'blank', 'blank']);
           setChecklistTooltips(shouldHideRating ? [
             'Talktime: 0.0 hrs (Target: 3+ hrs)',
             'Loads Created: 0 (Target: 3+)',
             'Attendance: Not marked'
           ] : [
             'Talktime: 0.0 hrs (Target: 3+ hrs)',
             'Loads Created: 0 (Target: 3+)',
             'Attendance: Not marked',
             'Manager Rating: Pending'
           ]);
         } else if (userDepartment === 'cmt') {
           setChecklistItems(['blank', 'blank', 'blank', 'blank']);
           setChecklistTooltips([
             'Talktime: 0.0 hrs (Target: 3 hrs)',
             'Truckers Added: 0 (Target: 1+)',
             'Attendance: Not marked',
             'Bids Submitted: 0 (Target: 3+)'
           ]);
         }
       }
    };

    fetchChecklistData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchChecklistData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userDepartment]);

  const getAuthHeadersWithTimeZone = () => {
    const token =
      sessionStorage.getItem("authToken") ||
      localStorage.getItem("authToken") ||
      sessionStorage.getItem("token") ||
      localStorage.getItem("token");
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    if (tz) headers["X-Time-Zone"] = tz;
    return headers;
  };

  const fetchFollowUpNotifications = async () => {
    try {
      const token =
        sessionStorage.getItem("authToken") ||
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("token") ||
        localStorage.getItem("token");
      if (!token) return;

      const res = await axios.get(
        `${BASE_8X8}/call-follow-up-notifications`,
        {
          params: { unreadOnly: true },
          headers: getAuthHeadersWithTimeZone(),
        }
      );
      const items = Array.isArray(res.data?.data) ? res.data.data : [];
      const dueItems = items.filter((n) => n?.type === "call_follow_up_due" && !n?.read);
      setFollowUpNotifications(dueItems);

      // Global in-app toast for newly seen follow-up reminders.
      const newItem = dueItems.find((n) => {
        const nid = n?.id || n?._id;
        return nid && !seenFollowUpIdsRef.current.has(nid);
      });
      if (newItem) {
        dueItems.forEach((n) => {
          const nid = n?.id || n?._id;
          if (nid) seenFollowUpIdsRef.current.add(nid);
        });
        setFollowUpToast(newItem);
      }
    } catch (error) {
      console.warn("Follow-up notifications fetch failed:", error);
    }
  };

  const markFollowUpNotificationRead = async (item) => {
    const notifId = item?.id || item?._id;
    if (!notifId) return;
    try {
      await axios.patch(
        `${BASE_8X8}/call-follow-up-notifications/${encodeURIComponent(notifId)}/read`,
        {},
        { headers: getAuthHeadersWithTimeZone() }
      );
    } catch (error) {
      console.warn("Mark follow-up notification read failed:", error);
    } finally {
      setFollowUpNotifications((prev) =>
        prev.filter((n) => (n?.id || n?._id) !== notifId)
      );
    }
  };

  const openFollowUpDetailsModal = async (item) => {
    if (!item || typeof item !== "object") return;
    setNotificationOpen(false);
    setFollowUpToast(null);
    setFollowUpDetailModal({ ...item });
    await markFollowUpNotificationRead(item);
  };

  useEffect(() => {
    fetchFollowUpNotifications();
    const interval = setInterval(fetchFollowUpNotifications, 90 * 1000);
    return () => clearInterval(interval);
  }, []);

  /** Realtime follow-up due (room user_<empId>); polling remains fallback. */
  useEffect(() => {
    const handler = (payload) => {
      const p = payload && typeof payload === "object" ? payload : {};
      if (p.type && p.type !== "call_follow_up_due") return;
      const nid = p.id || p._id;
      if (nid) {
        if (seenFollowUpIdsRef.current.has(nid)) return;
        seenFollowUpIdsRef.current.add(nid);
      }
      setFollowUpToast(p);
      setFollowUpNotifications((prev) => {
        if (nid && prev.some((n) => (n?.id || n?._id) === nid)) return prev;
        return [...prev, { ...p, read: false }];
      });
    };
    let cleanup = () => {};
    const attach = () => {
      const socket = sharedSocketService.getSocket();
      if (!socket) return false;
      socket.on("call_follow_up_due", handler);
      cleanup = () => socket.off("call_follow_up_due", handler);
      return true;
    };
    let pollId;
    if (!attach()) {
      pollId = setInterval(() => {
        if (attach()) clearInterval(pollId);
      }, 400);
    }
    return () => {
      if (pollId) clearInterval(pollId);
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (!followUpToast) return;
    const timer = setTimeout(() => setFollowUpToast(null), 6000);
    return () => clearTimeout(timer);
  }, [followUpToast]);

  /**
   * Notification payloads often omit `meta.address` (email/notes are included server-side).
   * Load saved follow-up row via categories API so the details modal can show address.
   */
  useEffect(() => {
    const modal = followUpDetailModal;
    const callId = modal?.callId;
    if (!callId) return;

    const meta = modal?.meta && typeof modal.meta === "object" ? modal.meta : {};
    const hasAddress = String(meta.address ?? "").trim() !== "";
    if (hasAddress) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${BASE_8X8}/call-records/categories`, {
          params: { callIds: String(callId) },
          headers: getAuthHeadersWithTimeZone(),
        });
        if (cancelled || !res.data?.success || !res.data?.data) return;
        const bucket = res.data.data;
        const row =
          bucket[callId] ?? bucket[String(callId)] ?? bucket[Number(callId)];
        const fd = row?.followUpDetails && typeof row.followUpDetails === "object"
          ? row.followUpDetails
          : {};
        const addr = fd.address;
        if (addr == null || String(addr).trim() === "") return;

        setFollowUpDetailModal((prev) => {
          if (!prev || String(prev.callId) !== String(callId)) return prev;
          const pm = prev.meta && typeof prev.meta === "object" ? prev.meta : {};
          if (String(pm.address ?? "").trim() !== "") return prev;
          return {
            ...prev,
            meta: { ...pm, address: String(addr).trim() },
          };
        });
      } catch (e) {
        console.warn("Follow-up modal: could not load address from call record:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [followUpDetailModal]);

  // Listen for notification events
  useEffect(() => {
    const handleOpenChat = (e) => {
      if (e.detail) {
        setChatModalState({
          isOpen: true,
          loadId: e.detail.loadId,
          receiverEmpId: null,
          receiverName: e.detail.senderName
        });
      }
    };

    const handleOpenNegotiation = (e) => {
      if (e.detail) {
        setChatModalState({
          isOpen: true,
          loadId: e.detail.loadId,
          receiverEmpId: 'shipper',
          receiverName: 'Shipper'
        });
      }
    };

    window.addEventListener('OPEN_LOAD_CHAT', handleOpenChat);
    window.addEventListener('OPEN_NEGOTIATION', handleOpenNegotiation);

    return () => {
      window.removeEventListener('OPEN_LOAD_CHAT', handleOpenChat);
      window.removeEventListener('OPEN_NEGOTIATION', handleOpenNegotiation);
    };
  }, []);

  return (
      <div
        className="fixed top-6 h-16 z-50 flex items-center"
        style={{
          left: 'calc(var(--sidebar-offset, 296px) + 32px)',
          right: '60px',
          transition: 'left 250ms ease, width 250ms ease'
        }}
      >
      <div className="w-full bg-white border border-gray-300 rounded-xl px-6 py-3 flex items-center justify-between">
        {/* Left Section - Checklist Stepper Icons */}
        <div className="flex items-center gap-2">
          {userDepartment && (userDepartment === 'sales' || userDepartment === 'cmt') && checklistItems.length > 0 ? (
            checklistItems.map((state, index) => {
              // Get icon based on department and index
              const getIcon = () => {
                if (userDepartment === 'sales') {
                  // Sales: Talktime, Loads, Attendance, Rating
                  if (index === 0) {
                    // Phone icon for Talktime
                    return (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    );
                  } else if (index === 1) {
                    // Box/Package icon for Loads Created
                    return (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    );
                  } else if (index === 2) {
                    // Clipboard with checkmark icon for Attendance
                    return (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    );
                  } else if (index === 3) {
                    // Star icon for Rating
                    return (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    );
                  }
                } else if (userDepartment === 'cmt') {
                  if (index === 0) {
                    return <img src="/icons/call.svg" className="w-10 h-10" alt="Call" />;
                  }
                  else if (index === 1) {
                    return <img src="/icons/truck.svg" className="w-10 h-10" alt="Truck" />;
                  }
                  else if (index === 2) {
                    return <img src="/icons/attendance.svg" className="w-10 h-10" alt="Attendance" />;
                  }
                  else if (index === 3) {
                    return <img src="/icons/bid.svg" className="w-10 h-10" alt="Bid" />;
                  }
                }
                return null;
              };

              return (
                <React.Fragment key={index}>
                  {/* Checklist Item with Tooltip */}
                  <div
                    className="relative"
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {state === 'blank' && (
                      <div className="w-10 h-10 rounded-full border-2 border-red-300 bg-red-50 flex items-center justify-center cursor-pointer hover:border-red-400 transition">
                        {getIcon() && <span className="text-red-600">{getIcon()}</span>}
                      </div>
                    )}

                    {state === 'completed' && (
                      <div className="w-10 h-10 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center cursor-pointer hover:bg-green-200 transition">
                        {getIcon() && <span className="text-green-600">{getIcon()}</span>}
                      </div>
                    )}

                    {state === 'wrong' && (
                      <div className="w-10 h-10 rounded-full bg-red-100 border-2 border-red-300 flex items-center justify-center cursor-pointer hover:bg-red-200 transition">
                        {getIcon() && <span className="text-red-600">{getIcon()}</span>}
                      </div>
                    )}

                    {/* Tooltip - Bottom position */}
                    {hoveredIndex === index && checklistTooltips[index] && (
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50">
                        {checklistTooltips[index]}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -mb-1">
                          <div className="border-4 border-transparent border-b-gray-800"></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Connector - last item ke baad nahi */}
                  {index < checklistItems.length - 1 && (
                    <div className="w-8 h-0.5 bg-gray-200"></div>
                  )}
                </React.Fragment>
              );
            })
          ) : userDepartment !== 'hr' && userDepartment !== 'finance' ? (
            // Fallback static icons when no checklist data (not for HR)
            <>
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
            </>
          ) : null}
        </div>

        {/* Right Section - Notification + Profile */}
        <div className="flex items-center gap-4">
          {/* Notification */}
          <div className="relative">
            <div className="relative" onClick={() => setNotificationOpen(!notificationOpen)}>
              <img
                src={Notification}
                alt="Notifications"
                className="w-9 h-9 cursor-pointer hover:scale-110 transition-transform duration-200"
              />
              {(unreadCount + followUpNotifications.length) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] px-0.5 bg-blue-500 rounded-full text-white text-[10px] flex items-center justify-center">
                  {(unreadCount + followUpNotifications.length) > 99 ? '99+' : (unreadCount + followUpNotifications.length)}
                </span>
              )}
            </div>
            
            {notificationOpen && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-xl py-2 z-50 animate-fade-in border border-gray-100 max-h-[80vh] overflow-y-auto">
                <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <h3 className="font-semibold text-gray-700">Notifications</h3>
                  {notifications.length > 0 && (
                    <button 
                      onClick={clearAllNotifications}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                
                {(notifications.length === 0 && followUpNotifications.length === 0) ? (
                  <div className="px-4 py-8 text-center text-gray-500 text-sm">
                    No new notifications
                  </div>
                ) : (
                  <>
                    {followUpNotifications.map((item, idx) => (
                      <div
                        key={`followup-${item.id || item._id || idx}`}
                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 transition-colors"
                        onClick={() => openFollowUpDetailsModal(item)}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-orange-500 text-xs">⏰</span>
                            <span className="font-medium text-orange-700 text-sm">
                              {item?.title || "Follow up due"}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(item.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 font-medium truncate">
                          {item?.meta?.customerName || item?.meta?.contactPerson || "Customer"}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {item?.body || "A scheduled follow-up reminder is due now."}
                        </p>
                      </div>
                    ))}
                    {notifications.map((notif, idx) => (
                      <div 
                        key={`${notif.type}-${notif._id}-${idx}`}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                        onClick={() => {
                          if (notif.type === 'chat') {
                            setChatModalState({
                              isOpen: true,
                              loadId: notif.loadId,
                              receiverEmpId: notif.sender?.empId,
                              receiverName: notif.sender?.employeeName
                            });
                          } else if (notif.type === 'negotiation') {
                            setChatModalState({
                              isOpen: true,
                              loadId: notif.loadId,
                              receiverEmpId: 'shipper',
                              receiverName: 'Shipper'
                            });
                          }
                          setNotificationOpen(false);
                          clearNotification(notif._id, notif.type);
                        }}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-2">
                            {notif.type === 'chat' ? (
                              <span className="text-blue-500 text-xs">💬</span>
                            ) : (
                              <span className="text-green-500 text-xs">💰</span>
                            )}
                            <span className="font-medium text-blue-600 text-sm">
                              Load #{notif.loadId}
                              {notif.type === 'negotiation' && ` - ${notif.rate?.toLocaleString()}`}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(notif.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 font-medium truncate">
                          {notif.sender?.employeeName || 'User'}
                          {notif.type === 'negotiation' && ' (Negotiation)'}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-2">{notif.message}</p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Profile Section */}
          <div className="relative" id="profile-dropdown">
            <div 
              className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors"
              onClick={() => setProfileOpen(!profileOpen)}
            >
              <img
                src={userProfile.profileImage}
                alt="Profile"
                className="w-10 h-10 rounded-full border-2 border-gray-200 object-cover"
                onError={(e) => {
                  e.target.src = ProfileIcon; // Fallback to default icon if image fails to load
                }}
              />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-800">
                  {profileLoaded ? userProfile.name : (
                    <span className="animate-pulse bg-gray-200 rounded h-4 w-20 inline-block"></span>
                  )}
                </span>
                <span className="text-xs text-gray-500">
                  {profileLoaded ? userProfile.department : (
                    <span className="animate-pulse bg-gray-200 rounded h-3 w-16 inline-block"></span>
                  )}
                </span>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            
            {profileOpen && (
              <div className="absolute right-0 top-16 w-48 bg-white shadow-lg rounded-lg py-2 z-50 animate-fade-in border border-gray-100">
                {/* Profile Info Header */}
                <div className="px-4 py-2 border-b border-gray-100">
                  <div className="text-sm font-medium text-gray-800">{userProfile.name}</div>
                  <div className="text-xs text-gray-500">{userProfile.department}</div>
                  {userProfile.empId && (
                    <div className="text-xs text-gray-400">ID: {userProfile.empId}</div>
                  )}
                </div>
                
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/profile");
                  }}
                  className="cursor-pointer w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  My Profile
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global Load Chat Modal */}
      {chatModalState.isOpen && (
        <LoadChatModalCMT
          isOpen={chatModalState.isOpen}
          onClose={() => setChatModalState(prev => ({ ...prev, isOpen: false }))}
          loadId={chatModalState.loadId}
          receiverEmpId={chatModalState.receiverEmpId}
          receiverName={chatModalState.receiverName}
        />
      )}

      {followUpToast && (
        <div className="fixed top-4 right-4 z-[1200]">
          <div className="max-w-sm p-3 rounded-lg shadow-lg border bg-blue-50 border-blue-200 text-blue-800">
            <div className="flex items-start gap-2">
              <span className="text-base leading-none mt-0.5">⏰</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">
                  {followUpToast?.title || "Follow up due"}
                </p>
                <p className="text-xs truncate">
                  {followUpToast?.body || followUpToast?.meta?.customerName || followUpToast?.meta?.contactPerson || "A scheduled follow-up reminder is due."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFollowUpToast(null)}
                className="text-blue-700 hover:text-blue-900 text-sm font-semibold"
              >
                x
              </button>
            </div>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => openFollowUpDetailsModal(followUpToast)}
                className="text-xs px-2 py-1 rounded border border-blue-300 hover:bg-blue-100"
              >
                View details
              </button>
            </div>
          </div>
        </div>
      )}

      {followUpDetailModal ? (
        <div
          className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-black/45"
          role="dialog"
          aria-modal="true"
          aria-labelledby="follow-up-detail-title"
          onClick={() => setFollowUpDetailModal(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-xl">
              <h2 id="follow-up-detail-title" className="text-lg font-semibold text-gray-900 pr-2">
                {followUpDetailModal?.title || "Follow up due"}
              </h2>
              <button
                type="button"
                onClick={() => setFollowUpDetailModal(null)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3 text-sm text-gray-800">
              {followUpDetailModal?.body ? (
                <p className="text-gray-600 border-b border-gray-100 pb-3">{followUpDetailModal.body}</p>
              ) : null}
              {(() => {
                const m = followUpDetailModal?.meta && typeof followUpDetailModal.meta === "object"
                  ? followUpDetailModal.meta
                  : {};
                const scheduled = m.scheduledAt
                  ? new Date(m.scheduledAt).toLocaleString()
                  : null;
                const show = (v) => {
                  if (v == null) return "—";
                  const s = String(v).trim();
                  return s === "" ? "—" : s;
                };
                const row = (label, value) => (
                  <p className="break-words">
                    <span className="font-medium text-gray-700">{label}: </span>
                    <span className="text-gray-900">{show(value)}</span>
                  </p>
                );
                return (
                  <>
                    {row("Customer", m.customerName)}
                    {row("Phone", m.contactNumber || m.phone)}
                    {row("Email", m.emailAddress || m.email)}
                    {row("Contact person", m.contactPerson)}
                    {row("Address", m.address)}
                    {row("Follow-up notes", m.followUpNotes)}
                    {row("Scheduled for", scheduled)}
                    {row("Call ID", followUpDetailModal?.callId != null ? String(followUpDetailModal.callId) : null)}
                    {row(
                      "Notified at",
                      followUpDetailModal?.createdAt
                        ? new Date(followUpDetailModal.createdAt).toLocaleString()
                        : null
                    )}
                  </>
                );
              })()}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end rounded-b-xl">
              <button
                type="button"
                onClick={() => setFollowUpDetailModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Topbar;