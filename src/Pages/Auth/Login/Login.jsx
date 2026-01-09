import React, { useEffect, useState } from 'react';
import logo from '../../../assets/LogoFinal.png';
import VideoBg from '../../../assets/BackgroundVideo.mp4';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import TermsAndConditions from '../../../Components/TermsAndConditions';
import { ArrowLeft } from 'lucide-react';

// Simple inline icons (no extra libs)
const Eye = (props) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOff = (props) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M3 3l18 18" />
    <path d="M10.58 10.58a3 3 0 104.24 4.24" />
    <path d="M9.88 4.24A10.94 10.94 0 0112 4c7 0 11 8 11 8a18.19 18.19 0 01-4.22 5.56" />
    <path d="M6.61 6.61A18.5 18.5 0 001 12s4 8 11 8a10.7 10.7 0 005.39-1.46" />
  </svg>
);

function Login({ setIsAuthenticated }) {
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // 👁️ default hidden (eye closed)
  const [loading, setLoading] = useState(false);

  // Inline validation errors
  const [fieldErrors, setFieldErrors] = useState({ empId: '', password: '' });
  // Auth error (invalid id/password)
  const [authError, setAuthError] = useState('');

  // Terms and conditions state
  const [showTerms, setShowTerms] = useState(false);
  const [userData, setUserData] = useState(null);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');
    setFieldErrors({ empId: '', password: '' });

    // Frontend required-field validation
    const nextErrors = { empId: '', password: '' };
    if (!empId.trim()) nextErrors.empId = 'Please enter the employee id.';
    if (!password.trim()) nextErrors.password = 'Please enter the password.';
    if (nextErrors.empId || nextErrors.password) {
      setFieldErrors(nextErrors);
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(
        'https://vpl-liveproject-1.onrender.com/api/v1/inhouseUser/login',
        { empId: empId.trim(), password },
        { withCredentials: true }
      );

      if (res.data?.success) {
        const user = res.data.employee;
        const token = res.data.token;

        // Store user data and token
        sessionStorage.setItem('token', token);
        sessionStorage.setItem('empId', user.empId);
        sessionStorage.setItem('user', JSON.stringify(user));
        sessionStorage.setItem('authToken', token);
        
        // Store emailAccountId if present in login response
        if (user.emailAccountId) {
          sessionStorage.setItem('emailAccountId', user.emailAccountId);
        }

        // Check if terms are accepted
        if (user.termsAccepted === false || user.termsAccepted === undefined) {
          // Show terms and conditions modal
          setUserData(user);
          setShowTerms(true);
        } else {
          // Terms already accepted, proceed to dashboard
          setIsAuthenticated?.(true);
          navigate('/dashboard');
        }
      } else {
        // Generic auth error message (no backend phrasing like "Employee not found this id")
        setAuthError('Please enter the valid employee id or password.');
        // Clear fields on wrong creds
        setEmpId('');
        setPassword('');
        setShowPassword(false);
      }
    } catch (err) {
      // Always show generic message for any login failure
      setAuthError('Please enter the valid employee id or password.');
      // Clear fields on wrong creds
      setEmpId('');
      setPassword('');
      setShowPassword(false);
    } finally {
      setLoading(false);
    }
  };

  // Clear per-field error while typing
  useEffect(() => {
    if (empId) setFieldErrors((e) => ({ ...e, empId: '' }));
    if (authError && empId) setAuthError('');
  }, [empId]);

  useEffect(() => {
    if (password) setFieldErrors((e) => ({ ...e, password: '' }));
    if (authError && password) setAuthError('');
  }, [password]);

  // Handle terms acceptance
  const handleTermsAccepted = (termsData) => {
    setShowTerms(false);
    setIsAuthenticated?.(true);
    navigate('/dashboard');
  };

  return (
    <div className="relative flex justify-center items-center min-h-screen px-4 overflow-hidden">
      {/* Background video */}
      <div className="absolute top-0 left-0 w-full h-full z-0 overflow-hidden">
        <video
          className="w-full h-full object-cover"
          src={VideoBg}
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="absolute inset-0 backdrop-blur-sm bg-black/20" />
      </div>
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

      {/* Card */}
      <div className="relative z-20 w-full max-w-md p-8 sm:p-10 bg-white/90 backdrop-blur-md rounded-xl shadow-lg">
        <form method="post" className="space-y-6" onSubmit={handleLogin} noValidate>
          <div className="flex justify-center mb-2">
            <img src={logo} alt="Company Logo" className="h-16 object-contain" />
          </div>

          {/* Employee ID */}
          <div>
            <input
              type="text"
              placeholder="Employee ID *"
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              className={`w-full py-2 border-b bg-transparent focus:outline-none transition ${
                fieldErrors.empId ? 'border-red-500 focus:border-red-600' : 'border-gray-400 focus:border-black'
              }`}
              aria-invalid={!!fieldErrors.empId}
              aria-describedby="empId-error"
              autoComplete="username"
            />
            {fieldErrors.empId && (
              <p id="empId-error" className="text-red-600 text-sm mt-1">
                {fieldErrors.empId}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className={`relative`}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                placeholder="Password *"
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full py-2 pr-10 border-b bg-transparent focus:outline-none transition ${
                  fieldErrors.password ? 'border-red-500 focus:border-red-600' : 'border-gray-400 focus:border-black'
                }`}
                aria-invalid={!!fieldErrors.password}
                aria-describedby="password-error"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-1 top-1.5 p-1 text-gray-700 hover:text-black"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <Eye /> : <EyeOff />} {/* Default: closed icon (password hidden) */}
              </button>
            </div>
            {fieldErrors.password && (
              <p id="password-error" className="text-red-600 text-sm mt-1">
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Auth error (invalid creds) */}
          {authError && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3">
              <p className="text-red-700 text-sm">{authError}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center items-center gap-2 bg-blue-500 text-white py-2 rounded-md transition ${
              loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-600'
            }`}
          >
            {loading && (
              <span className="inline-block w-5 h-5 border-2 border-b-transparent rounded-full animate-spin" />
            )}
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
      </div>

      {/* Terms and Conditions Modal */}
      {showTerms && userData && (
        <TermsAndConditions 
          onAccept={handleTermsAccepted} 
          user={userData} 
        />
      )}
    </div>
  );
}

export default Login;
