import React, { useState, useEffect } from 'react';
import diningTableImage from '../assets/dining_table_iamge.png';

const DinnerStatus = () => {
  // Load seats from localStorage or use default
  const getInitialSeats = () => {
    const savedSeats = localStorage.getItem('dinnerSeats');
    if (savedSeats) {
      return JSON.parse(savedSeats);
    }
    return {
      1: { isReserved: false, reservedBy: null, reservedAt: null }, // Top center
      2: { isReserved: false, reservedBy: null, reservedAt: null }, // Top left
      3: { isReserved: false, reservedBy: null, reservedAt: null }, // Top right
      4: { isReserved: false, reservedBy: null, reservedAt: null }, // Right center
      5: { isReserved: false, reservedBy: null, reservedAt: null }, // Right bottom
      6: { isReserved: false, reservedBy: null, reservedAt: null }, // Bottom center
      7: { isReserved: false, reservedBy: null, reservedAt: null }, // Bottom left
      8: { isReserved: false, reservedBy: null, reservedAt: null }  // Left center
    };
  };

  const [seats, setSeats] = useState(getInitialSeats);

  // Get current user from localStorage or use default
  const getCurrentUser = () => {
    const user = localStorage.getItem('currentUser') || sessionStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        return userData.empName || userData.name || "User123";
      } catch {
        return "User123";
      }
    }
    return "User123";
  };

  const [currentUser] = useState(getCurrentUser());
  const [message, setMessage] = useState("");
  const [userSelectedSeat, setUserSelectedSeat] = useState(null); // Track which seat current user selected

  // Save seats to localStorage whenever seats change
  const saveSeatsToStorage = (updatedSeats) => {
    localStorage.setItem('dinnerSeats', JSON.stringify(updatedSeats));
  };

  // Initialize user's selected seat when component loads
  useEffect(() => {
    const userSeat = Object.entries(seats).find(([_, seat]) => seat.reservedBy === currentUser);
    if (userSeat) {
      setUserSelectedSeat(parseInt(userSeat[0]));
    }
  }, [currentUser]);

  const handleSeatClick = (seatNumber) => {
    console.log("Clicked seat:", seatNumber); // Debug log
    const seat = seats[seatNumber];
    
    // If seat is reserved by current user, allow unselecting
    if (seat.isReserved && seat.reservedBy === currentUser) {
      const updatedSeats = {
        ...seats,
        [seatNumber]: {
          isReserved: false,
          reservedBy: null,
          reservedAt: null
        }
      };
      setSeats(updatedSeats);
      saveSeatsToStorage(updatedSeats);
      setUserSelectedSeat(null);
      setMessage(`Seat ${seatNumber} unselected successfully!`);
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    
    // If seat is reserved by someone else, show message
    if (seat.isReserved && seat.reservedBy !== currentUser) {
      setMessage("This seat is already reserved by another user.");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    // If user already has a seat selected, unselect it first
    let updatedSeats = { ...seats };
    if (userSelectedSeat && userSelectedSeat !== seatNumber) {
      updatedSeats = {
        ...updatedSeats,
        [userSelectedSeat]: {
          isReserved: false,
          reservedBy: null,
          reservedAt: null
        }
      };
    }

    // Reserve the new seat
    updatedSeats = {
      ...updatedSeats,
      [seatNumber]: {
        isReserved: true,
        reservedBy: currentUser,
        reservedAt: new Date().toLocaleTimeString()
      }
    };

    setSeats(updatedSeats);
    saveSeatsToStorage(updatedSeats);
    setUserSelectedSeat(seatNumber);
    setMessage(`Seat ${seatNumber} reserved successfully!`);
    setTimeout(() => setMessage(""), 3000);
  };

  const getSeatPosition = (seatNumber) => {
    const positions = {
      1: { top: '20%', left: '50%', transform: 'translateX(-50%)' }, // Top center (short side)
      2: { top: '35%', left: '40%', transform: 'translateX(-50%)' }, // Top left (long side)
      3: { top: '35%', right: '40%', transform: 'translateX(50%)' }, // Top right (long side)
      4: { top: '50%', right: '38.6%', transform: 'translateY(-50%)' }, // Right center (long side)
      5: { bottom: '47%', left: '40%', transform: 'translateX(-50%)' }, // Bottom center (short side)
      6: { bottom: '35%', left: '40%', transform: 'translateX(-50%)' }, // Bottom left (long side)
      7: { bottom: '35%', right: '40%', transform: 'translateX(50%)' }, // Bottom right (long side)
      8: { top: '78%', left: '48.5%', transform: 'translateY(-50%)' } // Left center (long side)
    };
    return positions[seatNumber];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200 p-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-gray-800 mb-4">🍽️ Dinner Reservation</h1>
        <p className="text-xl text-gray-600">Select your seat for tonight's dinner (8 seats available)</p>
      </div>

      {/* Message Display */}
      {message && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className={`px-8 py-4 rounded-xl shadow-2xl text-lg font-semibold ${
            message.includes('reserved successfully') 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            {message}
          </div>
        </div>
      )}

      {/* Dinner Table Container */}
      <div className="relative w-full max-w-6xl mx-auto h-[600px] bg-black rounded-3xl shadow-2xl border-4 border-gray-800">
        
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

        {/* Simple Click Areas for Chairs */}
        {Object.entries(seats).map(([seatNumber, seatData]) => {
          const position = getSeatPosition(parseInt(seatNumber));
          return (
            <div
              key={seatNumber}
              className="absolute cursor-pointer z-10"
              style={{
                ...position,
                width: '30px',
                height: '30px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)', // Slightly visible for debugging
                borderRadius: '50%'
              }}
              onClick={() => {
                console.log("Click detected on seat:", seatNumber);
                handleSeatClick(parseInt(seatNumber));
              }}
            >
              {/* Simple Tick Mark for Selected Chairs */}
              {seatData.isReserved && (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white ${
                  seatData.reservedBy === currentUser ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-16 max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Seat Status Legend</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 bg-gray-300 border-2 border-gray-500 rounded-lg flex items-center justify-center">
                <span className="text-gray-600 text-sm">🪑</span>
              </div>
              <span className="text-gray-700 font-semibold">Available Seat</span>
            </div>
            <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl">
              <div className="w-8 h-8 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-gray-700 font-semibold">Your Selected Seat</span>
            </div>
            <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl">
              <div className="w-8 h-8 bg-red-500 border-2 border-white rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-gray-700 font-semibold">Reserved by Others</span>
            </div>
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 bg-gray-800 border-2 border-gray-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">📐</span>
              </div>
              <span className="text-gray-700 font-semibold">Table Layout</span>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-12 max-w-6xl mx-auto">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-lg">
          <h4 className="font-bold text-blue-800 mb-4 text-xl">📋 How to Reserve Your Seat:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ul className="text-blue-700 space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Click on any green chair to reserve it
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Red chairs are already taken by others
              </li>
            </ul>
            <ul className="text-blue-700 space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                You can only reserve one seat at a time
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Reserved seats show user name and time
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DinnerStatus;
