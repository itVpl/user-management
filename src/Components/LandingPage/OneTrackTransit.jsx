import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const OneTrackTransit = () => {
  const [activeTab, setActiveTab] = useState('air');

  const freightData = {
    air: {
      title: 'Express Air Freight',
      description: 'Priority air freight services for urgent, time-sensitive shipments with the fastest delivery times.',
      features: ['Fastest Delivery Times', 'Dedicated Support', 'Real-Time Tracking'],
      image: '/plane.jpg',
    },
    ocean: { 
        title: 'Ocean Freight Solutions', 
        description: 'Cost-effective ocean freight services for large volume shipments.', 
        features: ['Global Coverage', 'Cost Effective', 'Large Volume Capacity'], 
        image: '/cargoship.jpg' 
    },
    land: { 
        title: 'Land Freight Transport', 
        description: 'Reliable ground transportation services for domestic delivery.', 
        features: ['Door-to-Door Service', 'Flexible Scheduling', 'Regional Coverage'], 
        image: '/vehicle-road.jpg' 
    },
    rail: { 
        title: 'Rail Freight Services', 
        description: 'Eco-friendly rail transport solutions for heavy cargo.', 
        features: ['Eco-Friendly Option', 'Heavy Cargo Capacity', 'Sustainable Transport'], 
        image: '/f6train12.jpg' 
    }
  };

  const currentData = freightData[activeTab];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <section className="py-16 bg-white font-sans overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* Title Animation */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: false, amount: 0.5 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative z-10 text-center mt-8 mb-12"
        >
          <h1 className="text-black text-4xl md:text-6xl font-extrabold tracking-wider max-w-6xl mx-auto leading-tight">
            V Power Transit.
          </h1>
          <motion.div 
             initial={{ width: 0 }}
             whileInView={{ width: "100px" }}
             transition={{ delay: 0.5, duration: 0.8 }}
             className="h-1.5 bg-blue-500 mx-auto mt-4 rounded-full"
          />
        </motion.div>
        
        {/* Tab Navigation */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.2 }}
          className="flex flex-wrap justify-center gap-4 mb-14"
        >
          {Object.keys(freightData).map((tab) => (
            <motion.button
              key={tab}
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-3 px-6 md:px-8 py-3 rounded-full font-bold text-sm md:text-base transition-all duration-300 ${
                activeTab === tab
                  ? 'bg-[#3b59ff] text-white shadow-lg shadow-blue-200'
                  : 'bg-[#f3f5f9] text-[#1a1a1a] hover:bg-gray-200'
              }`}
            >
              <span className="text-xl">
                {tab === 'air' && '✈️'} {tab === 'ocean' && '🚢'} 
                {tab === 'land' && '📦'} {tab === 'rail' && '🚂'}
              </span>
              <span className="capitalize">{tab} Freight</span>
            </motion.button>
          ))}
        </motion.div>

        {/* Main Content Container - Flex-col for mobile, relative for desktop */}
        <div className="relative w-full flex flex-col lg:block min-h-[550px]">
          
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/world-map.png')] bg-contain bg-no-repeat hidden lg:block"></div>

          {/* Image Section - Absolute on Desktop, Relative on Mobile */}
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTab + "-img"}
              initial={{ opacity: 0, x: 100, clipPath: 'inset(0% 0% 0% 100%)' }}
              animate={{ opacity: 1, x: 0, clipPath: 'inset(0% 0% 0% 0%)' }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="lg:absolute top-0 right-0 w-full lg:w-[50%] h-[300px] lg:h-full z-0 order-1 lg:order-none"
            >
              <img 
                src={currentData.image} 
                alt="Freight"
                className="w-full h-full object-cover rounded-[20px] lg:rounded-[40px] shadow-2xl"
              />
            </motion.div>
          </AnimatePresence>

          {/* Content Box Section - Order-2 on mobile ensures it stays below image if needed */}
          <div className="relative z-10 w-full lg:w-[62%] h-full flex items-center mt-6 lg:mt-0 order-2 lg:order-none">
            
            {/* Orange Border - Hidden on mobile to prevent layout mess, Exactly same on desktop */}
            <motion.div 
              initial={{ x: -100, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: false }}
              transition={{ duration: 0.8 }}
              className="hidden lg:block absolute inset-0 bg-orange-400 z-0 shadow-xl"
              style={{ clipPath: 'polygon(0% 0%, 85.5% 0%, 100% 50%, 85.5% 100%, 0% 100%)' }}
            ></motion.div>

            {/* Main Content Box */}
            <motion.div 
              initial={{ x: -50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: false }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative z-10 w-full h-full bg-[#f8f9fb] p-6 md:p-10 lg:p-20 lg:pr-40 rounded-[20px] lg:rounded-none"
              style={{ 
                // Only apply your specific polygon on desktop (screens > 1024px)
                clipPath: typeof window !== 'undefined' && window.innerWidth > 1024 
                  ? 'polygon(0% 0%, 85% 0%, 99% 50%, 85% 100%, 0% 100%)' 
                  : 'none',
                margin: '2px 0px 2px 0px'
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="mb-8 w-14 h-14 border-2 border-[#3b59ff] rounded-2xl flex items-center justify-center">
                    <div className="grid grid-cols-2 gap-1.5">
                      {[1, 2, 3, 4].map(i => (
                        <motion.div 
                          key={i} 
                          animate={{ 
                            scale: [1, 1.4, 1],
                            backgroundColor: ["#3b59ff", "transparent", "#3b59ff"]
                          }}
                          transition={{ repeat: Infinity, duration: 2, delay: i * 0.2 }}
                          className="w-1.5 h-1.5 rounded-full border border-[#3b59ff]"
                        />
                      ))}
                    </div>
                  </div>

                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#111] mb-6 tracking-tight">
                    {currentData.title}
                  </h2>

                  <p className="text-gray-500 text-lg mb-8 max-w-md leading-relaxed">
                    {currentData.description}
                  </p>

                  <ul className="space-y-4 mb-10">
                    {currentData.features.map((feature, index) => (
                      <motion.li 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 + 0.3 }}
                        key={feature} 
                        className="flex items-center text-[#111] font-bold"
                      >
                        <span className="mr-3 text-blue-600 bg-blue-50 w-6 h-6 flex items-center justify-center rounded-full text-xs">✓</span> 
                        {feature}
                      </motion.li>
                    ))}
                  </ul>

                  <a href="#contact"> 
                    <motion.button 
                      whileHover={{ scale: 1.05, x: 10 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-black text-white px-10 py-4 rounded-full font-bold text-sm hover:bg-gray-800 transition-all flex items-center group w-fit shadow-lg"
                    >
                      Connect us
                      <motion.span 
                        animate={{ x: [0, 5, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="ml-2"
                      >
                        ↗
                      </motion.span>
                    </motion.button>
                  </a>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OneTrackTransit;