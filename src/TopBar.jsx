import React, { useEffect, useState } from "react";
import Notification from "./assets/Icons super admin/Nav Bar/Blue/Notification.png";
import ProfileIcon from "./assets/Icons super admin/ProfileIcon.png";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const BREAK_DURATION = 60 * 60; // 60 mins in seconds

const Topbar = () => {
  const navigate = useNavigate();
  const [loginTime, setLoginTime] = useState(() => {
    const saved = sessionStorage.getItem("loginTime");
    return saved ? new Date(saved) : new Date();
  });
  const [elapsedTime, setElapsedTime] = useState("00:00:00");

  const [onBreak, setOnBreak] = useState(false);
  const [breakTimeLeft, setBreakTimeLeft] = useState(BREAK_DURATION);
  const [breakIntervalId, setBreakIntervalId] = useState(null);

  const [onMeeting, setOnMeeting] = useState(false);
  const [meetingTime, setMeetingTime] = useState(0);
  const [meetingIntervalId, setMeetingIntervalId] = useState(null);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [breakLoading, setBreakLoading] = useState(false);
  const [meetingLoading, setMeetingLoading] = useState(false);

  const formatTime = (totalSeconds) => {
    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const s = String(totalSeconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  useEffect(() => {
    if (!sessionStorage.getItem("loginTime")) {
      sessionStorage.setItem("loginTime", new Date().toISOString());
    }

    const interval = setInterval(() => {
      const now = new Date();
      const diff = new Date(now - new Date(loginTime));
      const hours = String(diff.getUTCHours()).padStart(2, "0");
      const minutes = String(diff.getUTCMinutes()).padStart(2, "0");
      const seconds = String(diff.getUTCSeconds()).padStart(2, "0");
      setElapsedTime(`${hours}:${minutes}:${seconds}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [loginTime]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest("#break-dropdown")) setDropdownOpen(false);
      if (!e.target.closest("#profile-dropdown")) setProfileOpen(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleStartBreak = async () => {
    try {
      setBreakLoading(true);
      const res = await axios.post(
        "https://vpl-liveproject-1.onrender.com/api/v1/break/start",
        {},
        { withCredentials: true }
      );
      if (res.data.success) {
        setOnBreak(true);
        const remaining = res.data.remainingMinutes || 60;
        setBreakTimeLeft(remaining * 60);

        const intervalId = setInterval(() => {
          setBreakTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(intervalId);
              setOnBreak(false);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        setBreakIntervalId(intervalId);
        setDropdownOpen(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Break start failed");
    } finally {
      setBreakLoading(false);
    }
  };

  const handleEndBreak = async () => {
    try {
      setBreakLoading(true);
      const res = await axios.post(
        "https://vpl-liveproject-1.onrender.com/api/v1/break/end",
        {},
        { withCredentials: true }
      );
      if (res.data.success) {
        clearInterval(breakIntervalId);
        setOnBreak(false);
      }
    } catch (err) {
      alert("Break end failed.");
    } finally {
      setBreakLoading(false);
    }
  };

  const handleMeetingToggle = () => {
    if (onMeeting) {
      clearInterval(meetingIntervalId);
      setOnMeeting(false);
    } else {
      setOnMeeting(true);
      const intervalId = setInterval(() => {
        setMeetingTime((prev) => prev + 1);
      }, 1000);
      setMeetingIntervalId(intervalId);
    }
    setDropdownOpen(false);
  };


  return (
    <div className="fixed w-full top-0 right-0 h-20 bg-white shadow z-10 px-6 flex justify-end items-center pl-[220px]">
      <div className="flex items-center justify-end gap-4">
        <div className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
          <span className="text-base">🕒</span>
          <span className="font-medium">{elapsedTime}</span>
        </div>

        {/* Break / Meeting Dropdown */}
        <div className="relative" id="break-dropdown">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="bg-purple-100 hover:bg-purple-200 text-purple-800 text-sm font-medium px-4 py-1 rounded-full border border-purple-300 transition"
          >
            ☕ Break / 📞 Meeting
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-12 w-56 bg-white rounded-lg shadow-lg py-2 animate-fade-in z-50">
              {/* Break Section */}
              <div className="px-4 py-2 hover:bg-gray-100 text-sm text-gray-800 flex justify-between items-center">
                Break
                {onBreak ? (
                  <span className="text-yellow-600 font-semibold">
                    {formatTime(breakTimeLeft)}
                  </span>
                ) : (
                  <button
                    onClick={handleStartBreak}
                    disabled={breakLoading}
                    className="text-xs bg-yellow-200 px-2 py-1 rounded-full flex items-center gap-1"
                  >
                    {breakLoading ? (
                      <>
                        <span className="animate-spin">⏳</span> Starting...
                      </>
                    ) : (
                      "Start"
                    )}
                  </button>
                )}
              </div>
              {onBreak && (
                <div className="px-4 py-1">
                  <button
                    onClick={handleEndBreak}
                    disabled={breakLoading}
                    className="w-full bg-red-100 text-red-700 text-xs py-1 rounded flex items-center justify-center gap-1"
                  >
                    {breakLoading ? (
                      <>
                        <span className="animate-spin">⏳</span> Ending...
                      </>
                    ) : (
                      "End Break"
                    )}
                  </button>
                </div>
              )}

              {/* Meeting Section */}
              <div className="px-4 py-2 hover:bg-gray-100 text-sm text-gray-800 flex justify-between items-center">
                Meeting
                {onMeeting ? (
                  <span className="text-blue-600 font-semibold">
                    {formatTime(meetingTime)}
                  </span>
                ) : (
                  <button
                    onClick={handleMeetingToggle}
                    disabled={meetingLoading}
                    className="text-xs bg-blue-200 px-2 py-1 rounded-full flex items-center gap-1"
                  >
                    {meetingLoading ? (
                      <>
                        <span className="animate-spin">⏳</span> Starting...
                      </>
                    ) : (
                      "Start"
                    )}
                  </button>
                )}
              </div>
              {onMeeting && (
                <div className="px-4 py-1">
                  <button
                    onClick={handleMeetingToggle}
                    className="w-full bg-red-100 text-red-700 text-xs py-1 rounded"
                  >
                    End Meeting
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notification */}
        <div className="relative group">
          <img
            src={Notification}
            alt="Notifications"
            className="w-6 h-6 cursor-pointer group-hover:scale-110 transition-transform duration-200"
          />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
        </div>

        {/* Profile Dropdown */}
        <div className="relative" id="profile-dropdown">
          <div
            className="w-14 h-14 rounded-full border-2 border-gray-300 overflow-hidden hover:scale-105 transition-transform duration-200 cursor-pointer"
            onClick={() => setProfileOpen(!profileOpen)}
          >
            <img
              src={ProfileIcon}
              alt="User"
              className="w-full h-full object-cover"
            />
          </div>

          {profileOpen && (
            <div className="absolute right-0 top-16 w-40 bg-white shadow-lg rounded-lg py-2 z-50 animate-fade-in">
              <button
                onClick={() => {
                  setProfileOpen(false);
                  navigate("/profile");
                }}
                className="cursor-pointer w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700"
              >
                👤 My Profile
              </button>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Topbar;
