import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, ArrowUpRight, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check login status continuously to ensure reactivity
  useEffect(() => {
    const checkAuthStatus = () => {
      const token = 
        sessionStorage.getItem('token') || 
        localStorage.getItem('token') ||
        sessionStorage.getItem('authToken') || 
        localStorage.getItem('authToken');
      
      setIsLoggedIn(!!token);
    };

    // Check immediately
    checkAuthStatus();

    // Check on storage events (cross-tab)
    window.addEventListener('storage', checkAuthStatus);

    // Check on interval to catch same-tab changes if no event fired
    const intervalId = setInterval(checkAuthStatus, 1000);

    return () => {
      window.removeEventListener('storage', checkAuthStatus);
      clearInterval(intervalId);
    };
  }, [location.pathname]); // Also re-check when route changes

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Logout handler
  const handleLogout = () => {
    // Clear all auth data
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    setIsLoggedIn(false);
    setIsDropdownOpen(false);
    navigate('/login');
  };

  const handleNavigation = (path) => {
    navigate(path);
    setIsDropdownOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 w-full z-[100] px-4 py-4 md:px-10 transition-all duration-500">
      {/* Floating Glass Container */}
      <div
        className={`max-w-7xl bg-white mx-auto transition-all duration-700 ease-in-out rounded-[2rem] flex items-center justify-between px-6 md:px-10 ${
          isScrolled
            ? 'bg-white backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] py-3 border border-white/40'
            : 'bg-transparent py-5'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center">
          <img
            src="/logo_vpower.png"
            alt="VPower"
            className={`transition-all duration-500 object-contain ${
              isScrolled ? 'h-8' : 'h-11'
            } brightness-90 contrast-125`}
          />
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-10">
          {['Home', 'Shipment', 'Industries', 'About'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-[12px] uppercase tracking-[0.3em] font-bold text-slate-500 hover:text-black transition-all duration-300"
            >
              {item}
            </a>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-4 relative">
          {/* AUTH LOGIC */}
          {!isLoggedIn ? (
            <a href="/login" className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <button className="relative px-6 py-2.5 bg-black text-white rounded-full flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all">
                Portal
                <ArrowUpRight size={14} />
              </button>
            </a>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="px-6 py-2.5 bg-black text-white rounded-full flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all"
              >
                <User size={16} />
                User
              </button>

              {/* Dropdown */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-3 w-44 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
                  <button
                    onClick={() => (window.location.href = '/dashboard')}
                    className="w-full text-left px-5 py-3 text-sm font-medium hover:bg-slate-100 transition flex items-center gap-2"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-5 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition flex items-center gap-2"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Request Quote */}
          <a href="#industries" className="group relative hidden md:block">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <button className="relative px-6 py-2.5 bg-black text-white rounded-full flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all">
              Request A Quote
              <ArrowUpRight size={14} />
            </button>
          </a>

          {/* Mobile Menu */}
          <button
            className="md:hidden p-2 text-slate-900"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 bg-white/95 backdrop-blur-2xl transition-all duration-500 ${
          isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        } lg:hidden flex flex-col items-center justify-center z-[-1]`}
      >
        <div className="flex flex-col gap-10 text-center">
          {['Home', 'Services', 'News', 'Contact'].map((item) => (
            <a
              key={item}
              href="#"
              className="text-4xl font-extralight tracking-tighter text-slate-900"
              onClick={() => setIsMenuOpen(false)}
            >
              {item}
            </a>
          ))}
        </div>
      </div>
    </header>
  );
};

export default Header;
