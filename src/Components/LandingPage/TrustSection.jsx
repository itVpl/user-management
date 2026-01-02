import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

const TrustSection = () => {
  const slides = [
    {
      img: "/plane1f.webp",
      text: "We understand that cargo shipping is more than just moving goods—it's about supporting business growth and fulfilling commitments."
    },
    {
      img: "/truck1f.webp",
      text: "Our dedicated team ensures your cargo reaches its destination safely and on time, every single time."
    },
    {
      img: "/ship1f.jpg",
      text: "With advanced tracking technology and reliable partnerships, we make logistics simple and transparent."
    },
    {
      img: "/f6train12.jpg",
      text: "Trust us to handle your most valuable shipments with the care and precision they deserve."
    }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      handleNext();
    }, 5000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    // Changed min-h-screen to h-auto for mobile to allow content to flow
    <section className="flex flex-col min-h-screen lg:h-screen bg-black overflow-hidden font-sans mt-10 md:mt-20">
      
      {/* TOP IMAGE SECTION - Responsive height */}
      <div className="relative h-[40vh] md:h-[55vh] w-full overflow-hidden">
        
        {/* DESIGN ELEMENT - Hidden on very small screens if needed, or scaled */}
        <div 
          className="absolute top-0 left-0 w-32 h-14 md:w-48 md:h-20 bg-white z-30"
          style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
        ></div>
        
        <AnimatePresence mode="wait">
          <motion.img 
            key={currentIndex}
            src={slides[currentIndex].img}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute inset-0 w-full h-full object-cover z-10"
          />
        </AnimatePresence>

        {/* Navigation Pill - Adjusted padding and positioning for mobile */}
        <div className="absolute bottom-6 right-6 md:bottom-10 md:right-10 z-20 flex items-center bg-stone-900/70 backdrop-blur-md rounded-full px-4 py-2 md:px-5 md:py-2 text-white border border-white/10 shadow-2xl">
          <button onClick={handlePrev} className="hover:scale-125 transition-transform p-1">
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" strokeWidth={3} />
          </button>
          
          <span className="mx-4 md:mx-6 font-bold text-xs md:text-sm tracking-[0.2em]">
            {currentIndex + 1} / {slides.length}
          </span>
          
          <button onClick={handleNext} className="hover:scale-125 transition-transform p-1">
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* BOTTOM CONTENT SECTION */}
      <div className="relative flex-1 bg-black px-6 md:px-12 lg:px-24 py-12 md:py-16 flex items-center">
        
        {/* Decorative Curve Lines - Scaled for mobile */}
        <div className="absolute left-0 bottom-0 w-full md:w-1/3 h-full opacity-10 pointer-events-none">
          <svg viewBox="0 0 400 400" className="w-full h-full preserve-3d">
            <path d="M0,400 Q150,300 400,380" stroke="white" fill="transparent" strokeWidth="1" />
            <path d="M0,370 Q160,270 400,350" stroke="white" fill="transparent" strokeWidth="1" />
            <path d="M0,340 Q170,240 400,320" stroke="white" fill="transparent" strokeWidth="1" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start z-10">
          
          {/* Heading - Fluid text sizes */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight">
              Your Trust,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">Our Responsibility.</span>
            </h1>
          </motion.div>

          {/* Text Description & CTA */}
          <div className="flex flex-col space-y-6 md:space-y-10">
            <div className="min-h-[80px] md:min-h-[100px]">
              <AnimatePresence mode="wait">
                <motion.p 
                  key={currentIndex}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.5 }}
                  className="text-gray-400 text-base sm:text-lg md:text-xl max-w-lg leading-relaxed"
                >
                  {slides[currentIndex].text}
                </motion.p>
              </AnimatePresence>
            </div>

            <a href="#contact" className="w-fit">
              <motion.button 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }}
                whileHover={{ scale: 1.05, boxShadow: "0px 0px 25px rgba(62,94,255,0.4)" }}
                whileTap={{ scale: 0.95 }}
                className="bg-blue-600 text-white px-8 py-3 md:px-10 md:py-4 rounded-full font-bold text-base md:text-lg flex items-center gap-3 transition-all"
              >
                Request a Quote
                <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
              </motion.button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;