import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Linkedin, Mail, Twitter } from 'lucide-react';

const TeamSection = () => {
  const teamMembers = [
    { id: 1, name: "Mr. Rishi Jyoti", position: "CEO", image: "/team/Rishijyoti.jpg" },
    { id: 2, name: "Mr. Vivek Lamba", position: "Director of Operations", image: "/team/VivekLamba.jpg" },
    { id: 3, name: "Mr. Akshay Kathuia", position: "General Manager", image: "/team/AkshayKathuia.jpg" },
    { id: 4, name: "Mr. Harsh Pathak", position: "IT Manager", image: "/team/Harshpatahk.png" },
    { id: 5, name: "Mr. Varun Mandal", position: "Freight Broker", image: "/team/varunmandal.jpg" },
    { id: 6, name: "Mrs. Rachna Bisht", position: "HR Manager", image: "/team/rachnabist.jpg" },
    { id: 7, name: "Mr. Parimay Deswal", position: "Freight Broker", image: "/team/Parimeydeswal.jpg" },
    { id: 8, name: "David Wilson", position: "Customer Relations", image: "/api/placeholder/300/400" }
  ];

  const [currentSlide, setCurrentSlide] = useState(0);
  const itemsPerPage = 4;
  const totalPages = Math.ceil(teamMembers.length / itemsPerPage);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % totalPages);
  }, [totalPages]);

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalPages) % totalPages);
  };

  useEffect(() => {
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [nextSlide]);

  const getCurrentMembers = () => {
    const startIndex = currentSlide * itemsPerPage;
    return teamMembers.slice(startIndex, startIndex + itemsPerPage);
  };

  return (
    <section className="py-24 bg-white overflow-hidden font-sans">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header Section */}
        <div className="relative mb-20 text-center">
          <motion.span 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-blue-600 font-bold tracking-[0.2em] uppercase text-sm"
          >
            Experts Behind Our Success
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-extrabold text-slate-900 mt-4 mb-6"
          >
            Meet Our <span className="text-blue-600">Visionaries</span>
          </motion.h2>
          <div className="w-24 h-1.5 bg-blue-600 mx-auto rounded-full"></div>
        </div>

        <div className="relative group">
          {/* Main Cards Area */}
          <div className="min-h-[500px]">
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentSlide}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
              >
                {getCurrentMembers().map((member, index) => (
                  <motion.div 
                    key={member.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="group/card relative"
                  >
                    {/* Card Container */}
                    <div className="relative h-[420px] rounded-3xl overflow-hidden bg-gray-50 border border-gray-100 shadow-sm group-hover/card:shadow-2xl transition-all duration-500">
                      
                      {/* Member Image */}
                      <img 
                        src={member.image} 
                        alt={member.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110"
                      />

                      {/* Premium Overlay Gradient (Slightly darker for text visibility) */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover/card:opacity-90 transition-opacity duration-300" />

                      {/* Content inside Card */}
                      <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-2 group-hover/card:translate-y-0 transition-transform duration-300">
                        <p className="text-orange-400 font-bold text-md tracking-widest uppercase mb-2">{member.position}</p>
                        <h3 className="text-2xl font-bold text-white mb-0 leading-tight">{member.name}</h3>
                        
                        {/* Social Icons */}
                        <div className="flex gap-4 opacity-0 group-hover/card:opacity-100 transition-all duration-500 delay-100">
                          <Linkedin className="w-5 h-5 text-white/70 hover:text-white cursor-pointer" />
                          <Twitter className="w-5 h-5 text-white/70 hover:text-white cursor-pointer" />
                          <Mail className="w-5 h-5 text-white/70 hover:text-white cursor-pointer" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Arrows */}
          <button 
            onClick={prevSlide}
            className="absolute top-1/2 -left-6 md:-left-12 -translate-y-1/2 w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 z-10 border border-gray-100"
          >
            <ChevronLeft size={24} />
          </button>
          <button 
            onClick={nextSlide}
            className="absolute top-1/2 -right-6 md:-right-12 -translate-y-1/2 w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 z-10 border border-gray-100"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Custom Pagination Dots */}
        {/* <div className="flex justify-center gap-3 mt-12">
          {Array.from({ length: totalPages }).map((_, dot) => (
            <button 
              key={dot}
              onClick={() => setCurrentSlide(dot)}
              className={`h-2 rounded-full transition-all duration-500 ${
                currentSlide === dot ? 'w-10 bg-blue-600' : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div> */}
      </div>
    </section>
  );
};

export default TeamSection;