import React, { useEffect, useState } from "react";
import Notification from "./assets/Icons super admin/Nav Bar/Blue/Notification.png";
import ProfileIcon from "./assets/Icons super admin/ProfileIcon.png";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import API_CONFIG from "./config/api.js";
import { useEnhancedNotifications } from "./hooks/useEnhancedNotifications";
import LoadChatModalCMT from "./Components/CMT/LoadChatModalCMT";

const Topbar = () => {
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);

  // Notification State
  const [notificationOpen, setNotificationOpen] = useState(false);
  const { 
    unreadCount, 
    notifications, 
    clearNotification, 
    clearAllNotifications 
  } = useEnhancedNotifications();

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
      try {
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        const userString = localStorage.getItem("user") || sessionStorage.getItem("user");
        
        if (!token || !userString) {
          return;
        }

        const userData = JSON.parse(userString);
        const empId = userData?.empId || userData?.employeeId;
        
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
    <div className="fixed top-6 left-[335px] right-15 h-16 z-50 flex items-center">
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
                  // CMT: Talktime, Truckers, Attendance, Bids
                  if (index === 0) {
                    // Phone icon for Talktime
                    return (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    );
                  } else if (index === 1) {
                    // Truck icon for Truckers  
                    return (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
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
                    // Document/Bid icon for Bids
                    return (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    );
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
          ) : (
            // Fallback static icons when no checklist data
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
          )}
        </div>

        {/* Right Section - Notification + Profile */}
        <div className="flex items-center gap-4">
          {/* Notification */}
          <div className="relative">
            <div className="relative" onClick={() => setNotificationOpen(!notificationOpen)}>
              <img
                src={Notification}
                alt="Notifications"
                className="w-6 h-6 cursor-pointer hover:scale-110 transition-transform duration-200"
              />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full text-white text-[10px] flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
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
                
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500 text-sm">
                    No new notifications
                  </div>
                ) : (
                  notifications.map((notif, idx) => (
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
                  ))
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
    </div>
  );
};

export default Topbar;