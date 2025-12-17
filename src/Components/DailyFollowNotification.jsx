import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api.js';
import { Bell } from 'lucide-react';

const DailyFollowNotification = ({ limit = 3 }) => {
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFollowUps = async () => {
      try {
        const token = sessionStorage.getItem("token") || localStorage.getItem("token") || 
                      sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
        
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/sales-followup/my-followups`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          withCredentials: true
        });

        if (response.data.success) {
          // Transform API data
          const transformedData = response.data.data.map((item) => {
            const latestFollowUp = item.followUps?.length ? item.followUps[item.followUps.length - 1] : null;
            
            // Next follow-up date (from latest history)
            const nextFollowUpDate = latestFollowUp?.nextFollowUpDate
              ? new Date(latestFollowUp.nextFollowUpDate).toISOString().split('T')[0]
              : '';
            
            // Type: prefer latest history type, else fallback to root field
            const followUpType = (latestFollowUp?.followUpType || item.followUpType || '').trim();
            
            return {
              id: item._id,
              customerName: item.customerName,
              customerPhone: item.phone,
              customerEmail: item.email,
              followUpType,
              nextFollowUpDate,
              status: item.status
            };
          });

          setFollowUps(transformedData);
        }
      } catch (error) {
        console.error("Error fetching follow-ups:", error);
        setFollowUps([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowUps();
  }, []);

  const getUpcomingFollowUps = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return followUps
      .filter(followUp => {
        // Only show follow-ups with nextFollowUpDate
        if (!followUp.nextFollowUpDate) return false;
        
        // Filter out cancelled follow-ups
        if (followUp.status === 'cancelled') return false;
        
        const nextDate = new Date(followUp.nextFollowUpDate);
        nextDate.setHours(0, 0, 0, 0);
        
        // Show follow-ups due today, overdue (up to 7 days), or in the next 7 days
        const diffTime = nextDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays >= -7 && diffDays <= 7;
      })
      .sort((a, b) => {
        const dateA = new Date(a.nextFollowUpDate);
        const dateB = new Date(b.nextFollowUpDate);
        return dateA - dateB;
      })
      .slice(0, limit);
  };

  const upcomingFollowUps = getUpcomingFollowUps();

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Daily Follow Notification</h3>
          </div>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="h-4 bg-gray-200 rounded w-12 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-8"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-800">Daily Follow Notification</h3>
        </div>
      </div>
      <div className="space-y-3">
        {upcomingFollowUps.map((followUp) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const nextDate = new Date(followUp.nextFollowUpDate);
          nextDate.setHours(0, 0, 0, 0);
          
          const diffTime = nextDate - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          const isToday = diffDays === 0;
          const isOverdue = diffDays < 0;
          
          return (
            <div 
              key={followUp.id} 
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                isToday 
                  ? 'bg-red-50 border-red-200 hover:bg-red-100' 
                  : isOverdue
                  ? 'bg-orange-50 border-orange-200 hover:bg-orange-100'
                  : 'bg-blue-50 border-blue-100 hover:bg-blue-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                  isToday 
                    ? 'bg-red-500' 
                    : isOverdue
                    ? 'bg-orange-500'
                    : 'bg-blue-500'
                }`}>
                  {followUp.customerName?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="font-medium text-gray-800">{followUp.customerName || 'N/A'}</p>
                  <p className="text-sm text-gray-600">
                    {followUp.followUpType ? followUp.followUpType.charAt(0).toUpperCase() + followUp.followUpType.slice(1) : 'Follow-up'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-medium ${
                  isToday 
                    ? 'text-red-600' 
                    : isOverdue
                    ? 'text-orange-600'
                    : 'text-blue-600'
                }`}>
                  {isToday ? 'Today' : isOverdue ? `Overdue ${Math.abs(diffDays)}d` : `${diffDays} day${diffDays > 1 ? 's' : ''}`}
                </p>
                <p className="text-xs text-gray-500">
                  {nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          );
        })}
        {upcomingFollowUps.length === 0 && (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">No upcoming follow-ups</p>
            <p className="text-gray-400 text-xs">in the next 7 days</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyFollowNotification;

