import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FormSection = () => {
  const [activeTab, setActiveTab] = useState("quote");
  const [selectedService, setSelectedService] = useState("air");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);
  
  const companyLogos = [
    "/LogoFinal.png", "/identifica_logo.png", "/mtPocono.png",
    "/LogoFinal.png", "/identifica_logo.png", "/mtPocono.png",
    "/LogoFinal.png", "/identifica_logo.png", "/mtPocono.png",
    "/LogoFinal.png", "/identifica_logo.png", "/mtPocono.png",
  ];

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
      const response = await fetch("https://formsubmit.co/ajax/jsnikhil11@gmail.com", {
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
    <section
      className="relative min-h-screen bg-cover bg-center bg-no-repeat flex flex-col items-center justify-center overflow-hidden py-10 md:py-20"
      style={{ backgroundImage: "url('/warehouse.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/60"></div>

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

        <motion.div layout className="bg-white/95 backdrop-blur rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden min-h-[500px]">
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
                  <div className="grid grid-cols-3 gap-2 md:flex md:flex-wrap md:gap-4 mb-6 md:mb-8 ">
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
                        <span className="text-xl md:text-2xl">{id === "air" ? "✈️" : id === "ocean" ? "🚢" : "🚛"}</span>
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
                    {["typeOfGoods", "weight", "dimensions"].map((name) => (
                      <input
                        key={name}
                        name={name}
                        value={formData[name]}
                        placeholder={name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        className="input-style"
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

      {/* Marquee Section - Adjusted height for mobile */}
      <div className="mt-8 md:mt-12 overflow-hidden w-full relative z-10">
        <div className="flex gap-4 md:gap-8 animate-marquee items-center py-4">
          {[...companyLogos, ...companyLogos].map((logo, index) => (
            <div 
              key={index} 
              className="flex-shrink-0 w-32 h-20 md:w-40 md:h-24 bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-lg flex items-center justify-center p-3 border-2 border-white/40"
            >
              <img src={logo} alt="Partner" className="w-full h-full object-contain" />
            </div>
          ))}
        </div>
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

export default FormSection;