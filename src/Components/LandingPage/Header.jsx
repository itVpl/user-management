import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowUpRight } from 'lucide-react';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
        
        {/* Brand/Logo */}
        <div className="flex items-center">
          <img 
            src="/logo_vpower.png" 
            alt="VPower" 
            className={`transition-all duration-500 object-contain ${
              isScrolled ? 'h-8' : 'h-11'
            } brightness-90 contrast-125`} 
          />
        </div>

        {/* Minimalist Nav */}
        <nav className="hidden md:flex items-center gap-10">
          {['Home', 'Shipment','Industries','About'].map((item) => (
            <a 
              key={item}
              href={`#${item.toLowerCase()}`} 
              className="text-[12px] uppercase tracking-[0.3em] font-bold text-slate-500 hover:text-black transition-all duration-300"
            >
              {item}
            </a>
          ))}
        </nav>

        {/* Luxury Action Button */}
        <div className="flex items-center gap-4">
          <a href="/login" className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <button className="relative px-6 py-2.5 bg-black text-white rounded-full flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all">
              Portal
              <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </a>
           <a href="#industries" className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <button className="relative px-6 py-2.5 bg-black text-white rounded-full flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all">
              Request A Quote
              <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </a>

          {/* Mobile Menu Icon */}
          <button 
            className="md:hidden p-2 text-slate-900"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Modern Mobile Overlay */}
      <div className={`fixed inset-0 bg-white/95 backdrop-blur-2xl transition-all duration-500 ${
        isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
      } lg:hidden flex flex-col items-center justify-center z-[-1]`}>
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