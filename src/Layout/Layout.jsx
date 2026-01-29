// src/Layout/Layout.js
import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../Components/Sidebar";
import Topbar from "../TopBar";
import DOAssignmentPopup from "../Components/CMT/DOAssignmentPopup";
import LoadAssignmentPopup from "../Components/CMT/LoadAssignmentPopup";
import FoodPreferenceModal from "../Components/FoodPreferenceModal";
import RightSideDrawer from "../Components/common/RightSideDrawer";
import { useDOAssignmentNotification } from "../hooks/useDOAssignmentNotification";
import { useAssignmentNotification } from "../hooks/useAssignmentNotification";
import API_CONFIG from "../config/api.js";
import { 
  Settings, 
  BarChart3, 
  Users, 
  Calendar,
  TrendingUp,
  Target,
  RefreshCw,
  Home,
  MessageCircle,
  Bell,
  Plus,
  Clock,
  Phone
} from "lucide-react";

const Layout = () => {
  const [user, setUser] = useState(null);
  const [isCMTUser, setIsCMTUser] = useState(false);
  const [isSalesUser, setIsSalesUser] = useState(false);
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [followUps, setFollowUps] = useState([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(false);
  const [expandedFollowUpId, setExpandedFollowUpId] = useState(null);
  const [fullFollowUpData, setFullFollowUpData] = useState({});
  const [totalFollowUpsCount, setTotalFollowUpsCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get user data and check if CMT user
  useEffect(() => {
    const userString = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (userString) {
      try {
        const userData = JSON.parse(userString);
        setUser(userData);
        
        // Check department - handle both string and object formats
        const department = typeof userData?.department === 'string' 
          ? userData.department 
          : userData?.department?.name || '';
        
        const departmentLower = department.toLowerCase();
        const isCMT = departmentLower === 'cmt' || departmentLower.includes('cmt');
        const isSales = departmentLower === 'sales' || departmentLower.includes('sales');

        setIsCMTUser(isCMT);
        setIsSalesUser(isSales);
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  // Fetch follow-ups for Sales users
  const fetchFollowUps = async () => {
    try {
      setFollowUpsLoading(true);
      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken") ||
                    sessionStorage.getItem("token") || localStorage.getItem("token");
      
      if (!token) {
        setFollowUpsLoading(false);
        return;
      }

      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/sales-followup/my-followups`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      });

      if (response.data.success) {
        // Store total count
        setTotalFollowUpsCount(response.data.data.length);

        // Store full data for threading view
        const fullDataMap = {};
        response.data.data.forEach((item) => {
          fullDataMap[item._id] = item;
        });
        setFullFollowUpData(fullDataMap);

        // Transform API data - get latest follow-ups only (first 5)
        const transformedData = response.data.data.slice(0, 5).map((item) => {
          const latestFollowUp = item.followUps?.length ? item.followUps[item.followUps.length - 1] : null;
          
          const nextFollowUpDate = latestFollowUp?.nextFollowUpDate
            ? new Date(latestFollowUp.nextFollowUpDate).toISOString().split('T')[0]
            : '';
          
          const followUpType = (latestFollowUp?.followUpType || item.followUpType || '').trim();
          
          return {
            id: item._id,
            customerName: item.customerName,
            customerPhone: item.phone,
            followUpType: followUpType || 'General',
            nextFollowUpDate,
            status: item.status || 'Pending',
            hasMultipleFollowUps: (item.followUps?.length || 0) > 1 // Check if has multiple follow-ups
          };
        });

        setFollowUps(transformedData);
      }
    } catch (error) {
      console.error("Error fetching follow-ups:", error);
    } finally {
      setFollowUpsLoading(false);
    }
  };

  useEffect(() => {
    if (isSalesUser) {
      fetchFollowUps();
    }
  }, [isSalesUser]);

  // Check for food preference
  useEffect(() => {
    if (user) {
      const today = new Date().toISOString().split('T')[0];
      const empId = user.empId || user.employeeId || 'unknown';
      const hasPreference = localStorage.getItem(`food_preference_${empId}_${today}`);
      
      if (!hasPreference) {
        setShowFoodModal(true);
      }
    }
  }, [user]);

  // Use both assignment notification hooks only for CMT users
  const { newDOAssignment, clearNotification: clearDONotification } = useDOAssignmentNotification(
    user?.empId || user?.employeeId || null,
    isCMTUser
  );

  const { newAssignment, clearNotification: clearLoadNotification } = useAssignmentNotification(
    user?.empId || user?.employeeId || null,
    isCMTUser
  );

  const handleCloseDOPopup = () => {
    clearDONotification();
  };

  const handleCloseLoadPopup = () => {
    clearLoadNotification();
  };

  // Debug logs
  useEffect(() => {
    if (isCMTUser) {

    }
  }, [isCMTUser, user, newDOAssignment, newAssignment]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Topbar />
      <main className="ml-20 md:ml-[296px] mr-5 pt-24 px-4 pb-4"> {/* Increased pt-20 to pt-24 to account for TopBar at top-6 + h-16 */}
        <Outlet />
      </main>
{/*      
      {showFoodModal && (
        <FoodPreferenceModal onClose={() => setShowFoodModal(false)} user={user} />
      )}jhjhjh */}

      {/* DO Assignment Popup for CMT users */}
      {isCMTUser && newDOAssignment && (
        <DOAssignmentPopup 
          assignment={newDOAssignment} 
          onClose={handleCloseDOPopup}
          hasBothPopups={!!(newDOAssignment && newAssignment)}
        />
      )}
      
      {/* Load Assignment Popup - Show if assignment exists and user is CMT */}
      {isCMTUser && newAssignment && (
        <LoadAssignmentPopup 
          assignment={newAssignment} 
          onClose={handleCloseLoadPopup}
          hasBothPopups={!!(newDOAssignment && newAssignment)}
        />
      )}
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <>
          {newAssignment && !isCMTUser && (
            <div className="fixed top-4 right-4 bg-yellow-500 text-black p-2 rounded z-[99999] text-xs max-w-xs">
              ⚠️ Debug: Assignment found but isCMTUser={String(isCMTUser)}. 
              Showing popup anyway in dev mode.
            </div>
          )}
          {isCMTUser && newAssignment && (
            <div className="fixed top-4 right-4 bg-green-500 text-white p-2 rounded z-[99999] text-xs">
              ✅ Load Assignment Popup should be visible
            </div>
          )}
        </>
      )}

      {/* Right Side Drawer for Sales Department - Available on all screens */}
      {isSalesUser && (
        <RightSideDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(!isDrawerOpen)}
          title="Quick Actions"
          width={30}
          icon={Plus}
          onRefresh={fetchFollowUps}
        >
          <div className="space-y-5">
            {/* FollowUp - Simple & Professional */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
                  <Clock size={18} className="text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">
                  FollowUp
                </h3>
              </div>
              
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {followUpsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : followUps.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No follow-ups found</p>
                  </div>
                ) : (
                  followUps.map((followUp) => {
                    const isToday = followUp.nextFollowUpDate === new Date().toISOString().split('T')[0];
                    const isOverdue = followUp.nextFollowUpDate && new Date(followUp.nextFollowUpDate) < new Date() && !isToday;
                    const isExpanded = expandedFollowUpId === followUp.id;
                    const fullData = fullFollowUpData[followUp.id];
                    const followUpHistory = fullData?.followUps || [];
                    const hasMultiple = followUp.hasMultipleFollowUps && followUpHistory.length > 1;
                    
                    return (
                      <div key={followUp.id} className="space-y-2">
                        <div
                          onClick={() => {
                            if (hasMultiple) {
                              setExpandedFollowUpId(isExpanded ? null : followUp.id);
                            } else {
                              navigate('/daily-follow-up');
                              setIsDrawerOpen(false);
                            }
                          }}
                          className={`cursor-pointer bg-gray-50 hover:bg-gray-100 rounded-lg p-3 border transition-all duration-200 ${
                            isOverdue 
                              ? 'border-red-200 bg-red-50/50' 
                              : isToday
                              ? 'border-blue-200 bg-blue-50/50'
                              : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <h4 className="font-medium text-gray-800 text-sm truncate">{followUp.customerName}</h4>
                                {isOverdue && (
                                  <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-medium rounded">Overdue</span>
                                )}
                                {isToday && (
                                  <span className="px-1.5 py-0.5 bg-blue-500 text-white text-xs font-medium rounded">Today</span>
                                )}
                                {hasMultiple && (
                                  <span className="px-1.5 py-0.5 bg-gray-600 text-white text-xs font-medium rounded">
                                    {followUpHistory.length}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-1.5 mb-1.5 text-xs text-gray-600">
                                <Phone size={12} />
                                <span className="truncate">{followUp.customerPhone || 'N/A'}</span>
                              </div>
                              
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                  followUp.followUpType === 'Call' 
                                    ? 'bg-blue-100 text-blue-700'
                                    : followUp.followUpType === 'Email'
                                    ? 'bg-green-100 text-green-700'
                                    : followUp.followUpType === 'Meeting'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {followUp.followUpType}
                                </span>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                  followUp.status === 'Completed'
                                    ? 'bg-green-100 text-green-700'
                                    : followUp.status === 'Pending'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {followUp.status}
                                </span>
                              </div>
                              
                              {followUp.nextFollowUpDate && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                  <Clock size={11} />
                                  <span>Next: {new Date(followUp.nextFollowUpDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                              )}
                            </div>
                            {hasMultiple && (
                              <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Threading View - Expanded Follow-up History */}
                        {isExpanded && hasMultiple && (
                          <div className="ml-3 pl-3 border-l-2 border-gray-300 space-y-2 mt-2">
                            {followUpHistory.map((historyItem, index) => {
                              const historyDate = historyItem.nextFollowUpDate 
                                ? new Date(historyItem.nextFollowUpDate).toISOString().split('T')[0]
                                : null;
                              const historyIsToday = historyDate === new Date().toISOString().split('T')[0];
                              const historyIsOverdue = historyDate && new Date(historyDate) < new Date() && !historyIsToday;
                              
                              return (
                                <div
                                  key={historyItem._id || index}
                                  className="bg-white rounded p-2.5 border border-gray-200"
                                >
                                  <div className="flex items-start gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                                      historyIsOverdue ? 'bg-red-500' : historyIsToday ? 'bg-blue-500' : 'bg-gray-400'
                                    }`}></div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                                          historyItem.followUpType === 'Call' 
                                            ? 'bg-blue-100 text-blue-700'
                                            : historyItem.followUpType === 'Email'
                                            ? 'bg-green-100 text-green-700'
                                            : historyItem.followUpType === 'Meeting'
                                            ? 'bg-purple-100 text-purple-700'
                                            : 'bg-gray-100 text-gray-700'
                                        }`}>
                                          {historyItem.followUpType || 'General'}
                                        </span>
                                        {historyIsOverdue && (
                                          <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-medium rounded">Overdue</span>
                                        )}
                                        {historyIsToday && (
                                          <span className="px-1.5 py-0.5 bg-blue-500 text-white text-xs font-medium rounded">Today</span>
                                        )}
                                      </div>
                                      
                                      {historyItem.followUpNotes && (
                                        <p className="text-xs text-gray-600 mb-1 line-clamp-2">{historyItem.followUpNotes}</p>
                                      )}
                                      
                                      {historyDate && (
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                          <Clock size={10} />
                                          <span>{new Date(historyDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                
                {followUps.length > 0 && (
                  <button
                    onClick={() => {
                      navigate('/daily-follow-up');
                      setIsDrawerOpen(false);
                    }}
                    className="w-full mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 font-medium text-sm shadow-sm hover:shadow"
                  >
                    <Clock size={14} />
                    <span>View All FollowUps</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Stats - Simple & Professional */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center border border-purple-100">
                  <BarChart3 size={18} className="text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Quick Stats
                </h3>
              </div>
              <div className="space-y-2">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Current Page</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                      {location.pathname.split('/').pop() || 'Dashboard'}
                    </span>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Follow-ups</span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                      {totalFollowUpsCount}
                    </span>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Today's Follow-ups</span>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                      {followUps.filter(fu => {
                        const today = new Date().toISOString().split('T')[0];
                        return fu.nextFollowUpDate === today;
                      }).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions - Simple & Professional */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center border border-green-100">
                  <Target size={18} className="text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Quick Actions
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    window.location.reload();
                  }}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 font-medium text-sm shadow-sm hover:shadow"
                >
                  <RefreshCw size={14} />
                  <span>Refresh</span>
                </button>
                
                <button
                  onClick={() => {
                    navigate('/profile');
                    setIsDrawerOpen(false);
                  }}
                  className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 font-medium text-sm shadow-sm hover:shadow"
                >
                  <Users size={14} />
                  <span>Profile</span>
                </button>
              </div>
            </div>
          </div>
        </RightSideDrawer>
      )}
    </div>
  );
};

export default Layout;
