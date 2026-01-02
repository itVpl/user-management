import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Mail } from 'lucide-react';

const slides = [
  {
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=2000',
    title: 'Seamless Sky Logistics Services',
    desc: "We're dynamic, customer-centric cargo shipping company dedicated to delivering efficient, & timely shipping."
  },
  {
    image: 'https://images.unsplash.com/photo-1494412651409-8963ce7935a7?auto=format&fit=crop&q=80&w=2000',
    title: 'Global Freight Solutions',
    desc: 'Connecting continents with precision and care.'
  },
  {
    image: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&q=80&w=2000',
    title: 'Modern Warehousing Systems',
    desc: 'Smart storage solutions for global commerce.'
  }
];

const HeroSection = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const i = setInterval(() => {
      setIndex(p => (p + 1) % slides.length);
    }, 3500);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">

      {/* Background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
        >
          <div className="absolute inset-0 bg-black/40 z-10" />
          <img src={slides[index].image} alt="Logistics" className="h-full w-full object-cover" />
        </motion.div>
      </AnimatePresence>

      {/* Center text */}
      <div className="relative z-20 h-full flex items-center justify-center text-center text-white px-6">
        <motion.div
          key={index}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -30, opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl"
        >
          <h1 className="text-4xl md:text-7xl font-bold mb-4 md:mb-6 leading-tight">
            {slides[index].title}
          </h1>
          <p className="text-base md:text-xl opacity-90 max-w-2xl mx-auto">
            {slides[index].desc}
          </p>
        </motion.div>
      </div>

      {/* ================= BOTTOM BAR ================= */}
      <div className="absolute bottom-0 left-0 w-full z-40">
        
        {/* Blue Bar */}
        <div className="relative w-full h-16 md:h-14 bg-blue-500 flex items-center">

          {/* ✅ SLANTED STRIPES - Hidden on mobile, shown on desktop */}
          <div className="hidden lg:flex absolute left-20 xl:left-30 top-[-38px] gap-1">
            <div className="w-2 h-28 bg-white -skew-x-[28deg]" />
            <div className="w-2 h-28 bg-white -skew-x-[28deg]" />
            <div className="w-2 h-28 bg-white -skew-x-[28deg]" />
          </div>

          {/* Text Container */}
          <div className="w-full lg:w-auto px-6 lg:pl-32 lg:ml-62">
            <p className="text-white font-medium text-sm md:text-lg lg:text-xl">
              Connecting the world one mile at a time.
            </p>
          </div>

          {/* Right white box - Responsive Layout */}
          <div
            className="absolute right-0 bottom-full lg:top-[-24px] lg:bottom-auto h-auto lg:h-20 bg-white flex flex-col lg:flex-row items-start lg:items-center px-6 py-4 lg:px-10 gap-2 lg:gap-8 shadow-xl w-full lg:w-auto"
            style={{
              clipPath: window.innerWidth > 1024 ? 'polygon(10% 0, 100% 0, 100% 100%, 0% 100%)' : 'none',
              minWidth: 'auto'
            }}
          >
            {/* Email */}
            <a href="mailto:contact@vpower-logistics.com" className="flex items-center gap-2 text-gray-700 hover:underline">
              <Mail size={16} className="text-[#2b59ff] shrink-0" />
              <span className="text-xs md:text-sm lg:text-xl font-semibold truncate">contact@vpower-logistics.com</span>
            </a>

            {/* Phone */}
            <div className="flex items-center gap-2">
              <div className="text-[#2b59ff] scale-x-[-1] shrink-0">
                <Phone size={16} fill="currentColor" />
              </div>
              <a href="tel:+919310023990" className="text-sm md:text-base lg:text-xl font-black text-black hover:underline whitespace-nowrap">
                (+91) 9310023990
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default HeroSection;