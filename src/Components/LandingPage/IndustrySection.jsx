import React from 'react';
import { motion } from 'framer-motion';
import { useState } from "react";
import { AnimatePresence } from "framer-motion";

const IndustrySection = () => {
  // const industries = [
  //   { icon: "⚡", title: 'Renewable Energy' },
  //   { icon: "🛒", title: 'Retail & E-commerce' },
  //   { icon: "⛽", title: 'Energy and Oil & Gas' },
  //   { icon: "🍽️", title: 'Food & Beverage' },
  //   { icon: "💻", title: 'Technology & Electronics' },
  //   { icon: "🏭", title: 'Manufacturing & Industrial' },
  //   { icon: "🚀", title: 'Aerospace & Defense' },
  //   { icon: "🏗️", title: 'Construction & Engineering' },
  // ];


    const [activeTab, setActiveTab] = useState("quote");
    const [selectedService, setSelectedService] = useState("air");
    const [status, setStatus] = useState({ type: "", message: "" });
    const [loading, setLoading] = useState(false);
    

  
    const [formData, setFormData] = useState({
      fullName: "", email: "", phone: "", typeOfGoods: "", weight: "", dimensions: ""
    });
  
    const handleInputChange = (e) => {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    };
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      setStatus({ type: "", message: "" });
  
      const dataToSend = {
        _subject: `New Quote Request: ${selectedService.toUpperCase()} Freight`,
        _template: "table",
        _captcha: "false",
        service_type: selectedService.charAt(0).toUpperCase() + selectedService.slice(1),
        ...formData,
      };
  
      try {
        const response = await fetch("https://formsubmit.co/ajax/contact@vpower-logistics.com", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(dataToSend)
        });
  
        if (response.ok) {
          setStatus({ type: "success", message: "Quote request sent successfully!" });
          setFormData({ fullName: "", email: "", phone: "", typeOfGoods: "", weight: "", dimensions: "" });
        } else {
          throw new Error("Failed");
        }
      } catch (error) {
        setStatus({ type: "error", message: "Something went wrong." });
      } finally {
        setLoading(false);
      }
    };

  return (
    <section className="relative w-full min-h-screen bg-[#050505] text-white flex flex-col items-center overflow-hidden py-4 md:py-10 font-sans">
      
      {/* BACKGROUND GRID */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none"
           style={{
             backgroundImage: 'radial-gradient(circle, #444 1.2px, transparent 1.2px)',
             backgroundSize: '30px 30px',
           }}>
      </div>

      {/* HEADER */}
      {/* <motion.div 
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center mb-12 px-4"
      >
        <h1 className="text-gray-300 text-2xl md:text-5xl font-bold tracking-wider">
          Industries Served.
        </h1>
        <p className="text-gray-400 text-sm md:text-md mt-4 max-w-3xl mx-auto px-4 uppercase tracking-[0.2em]">
          The heavy-duty backbone of global trade.
        </p>
      </motion.div> */}

      {/* INDUSTRY PILLS */}
      {/* <div className="relative z-20 flex flex-wrap justify-center gap-3 md:gap-4 max-w-6xl -mb-56 px-4">
        {industries.map((item, idx) => (
          <motion.div 
            key={idx} 
            whileHover={{ scale: 1.05, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
            className="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-full border border-gray-800 bg-black/60 backdrop-blur-md cursor-default transition-all shadow-lg"
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium text-sm md:text-lg whitespace-nowrap">{item.title}</span>
          </motion.div>
        ))}
      </div> */}

      <motion.div 
              className="relative z-10 w-full max-w-4xl px-4 md:px-5"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false }}
              transition={{ duration: 0.6 }}
            >
              {/* Title - Responsive Font Sizes */}
              <div className="text-white text-center mb-6 md:mb-10">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
                  Assured<span className="text-blue-400">.</span> Secure<span className="text-blue-400">.</span> Trusted<span className="text-blue-400">.</span>
                </h1>
                <div className="h-1 w-20 md:w-24 bg-blue-400 mx-auto rounded-full"></div>
              </div>
      
              <motion.div layout className="bg-white/95 -mb-40 backdrop-blur rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden min-h-[500px]">
                {/* Tabs - Stack on very small screens, row otherwise */}
                <div className="flex bg-gray-100 p-1">
                  {["quote", "tracking"].map((tab) => (
                    <button
                      key={tab}
                      className="relative flex-1 py-4 md:py-5 font-bold z-10 transition-colors text-sm md:text-base"
                      onClick={() => setActiveTab(tab)}
                    >
                      <span className={activeTab === tab ? "text-slate-800" : "text-gray-400"}>
                        {tab === "quote" ? "Request A Quote" : "Tracking"}
                      </span>
                      {activeTab === tab && (
                        <motion.div 
                          layoutId="tabSelector"
                          className="absolute inset-0 bg-blue-400 rounded-lg md:rounded-xl z-[-1]"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </button>
                  ))}
                </div>
      
                <div className="p-5 md:p-10">
                  <AnimatePresence mode="wait">
                    {activeTab === "quote" ? (
                      <motion.form
                        key="quote-form-tab"
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                        onSubmit={handleSubmit}
                        className="w-full"
                      >
                        <label className="block font-semibold mb-3 text-slate-800">Select Service Type*</label>
                        {/* Service Icons - Grid for mobile, Flex for desktop */}
                        <div className="grid grid-cols-3 gap-2 md:flex text-black md:flex-wrap md:gap-4 mb-6 md:mb-8 ">
                          {["air", "ocean", "land"].map((id) => (
                            <motion.div
                              key={id}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setSelectedService(id)}
                              className={`flex flex-col  md:flex-row items-center justify-center gap-1 md:gap-3 px-2 py-3 md:px-6 md:py-4 border-2 rounded-xl cursor-pointer transition-all ${
                                selectedService === id ? "border-blue-400 bg-blue-50" : "border-gray-300"
                              }`}
                            >
                              <span className="text-xlb text-black md:text-2xl">{id === "air" ? "✈️" : id === "ocean" ? "🚢" : "🚛"}</span>
                              <span className="font-bold uppercase text-[10px] md:text-xs text-center">{id} Freight</span>
                            </motion.div>
                          ))}
                        </div>
      
                        {/* Input Grids - 1 column on mobile, 3 on desktop */}
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
                      <input
                        name="fullName"
                        value={formData.fullName}
                        placeholder="Full Name"
                        className="input-style"
                        onChange={handleInputChange}
                      />
                      <input
                        name="email"
                        value={formData.email}
                        placeholder="Email"
                        className="input-style"
                        required
                        onChange={handleInputChange}
                      />
                      <input
                        name="phone"
                        value={formData.phone}
                        placeholder="Phone"
                        className="input-style"
                        required
                        onChange={handleInputChange}
                      />
                  </div>
      
                        <div className="grid grid-cols-1 text-black md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
                          {["typeOfGoods", "weight", "dimensions"].map((name) => (
                            <input
                              key={name}
                              name={name}
                              value={formData[name]}
                              placeholder={name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                              className="input-style border border-black rounded-md"
                              onChange={handleInputChange}
                            />
                          ))}
                        </div>
      
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                          <button 
                            type="submit"
                            disabled={loading}
                            className={`w-full md:w-auto bg-blue-600 text-white px-10 py-4 rounded-xl font-bold shadow-lg transition-all hover:bg-blue-700 ${loading ? 'opacity-50' : ''}`}
                          >
                            {loading ? "Sending..." : "Request Callback +"}
                          </button>
                        </div>
      
                        {status.message && (
                          <div className={`mt-4 p-3 rounded-lg text-center text-sm font-bold ${status.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {status.message}
                          </div>
                        )}
                      </motion.form>
                    ) : (
                      <motion.div 
                        key="tracking-tab"
                        initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                        className="py-10 md:py-12 text-center"
                      >
                        <h3 className="text-xl md:text-2xl font-bold mb-6 text-slate-800">Track Your Shipment</h3>
                        <div className="max-w-md mx-auto flex flex-col sm:flex-row border-2 border-blue-400 rounded-xl overflow-hidden">
                          <input className="flex-1 p-4 outline-none text-base" placeholder="Enter Tracking ID..." />
                          <button className="bg-blue-600 px-8 py-4 font-bold text-white hover:bg-blue-700 transition-colors">Track</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </motion.div>

      {/* TRUCK & HORIZONTAL ROAD CONTAINER */}
      <div className="relative w-full mt-auto">
        
        {/* THE TRUCK UNIT */}
      <div className="relative z-30  w-full flex flex-col items-center translate-y-[22px] md:translate-y-[100px]">
        <div className="relative flex flex-col items-center">
            
            {/* Blue Container Box */}
            <div className="relative ml-[50%] w-[300px] md:w-[850px] h-[90px] md:h-[280px] bg-white rounded-sm flex overflow-hidden shadow-2xl border-l-4 md:border-l-8 border-blue-700 translate-y-[80px] md:translate-y-[240px] -translate-x-[40px] md:-translate-x-[120px]">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(90deg, #4a89e9ff 2px, transparent 1px)', backgroundSize: '20px 100%' }} />
              <div className="relative z-10 flex-1 p-4 md:p-12 flex items-center justify-center text-white">
                <img
                  src="/logo_vpower.png"
                  alt="V-Power Logistics USA"
                  className="w-8 h-8 md:w-96 md:h-full object-contain"
                />
              </div>
            </div>

            {/* SVG Truck Cabin (Facing Left/Right correctly) */}
            <div className="relative w-full scale-x-[-1] flex justify-center">
              <svg viewBox="0 0 1400 400" className="w-[420px] md:w-[1200px] h-auto overflow-visible">
                <defs>
                  <linearGradient id="chromeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f3f4f6" />
                    <stop offset="50%" stopColor="#9ca3af" />
                    <stop offset="100%" stopColor="#374151" />
                  </linearGradient>
                  <style>{`
                    @keyframes wheel-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                    .wheel { animation: wheel-spin 0.3s linear infinite; transform-box: fill-box; transform-origin: center; }
                  `}</style>
                </defs>
                <rect x="150" y="290" width="1200" height="25" fill="#111" rx="4" />
                <g transform="translate(1000, 50)">
                  <rect x="0" y="0" width="18" height="220" fill="url(#chromeGrad)" />
                  <rect x="25" y="-20" width="18" height="240" fill="url(#chromeGrad)" />
                  <path d="M40,240 L220,240 L220,50 Q220,20 180,20 L50,20 Q40,20 40,40 Z" fill="#151515" stroke="#333" strokeWidth="2" />
                  <path d="M220,80 L420,100 Q450,110 450,150 L450,240 L220,240 Z" fill="#151515" stroke="#333" strokeWidth="2" />
                  <rect x="440" y="110" width="20" height="100" rx="4" fill="url(#chromeGrad)" />
                  <path d="M225,50 L310,110 L225,110 Z" fill="#0ea5e9" fillOpacity="0.4" stroke="#0ea5e9" strokeWidth="1" />
                  <rect x="60" y="235" width="140" height="40" rx="20" fill="url(#chromeGrad)" />
                </g>
                {[350, 450, 1080, 1180, 1330].map((cx, i) => (
                  <g key={i} className="wheel">
                    <circle cx={cx} cy={315} r="48" fill="#080808" stroke="#222" strokeWidth="5" />
                    <circle cx={cx} cy={315} r="28" fill="#1a1a1a" stroke="url(#chromeGrad)" strokeWidth="4" />
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </div>

        {/* --- HORIZONTAL MOVING ROAD --- */}
        <div className="relative w-full h-[60px] md:h-[120px] bg-[#111] overflow-hidden border-t-4 border-[#222]">
          
          {/* Moving Lane Markers (White Horizontal Lines) */}
          <motion.div
  className="absolute inset-0 overflow-hidden"
>
<div className="relative w-screen h-20 md:h-28 overflow-hidden bg-black">
  <motion.div
    className="absolute left-0 top-1/2 -translate-y-1/2 w-screen overflow-hidden"
  >
    <motion.div
      animate={{ x: ["-50%", "0%"] }}
      transition={{
        duration: 4,
        ease: "linear",
        repeat: Infinity,
        repeatType: "loop",
      }}
      className="flex gap-12 md:gap-24 will-change-transform"
      style={{ width: "200vw" }}
    >
      {[...Array(200)].map((_, i) => (
        <div
          key={i}
          className="w-14 md:w-28 h-2 md:h-3 bg-white/30 rounded-full flex-shrink-0"
        />
      ))}

      {[...Array(200)].map((_, i) => (
        <div
          key={`dup-${i}`}
          className="w-14 md:w-28 h-2 md:h-3 bg-white/30 rounded-full flex-shrink-0"
        />
      ))}
    </motion.div>
  </motion.div>
</div>



</motion.div>


          {/* Road Surface Texture */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10px, #000 10px, #000 20px)' }}></div>
          
          {/* Bottom Road Edge */}
          <div className="absolute bottom-0 w-full h-1 md:h-2 bg-gray-800"></div>
        </div>

        {/* Ground Shadow for Realism */}
        <div className="absolute top-[80%] left-0 right-0 h-10 bg-black/50 blur-xl z-20"></div>
      </div>
  <style>{`
        .input-style {
          padding: 0.875rem 1rem;
          border: 2px solid #ebc285ff;
          border-radius: 0.75rem;
          background: #f8fafc;
          outline: none;
          transition: all 0.3s ease;
          width: 100%;
          color: #1e293b;
          font-size: 16px; /* Prevents iOS auto-zoom on focus */
        }
        .input-style:focus {
          border-color: #facc15;
          background: #fff;
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: marquee 30s linear infinite;
        }
        @media (max-width: 768px) {
           .animate-marquee {
             animation-duration: 20s;
           }
        }
      `}</style>
    </section>
  );
};



    

export default IndustrySection;