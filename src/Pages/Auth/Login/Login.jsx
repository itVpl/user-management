import React, { useEffect, useState } from 'react';
import logo from '../../../assets/LogoFinal.png';
import VideoBg from '../../../assets/BackgroundVideo.mp4';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import TermsAndConditions from '../../../Components/TermsAndConditions';

// Eye Icons
const Eye = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOff = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 3l18 18" />
    <path d="M10.58 10.58a3 3 0 104.24 4.24" />
    <path d="M9.88 4.24A10.94 10.94 0 0112 4c7 0 11 8 11 8a18.19 18.19 0 01-4.22 5.56" />
    <path d="M6.61 6.61A18.5 18.5 0 001 12s4 8 11 8a10.7 10.7 0 005.39-1.46" />
  </svg>
);

// Arrow Icon
const ArrowLeft = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

function Login({ setIsAuthenticated }) {
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState('');
  const [showTerms, setShowTerms] = useState(false);
  const [userData, setUserData] = useState(null);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setErrors({});

    if (!empId.trim() || !password.trim()) {
      setErrors({
        empId: !empId ? 'Employee ID required' : '',
        password: !password ? 'Password required' : '',
      });
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(
        'https://vpl-liveproject-1.onrender.com/api/v1/inhouseUser/login',
        { empId, password },
        { withCredentials: true }
      );

      if (res.data?.success) {
        const user = res.data.employee;
        const token = res.data.token;

        sessionStorage.setItem('authToken', token);
        sessionStorage.setItem('user', JSON.stringify(user));

        if (!user.termsAccepted) {
          setUserData(user);
          setShowTerms(true);
        } else {
          setIsAuthenticated?.(true);
          navigate('/dashboard');
        }
      } else {
        setAuthError('Invalid employee id or password');
      }
    } catch {
      setAuthError('Invalid employee id or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src={VideoBg}
        autoPlay
        loop
        muted
        playsInline
      />
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* 🔙 Back To Home Button (IMAGE STYLE) */}
      <button
        onClick={() => navigate('/')}
        className="fixed top-6 left-6 z-50 flex items-center gap-2 px-4 py-2
                   text-white text-sm font-medium
                   border border-white/80
                   bg-black/30 backdrop-blur-md
                   rounded-md
                   hover:bg-white hover:text-black
                   transition-all duration-200"
      >
        <ArrowLeft />
        BACK TO HOME
      </button>

      {/* Login Card */}
      <div className="relative z-10 bg-white/95 backdrop-blur-md rounded-xl shadow-xl p-8 w-full max-w-md">
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="flex justify-center">
            <img src={logo} alt="logo" className="h-14" />
          </div>

          <div>
            <input
              type="text"
              placeholder="Employee ID"
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              className="w-full border-b py-2 outline-none"
            />
            {errors.empId && <p className="text-red-500 text-sm">{errors.empId}</p>}
          </div>

          <div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-b py-2 pr-10 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-2 text-gray-600"
              >
                {showPassword ? <Eye /> : <EyeOff />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
          </div>

          {authError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">
              {authError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
      </div>

      {showTerms && userData && (
        <TermsAndConditions user={userData} onAccept={() => navigate('/dashboard')} />
      )}
    </div>
  );
}

export default Login;
