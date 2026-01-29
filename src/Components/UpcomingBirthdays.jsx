import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api.js';

const UpcomingBirthdays = ({ limit = 3, showAllDepartments = true, departmentFilter = null }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        const empRes = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/inhouseUser`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        });
        const empData = empRes.data?.employees || [];
        
        // Filter by department if specified
        const filteredEmployees = departmentFilter 
          ? empData.filter(emp => emp.department === departmentFilter)
          : empData;
          
        setEmployees(filteredEmployees);
      } catch (error) {
        console.error("Error fetching employees:", error);
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [departmentFilter]);

  const getUpcomingBirthdays = () => {
    const realBirthdays = employees
      .filter(emp => {
        // Filter only active employees
        if (emp.status !== 'active') return false;
        
        if (!emp.dateOfBirth) return false;
        const today = new Date();
        const birthday = new Date(emp.dateOfBirth);
        const nextBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
        
        // If birthday has passed this year, check next year
        if (nextBirthday < today) {
          nextBirthday.setFullYear(today.getFullYear() + 1);
        }
        
        const diffTime = nextBirthday - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30; // Show birthdays in next 30 days
      })
      .sort((a, b) => {
        const today = new Date();
        const birthdayA = new Date(a.dateOfBirth);
        const birthdayB = new Date(b.dateOfBirth);
        const nextBirthdayA = new Date(today.getFullYear(), birthdayA.getMonth(), birthdayA.getDate());
        const nextBirthdayB = new Date(today.getFullYear(), birthdayB.getMonth(), birthdayB.getDate());
        
        if (nextBirthdayA < today) nextBirthdayA.setFullYear(today.getFullYear() + 1);
        if (nextBirthdayB < today) nextBirthdayB.setFullYear(today.getFullYear() + 1);
        
        return nextBirthdayA - nextBirthdayB;
      });

    // Create sample data if needed
    const sampleData = [];
    if (realBirthdays.length < 3) {
      const sampleNames = ['John Smith', 'Sarah Johnson', 'Mike Wilson'];
      const sampleDepts = ['Sales', 'Marketing', 'HR'];
      const sampleDays = [5, 12, 18];
      
      for (let i = 0; i < (3 - realBirthdays.length); i++) {
        const today = new Date();
        const sampleBirthday = new Date(today.getTime() + sampleDays[i] * 24 * 60 * 60 * 1000);
        
        sampleData.push({
          _id: `sample-${i}`,
          employeeName: sampleNames[i],
          empName: sampleNames[i],
          department: sampleDepts[i],
          dateOfBirth: sampleBirthday.toISOString(),
          isSample: true
        });
      }
    }

    // Combine real and sample data, then sort by date
    const allBirthdays = [...realBirthdays, ...sampleData].sort((a, b) => {
      const today = new Date();
      const birthdayA = new Date(a.dateOfBirth);
      const birthdayB = new Date(b.dateOfBirth);
      const nextBirthdayA = new Date(today.getFullYear(), birthdayA.getMonth(), birthdayA.getDate());
      const nextBirthdayB = new Date(today.getFullYear(), birthdayB.getMonth(), birthdayB.getDate());
      
      if (nextBirthdayA < today) nextBirthdayA.setFullYear(today.getFullYear() + 1);
      if (nextBirthdayB < today) nextBirthdayB.setFullYear(today.getFullYear() + 1);
      
      return nextBirthdayA - nextBirthdayB;
    });

    return allBirthdays.slice(0, 3);
  };

  const upcomingBirthdays = getUpcomingBirthdays();

  if (loading) {
    return (
      <div className="bg-white border border-[#C8C8C8] rounded-[17.59px] p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Upcoming Birthdays</h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
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
    <div className="bg-white border border-[#C8C8C8] rounded-[17.59px] p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Upcoming Birthdays</h3>
      <div className="space-y-3">
        {/* Show all birthdays (real + sample) sorted by date */}
        {upcomingBirthdays.map((emp, index) => {
          const today = new Date();
          const birthday = new Date(emp.dateOfBirth);
          const nextBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
          
          if (nextBirthday < today) {
            nextBirthday.setFullYear(today.getFullYear() + 1);
          }
          
          const diffTime = nextBirthday - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const isToday = diffDays === 0;
          
          return (
            <div key={emp._id} className="flex items-center justify-between p-3 border border-gray-200 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                  <img 
                    src={emp.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.employeeName || emp.empName || 'User')}&background=6366f1&color=fff`}
                    alt={emp.employeeName || emp.empName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="w-full h-full bg-indigo-500 text-white text-sm font-semibold flex items-center justify-center" style={{display: 'none'}}>
                    {(emp.employeeName || emp.empName || 'U').charAt(0).toUpperCase()}
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{emp.employeeName || emp.empName}</p>
                  <p className="text-xs text-gray-500">{emp.department}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 mb-1">
                  {isToday && (
                    <span className="text-orange-500 text-sm">🎉</span>
                  )}
                  <span className="text-xs text-gray-500">
                    {isToday ? 'Birthday Today' : `${diffDays} days remaining`}
                  </span>
                </div>
                <p className="text-sm font-bold text-gray-900">
                  {birthday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UpcomingBirthdays;