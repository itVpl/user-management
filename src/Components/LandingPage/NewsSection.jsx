import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const NewsSection = () => {
  const [selectedArticle, setSelectedArticle] = useState(null);

  const newsArticles = [
    {
      id: 1,
      date: "28 October, 2025",
      category: "Air Freight Forward",
      title: "How to Choose the Right Logistics Partner for Your Business",
      image: "/plane.jpg",
      content: "Choosing the right logistics partner is a critical decision that can significantly impact your business's efficiency and bottom line. In this comprehensive guide, we explore the key factors you should consider, from technology integration and global network reach to customer service and reliability."
    },
    {
      id: 2,
      date: "28 October, 2025",
      category: "Courier Service",
      title: "The Ultimate Guide to Efficient Fleet Management",
      image: "/s1.jpg",
      content: "Efficient fleet management is the backbone of any successful courier service. This article dives deep into the latest strategies and technologies transforming the industry. Discover how telematics, route optimization software, and predictive maintenance can reduce costs."
    },
    {
      id: 3,
      date: "28 October, 2025",
      category: "International Shipping",
      title: "Why Last-Mile Delivery is the Most Crucial Step in Logistics",
      image: "/cargoship.jpg",
      content: "Last-mile delivery is often the most expensive and time-consuming part of the shipping process, yet it's the only part the customer truly sees. We discuss why getting it right is crucial for customer satisfaction and brand loyalty. "
    }
  ];

  // Animation Variants for Cards
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <section className="py-24 bg-gray-50 overflow-hidden bg-gray-100 rounded-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Animation */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight">
            News & Insight.
          </h2>
          <div className="w-20 h-1.5 bg-blue-500 mx-auto mb-6 rounded-full"></div>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            We are more than a logistics provider; we are your trusted partner in global 
            maritime transport solutions.
          </p>
        </motion.div>

        {/* News Cards with Staggered Animation */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
        >
          {newsArticles.map((article) => (
            <motion.div 
              key={article.id} 
              variants={itemVariants}
              whileHover={{ y: -10 }}
              className="group cursor-pointer bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500"
              onClick={() => setSelectedArticle(article)}
            >
              <div className="relative overflow-hidden h-64">
                <motion.img 
                  src={article.image} 
                  alt={article.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold text-gray-800 shadow-sm">
                  {article.date}
                </div>
              </div>
              
              <div className="p-8">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">
                  {article.category}
                </div>
                <h3 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-blue-600 transition-colors duration-300">
                  {article.title}
                </h3>
                <div className="mt-6 flex items-center text-gray-400 text-sm font-medium">
                  Read More 
                  <svg className="ml-2 w-4 h-4 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Modal Animation using AnimatePresence */}
      <AnimatePresence>
        {selectedArticle && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
            onClick={() => setSelectedArticle(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-5xl bg-white rounded-3xl overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedArticle(null)}
                className="absolute top-6 right-6 z-20 p-2 bg-white/10 hover:bg-blue-600 text-white hover:text-white rounded-full transition-all border border-white/20"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <div className="flex flex-col md:flex-row h-full max-h-[90vh] overflow-y-auto">
                <div className="md:w-1/2 h-[300px] md:h-auto relative shrink-0">
                  <img 
                    src={selectedArticle.image} 
                    alt={selectedArticle.title} 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                
                <div className="md:w-1/2 p-10 md:p-14 flex flex-col justify-center">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="px-4 py-1 bg-blue-50 text-blue-700 text-xs font-black uppercase tracking-widest rounded-full">
                      {selectedArticle.category}
                    </span>
                    <span className="text-gray-400 text-sm">{selectedArticle.date}</span>
                  </div>
                  
                  <h3 className="text-3xl md:text-4xl font-black text-gray-900 mb-8 leading-tight">
                    {selectedArticle.title}
                  </h3>
                  
                  <div className="prose prose-blue text-gray-600">
                    <p className="text-lg leading-relaxed mb-6">
                      {selectedArticle.content}
                    </p>
                    <p className="leading-relaxed opacity-80">
                      Our expert team ensures every logistics challenge is met with a tailored solution. 
                      From optimizing routes to implementing AI-driven tracking, we stay ahead of 
                      the curve to provide unmatched service quality.
                    </p>
                  </div>
                  
                  {/* <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="mt-10 bg-blue-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all w-fit"
                  >
                    Contact Expert
                  </motion.button> */}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default NewsSection;