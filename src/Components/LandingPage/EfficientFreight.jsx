import React from 'react';
import { motion } from 'framer-motion';
import { Earth, Sprout, ScanLine, ArrowRight } from 'lucide-react';

const EfficientFreight = () => {
  const fadeInUp = {
    hidden: { opacity: 0, y: 60 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } 
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.6, ease: "easeOut" } 
    }
  };

  return (
    <section className="bg-white py-10 md:py-16 px-6 md:px-12 overflow-hidden">
      <div className="max-w-[1440px] mx-auto">
        
        {/* TOP SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 mb-0 items-center lg:items-start">
          
          {/* Left Side Content */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.3 }}
            className="pt-4 lg:pt-10 lg:mt-20 text-center lg:text-left"
          >
            <motion.div variants={fadeInUp} className="inline-block bg-gray-100 rounded-full px-4 py-1.5 mb-6 md:mb-8 border border-gray-200">
              <span className="text-xs font-bold text-gray-700 tracking-wide uppercase">Efficient Freight</span>
            </motion.div>
            
            <motion.h1 variants={fadeInUp} className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-extrabold text-[#111827] leading-[1.2] lg:leading-[1.1] mb-8 md:mb-12">
              We are dedicated to <br className="hidden md:block" /> providing comprehensive <br className="hidden md:block" />
              & efficient <span className="text-blue-500">cargo shipping <br className="hidden md:block" /> solutions.</span>
            </motion.h1>

            <div className="flex justify-center lg:justify-start">
              <a href="#contact">
                <motion.button 
                  variants={fadeInUp}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-[#f0f1f3] hover:bg-gray-200 text-gray-900 font-bold py-4 px-8 md:py-5 md:px-10 rounded-full flex items-center transition-all text-base md:text-lg"
                >
                  Why We're Different <ArrowRight className="ml-3 w-5 h-5 md:w-6 md:h-6" />
                </motion.button>
              </a>
            </div>
          </motion.div>

          {/* Right Side Images */}
          {/* Mobile par height adjust ki hai (h-[400px]) aur desktop par (lg:h-[650px]) */}
          <div className="flex gap-4 md:gap-6 h-[400px] sm:h-[500px] lg:h-[650px] items-end mt-8 lg:mt-0">
            {/* Image 1 */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 100 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="flex-1 h-full lg:h-[80%] overflow-hidden lg:mb-20 shadow-2xl"
              style={{ clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 0 100%, 0 10%)' }}
            >
              <motion.img 
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.6 }}
                src="/cargoship.jpg" 
                className="w-full h-full object-cover" 
                alt="Cargo Ship"
              />
            </motion.div>
            
            {/* Image 2 */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 100 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex-1 h-full lg:h-[80%] overflow-hidden lg:mb-20 shadow-2xl"
              style={{ clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 0 100%, 0 10%)' }}
            >
              <motion.img 
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.6 }}
                src="/plane.jpg" 
                className="w-full h-full object-cover" 
                alt="Logistics center"
              />
            </motion.div>
          </div>
        </div>

        {/* BOTTOM SECTION: Feature Cards */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.1 }}
          variants={containerVariants}
          className="flex flex-col md:flex-row mt-12 lg:-mt-4"
        >
          {/* Card 1 */}
          <motion.div variants={cardVariants} whileHover={{ y: -15 }} className="flex-1 bg-[#ffebd9] p-8 md:p-12 min-h-[300px] md:min-h-[350px] transition-shadow hover:shadow-xl cursor-default">
              <div className="mb-6 md:mb-8 w-16 h-16 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center shadow-md">
                <Earth size={32} className="md:w-10 md:h-10 text-[#e86a33]" strokeWidth={1.25} />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6 leading-tight">Global Reach, Local <br className="hidden md:block" /> Expertise.</h3>
              <p className="text-gray-600 text-base md:text-lg leading-relaxed">With a robust international network and local expertise, we provide the reach and insights needed for successful.</p>
          </motion.div>

          {/* Card 2 */}
          <motion.div variants={cardVariants} whileHover={{ y: -15 }} className="flex-1 bg-[#f1f2f4] p-8 md:p-12 min-h-[300px] md:min-h-[350px] transition-shadow hover:shadow-xl cursor-default">
              <div className="mb-6 md:mb-8 w-16 h-16 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center shadow-md">
                <Sprout size={32} className="md:w-10 md:h-10 text-[#10b981]" strokeWidth={1.25} />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6 leading-tight">To Sustainability <br className="hidden md:block" /> Commitment.</h3>
              <p className="text-gray-600 text-base md:text-lg leading-relaxed">With a robust international network and local expertise, we provide the reach and insights needed for successful.</p>
          </motion.div>

          {/* Card 3 */}
          <motion.div variants={cardVariants} whileHover={{ y: -15 }} className="flex-1 bg-[#e0e7ff] p-8 md:p-12 min-h-[300px] md:min-h-[350px] transition-shadow hover:shadow-xl cursor-default">
              <div className="mb-6 md:mb-8 w-16 h-16 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center shadow-md">
                <ScanLine size={32} className="md:w-10 md:h-10 text-[#3b82f6]" strokeWidth={1.25} />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6 leading-tight">Advanced Tracking & <br className="hidden md:block" /> Transparency.</h3>
              <p className="text-gray-600 text-base md:text-lg leading-relaxed">With a robust international network and local expertise, we provide the reach and insights needed for successful.</p>
          </motion.div>
        </motion.div>

      </div>
    </section>
  );
};

export default EfficientFreight;