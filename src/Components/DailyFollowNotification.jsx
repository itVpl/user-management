import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api.js';
import { Clock, Phone, AlertTriangle, FileText, ChevronDown } from 'lucide-react';

const DailyFollowNotification = ({ limit = 4 }) => {
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
              status: item.status,
              loadId: item.loadId || `#${Math.floor(Math.random() * 10000)}`
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

  const getTaskIcon = (type) => {
    switch(type?.toLowerCase()) {
      case 'call':
      case 'phone':
        return Phone;
      case 'confirm':
      case 'pickup':
        return AlertTriangle;
      case 'review':
        return FileText;
      default:
        return Clock;
    }
  };

  const getPriorityBadge = (diffDays, type) => {
    if (diffDays <= 0) {
      return { text: '20 mins overdue', color: 'bg-red-100 text-red-700' };
    } else if (type?.toLowerCase().includes('confirm')) {
      return { text: 'High', color: 'bg-orange-100 text-orange-700' };
    } else if (type?.toLowerCase().includes('call')) {
      return { text: 'Medium', color: 'bg-blue-100 text-blue-700' };
    } else {
      return { text: 'Low', color: 'bg-gray-100 text-gray-700' };
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Daily Follow Notification</h3>
          <button className="text-gray-400 text-sm flex items-center gap-1">
            View All <ChevronDown className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                  </div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Daily Follow Notification</h3>
        <button className="text-gray-400 text-sm flex items-center gap-1 hover:text-gray-600">
          View All <ChevronDown className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-0">
        {upcomingFollowUps.map((followUp, index) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const nextDate = new Date(followUp.nextFollowUpDate);
          nextDate.setHours(0, 0, 0, 0);
          
          const diffTime = nextDate - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          const TaskIcon = getTaskIcon(followUp.followUpType);
          const priority = getPriorityBadge(diffDays, followUp.followUpType);
          
          return (
            <div key={followUp.id} className={`flex items-center justify-between py-3 ${index < upcomingFollowUps.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <TaskIcon className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    {followUp.followUpType?.charAt(0).toUpperCase() + followUp.followUpType?.slice(1) || 'Follow-up'} - Load {followUp.loadId}
                  </p>
                </div>
              </div>
              <div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${priority.color}`}>
                  {priority.text}
                </span>
              </div>
            </div>
          );
        })}
        {upcomingFollowUps.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-gray-400" />
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