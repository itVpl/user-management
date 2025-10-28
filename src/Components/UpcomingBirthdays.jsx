import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api.js';

const UpcomingBirthdays = ({ limit = 3, showAllDepartments = true, departmentFilter = null }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const empRes = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/inhouseUser`);
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
    return employees
      .filter(emp => {
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
      })
      .slice(0, limit);
  };

  const upcomingBirthdays = getUpcomingBirthdays();

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800">Upcoming Birthdays</h3>
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
          <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-800">
            Upcoming Birthdays
            {departmentFilter && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                ({departmentFilter} Department)
              </span>
            )}
          </h3>
        </div>
      </div>
      <div className="space-y-3">
        {upcomingBirthdays.map((emp) => {
          const today = new Date();
          const birthday = new Date(emp.dateOfBirth);
          const nextBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
          
          if (nextBirthday < today) {
            nextBirthday.setFullYear(today.getFullYear() + 1);
          }
          
          const diffTime = nextBirthday - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          return (
            <div key={emp._id} className="flex items-center justify-between p-3 bg-pink-50 rounded-lg border border-pink-100 hover:bg-pink-100 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {emp.employeeName?.charAt(0) || emp.empName?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="font-medium text-gray-800">{emp.employeeName || emp.empName}</p>
                  <p className="text-sm text-gray-600">{emp.department}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-pink-600">
                  {diffDays === 0 ? 'Today' : `${diffDays} day${diffDays > 1 ? 's' : ''}`}
                </p>
                <p className="text-xs text-gray-500">
                  {birthday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          );
        })}
        {upcomingBirthdays.length === 0 && (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">No upcoming birthdays</p>
            <p className="text-gray-400 text-xs">in the next 30 days</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingBirthdays;
