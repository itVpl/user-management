import React, { useState, useEffect } from 'react';
import axios from 'axios';
import alertify from 'alertifyjs';
import diningTableImage from '../assets/dinnerChaIT.png';

const DinnerStatus = () => {
  // Initialize seats state
  const [seats, setSeats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Get current user from sessionStorage (backend ready)
  const getCurrentUser = () => {
    const user = sessionStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        return {
          name: userData.empName || userData.name || "User123",
          empId: userData.empId,
          department: userData.department || userData.dept || "General"
        };
      } catch {
        return {
          name: "User123",
          empId: null,
          department: "General"
        };
      }
    }
    return {
      name: "User123",
      empId: null,
      department: "General"
    };
  };

  const [currentUser] = useState(getCurrentUser());
  const [userSelectedSeat, setUserSelectedSeat] = useState(null); // Track which seat current user selected
  const [counters, setCounters] = useState({ available: 0, occupied: 0, total: 0 });

  // Check department-wise seat limit (max 3 users per department)
  const checkDepartmentLimit = (department) => {
    const departmentSeats = Object.values(seats).filter(seat => 
      seat.isOccupied && seat.department === department
    );
    return departmentSeats.length < 3; // Max 3 users per department
  };


  // Fetch seat status from API
  const fetchSeatStatus = async (isBackgroundRefresh = false) => {
    try {
      // Only show loading for initial load, not for background refreshes
      if (!isBackgroundRefresh) {
        setLoading(true);
      }
      setError(null);
      
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const response = await axios.get('https://vpl-liveproject-1.onrender.com/api/v1/dinner-seats/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        const { seatStatus, counters } = response.data.data;
        
        // Convert API response to our state format
        const seatsData = {};
        seatStatus.forEach(seat => {
          seatsData[seat.seatNumber] = {
            isOccupied: seat.isOccupied,
            isReserved: seat.isOccupied, // Keep for backward compatibility
            reservedBy: seat.userName,
            reservedAt: seat.occupiedAt,
            userEmpId: seat.userEmpId,
            department: seat.department
          };
        });
        
        setSeats(seatsData);
        setCounters(counters);
        setLastUpdated(new Date().toLocaleTimeString());
        
        // Find user's selected seat
        const userSeat = Object.entries(seatsData).find(([_, seat]) => seat.isOccupied && seat.reservedBy === currentUser.name);
        if (userSeat) {
          setUserSelectedSeat(parseInt(userSeat[0]));
        } else {
          setUserSelectedSeat(null);
        }
      }
    } catch (error) {
      console.error('Error fetching seat status:', error);
      if (!isBackgroundRefresh) {
        setError('Failed to load seat status. Please try again.');
      }
    } finally {
      if (!isBackgroundRefresh) {
        setLoading(false);
      }
    }
  };

  // Fetch seat status on component mount
  useEffect(() => {
    fetchSeatStatus();
  }, []);

  // Auto-refresh seat status every 5 seconds to sync with other users
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSeatStatus(true); // Background refresh - no loading spinner
    }, 5000); // Refresh every 5 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  // Handle seat reservation
  const handleSeatReservation = async (seatNumber) => {
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const user = sessionStorage.getItem('user');
      const userData = JSON.parse(user || '{}');
      
      // Check if user has empId
      if (!userData.empId) {
        alertify.error("User ID not found. Please login again.");
        return;
      }

      // Check department limit (max 3 users per department)
      const userDepartment = userData.department;
      if (!checkDepartmentLimit(userDepartment)) {
        alertify.error(`Your department (${userDepartment}) has already reached the maximum limit of 3 seats.`);
        return;
      }

      const response = await axios.post('https://vpl-liveproject-1.onrender.com/api/v1/dinner-seats/reserve', {
        seatNumber: seatNumber,
        empId: userData.empId,
        department: userDepartment
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        // Update local state immediately for better UX
        const updatedSeats = { ...seats };
        updatedSeats[seatNumber] = {
          isOccupied: true,
          isReserved: true,
          reservedBy: currentUser.name,
          reservedAt: new Date().toLocaleTimeString(),
          userEmpId: userData.empId,
          department: userData.department
        };
        setSeats(updatedSeats);
        setUserSelectedSeat(seatNumber);
        
        alertify.success(`Seat ${seatNumber} reserved successfully!`);
      }
    } catch (error) {
      console.error('Error reserving seat:', error);
      if (error.response?.data?.message) {
        alertify.error(`Failed to reserve seat: ${error.response.data.message}`);
      } else {
        alertify.error('Failed to reserve seat. Please try again.');
      }
    }
  };

  // Handle seat cancellation
  const handleSeatCancellation = async () => {
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const user = sessionStorage.getItem('user');
      const userData = JSON.parse(user || '{}');
      
      // Check if user has empId
      if (!userData.empId) {
        alertify.error("User ID not found. Please login again.");
        return;
      }

      const response = await axios.post('https://vpl-liveproject-1.onrender.com/api/v1/dinner-seats/cancel', {
        empId: userData.empId
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        // Update local state - find and clear user's reserved seat
        const updatedSeats = { ...seats };
        Object.keys(updatedSeats).forEach(seatNum => {
          if (updatedSeats[seatNum].reservedBy === currentUser.name) {
            updatedSeats[seatNum] = {
              isOccupied: false,
              isReserved: false,
              reservedBy: null,
              reservedAt: null,
              userEmpId: null,
              department: null
            };
          }
        });
        setSeats(updatedSeats);
        setUserSelectedSeat(null);
        
        alertify.success('Your reservation has been cancelled successfully!');
      }
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      if (error.response?.data?.message) {
        alertify.error(`Failed to cancel reservation: ${error.response.data.message}`);
      } else {
        alertify.error('Failed to cancel reservation. Please try again.');
      }
    }
  };

  const handleSeatClick = async (seatNumber) => {
    console.log("Clicked seat:", seatNumber); // Debug log
    const seat = seats[seatNumber];
    
    // Check if seat is occupied (isOccupied is true)
    if (seat.isOccupied === true) {
      // Get current user's empId to check ownership
      const user = sessionStorage.getItem('user');
      const userData = JSON.parse(user || '{}');
      const currentUserEmpId = userData.empId;
      
      // Check if current user owns this seat
      if (seat.userEmpId === currentUserEmpId) {
        // User clicked on their own occupied seat - allow cancellation
        await handleSeatCancellation();
      } else {
        // Someone else's seat - show message
        alertify.warning("This seat is already reserved by another user.");
      }
      return;
    }
    
    // Only allow reservation if seat is not occupied (isOccupied is null or false)
    if (seat.isOccupied === false || seat.isOccupied === null || !seat.isOccupied) {
      await handleSeatReservation(seatNumber);
    } else {
      alertify.warning("This seat is not available for reservation.");
    }
  };

  const getSeatPosition = (seatNumber) => {
    const positions = {
      1: { top: '20%', left: '50%', transform: 'translateX(-50%)' }, 
      2: { top: '38%', left: '40%', transform: 'translateX(-50%)' }, 
      3: { top: '38%', right: '40%', transform: 'translateX(50%)' }, 
      // 4: { top: '50%', right: '38.6%', transform: 'translateY(-50%)' }, 
      // 5: { bottom: '47%', left: '40%', transform: 'translateX(-50%)' }, 
      4: { bottom: '38%', left: '40%', transform: 'translateX(-50%)' }, 
      5: { bottom: '38%', right: '40%', transform: 'translateX(50%)' }, 
      6: { top: '78%', left: '48.5%', transform: 'translateY(-50%)' } 
    };
    return positions[seatNumber];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200 p-4">
      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes draw {
          0% {
            stroke-dasharray: 0 100;
          }
          100% {
            stroke-dasharray: 100 0;
          }
        }
        .animate-draw {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: draw 0.6s ease-in-out forwards;
        }
        @keyframes bounce-in {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.8;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out;
        }
        @keyframes fade-in-up {
          0% {
            transform: translateY(20px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out;
        }
      `}</style>
      {/* Header */}
      <div className="text-center mb-1 animate-fade-in-up">
        <h3 className="text-3xl font-bold text-gray-800 mb-1 transition-all duration-300 hover:scale-105">🍽️ Dinner Reservation</h3>
        <p className="text-lg text-gray-600 transition-all duration-300">
          Select your seat for tonight's dinner 
          {/* {counters.total > 0 && ` (${counters.available} available, ${counters.occupied} occupied)`} */}
        </p>
        {/* <div className="mt-4 flex justify-center gap-4">
          {userSelectedSeat && (
            <button 
              onClick={handleSeatCancellation}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel My Reservation
            </button>
          )}
        </div> */}
      </div>


      {/* Loading State */}
      {loading && (
        <div className="text-center py-12 animate-fade-in-up">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-lg text-gray-600 animate-pulse">Loading seat status...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12 animate-fade-in-up">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg max-w-md mx-auto transition-all duration-300 hover:shadow-lg">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
            <button 
              onClick={fetchSeatStatus}
              className="mt-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-md"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Dinner Table Container */}
      {!loading && !error && (
        <div className="relative w-full max-w-6xl mx-auto h-[600px] bg-black rounded-3xl shadow-2xl border-4 border-gray-800 animate-fade-in-up transition-all duration-500 hover:shadow-3xl">
        
        {/* Center Table - Using Your Image */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <img 
              src={diningTableImage} 
              alt="Dining Table Layout" 
              className="w-96 h-auto opacity-90"
            />
          </div>
        </div>

        {/* Animated Click Areas for Chairs */}
        {Object.entries(seats).map(([seatNumber, seatData]) => {
          const position = getSeatPosition(parseInt(seatNumber));
          return (
            <div
              key={seatNumber}
              className="absolute cursor-pointer z-10 group transition-all duration-300 hover:scale-110"
              style={{
                ...position,
                width: '30px',
                height: '30px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)', // Slightly visible for debugging
                borderRadius: '50%'
              }}
              onClick={() => {
                console.log("Click detected on seat:", seatNumber);
                handleSeatClick(parseInt(seatNumber));
              }}
            >
              {/* Animated Tick Mark for Selected Chairs */}
              {seatData.isOccupied && (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-all duration-500 transform animate-bounce-in ${
                  seatData.reservedBy === currentUser ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                }`}>
                  <svg 
                    className="w-4 h-4 text-white transition-all duration-300 group-hover:scale-110" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={3} 
                      d="M5 13l4 4L19 7"
                      className="animate-draw"
                    />
                  </svg>
                </div>
              )}
              
              {/* Hover Effect for Empty Seats */}
              {!seatData.isOccupied && (
                <div className="w-8 h-8 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
                </div>
              )}
              
              {/* Username Tooltip for Reserved Seats */}
              {seatData.isOccupied && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap z-30 pointer-events-none">
                  <div className="font-semibold">{seatData.reservedBy}</div>
                  <div className="text-xs text-gray-300">Seat {seatNumber}</div>
                  <div className="text-xs text-blue-300">{seatData.department}</div>
                  {/* Arrow pointing down */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90"></div>
                </div>
              )}
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
};

export default DinnerStatus;
