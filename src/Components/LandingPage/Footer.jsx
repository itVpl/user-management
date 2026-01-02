import React from 'react';
import {
  Mail,
  PhoneCall,
} from 'lucide-react';

// Social Icons Components (Keeping your original SVGs)
const FacebookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="100%" height="100%">
    <path fill="#1877F2" d="M24 5A19 19 0 1 0 24 43A19 19 0 1 0 24 5Z" />
    <path fill="#fff" d="M26.572,29.036h4.917l0.772-4.995h-5.69v-2.73c0-2.075,0.678-3.915,2.619-3.915h3.119v-4.359c-0.548-0.074-1.707-0.236-3.897-0.236c-4.573,0-7.254,2.415-7.254,7.917v3.323h-4.701v4.995h4.701v13.729C22.089,42.905,23.032,43,24,43c0.875,0,1.729-0.08,2.572-0.194V29.036z" />
  </svg>
);
const LinkedInIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="100%" height="100%">
    <path fill="#0077B5" d="M42,37c0,2.762-2.238,5-5,5H11c-2.761,0-5-2.238-5-5V11c0-2.762,2.239-5,5-5h26c2.762,0,5,2.238,5,5V37z" />
    <path fill="#FFF" d="M12 19H17V36H12zM14.485 17h-.028C12.965 17 12 15.888 12 14.499 12 13.08 12.995 12 14.514 12c1.521 0 2.458 1.08 2.486 2.499C17 15.887 16.035 17 14.485 17zM36 36h-5v-9.099c0-2.198-1.225-3.698-3.192-3.698-1.501 0-2.313 1.012-2.707 1.99C24.957 25.543 25 26.511 25 27v9h-5V19h5v2.616C25.721 20.5 26.85 19 29.738 19c3.578 0 6.261 2.25 6.261 7.274L36 36 36 36z" />
  </svg>
);
const YouTubeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="100%" height="100%">
    <path fill="#FF0000" d="M43.2,33.9c-0.4,2.1-2.1,3.7-4.2,4c-3.3,0.5-8.8,1.1-15,1.1c-6.1,0-11.6-0.6-15-1.1c-2.1-0.3-3.8-1.9-4.2-4C4.4,31.6,4,28.2,4,24c0-4.2,0.4-7.6,0.8-9.9c0.4-2.1,2.1-3.7,4.2-4C12.3,9.6,17.8,9,24,9c6.2,0,11.6,0.6,15,1.1c2.1,0.3,3.8,1.9,4.2,4c0.4,2.3,0.9,5.7,0.9,9.9C44,28.2,43.6,31.6,43.2,33.9z" />
    <path fill="#FFF" d="M20 20L20 28L27 24z" />
  </svg>
);
const InstagramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="100%" height="100%">
    <radialGradient id="grad1" cx="19.38" cy="42.035" r="44.899" gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor="#fd5" />
      <stop offset=".328" stopColor="#ff543e" />
      <stop offset=".348" stopColor="#ff4858" />
      <stop offset=".504" stopColor="#d62976" />
      <stop offset=".643" stopColor="#962fbf" />
      <stop offset=".879" stopColor="#4f5bd5" />
    </radialGradient>
    <path fill="url(#grad1)" d="M38,42H10c-3.314,0-6-2.686-6-6V10c0-3.314,2.686-6,6-6h28c3.314,0,6,2.686,6,6v26C44,39.314,41.314,42,38,42z" />
    <path fill="#fff" d="M24 11A13 13 0 1 0 24 37A13 13 0 1 0 24 11Z" opacity=".1" />
    <path fill="#fff" d="M24,12c-6.627,0-12,5.373-12,12s5.373,12,12,12s12-5.373,12-12S30.627,12,24,12z M24,31c-3.866,0-7-3.134-7-7s3.134-7,7-7s7,3.134,7,7S27.866,31,24,31z M35.5,13.75c-0.69,0-1.25-0.56-1.25-1.25s0.56-1.25,1.25-1.25s1.25,0.56,1.25,1.25S36.19,13.75,35.5,13.75z" />
  </svg>
);

const Footer = () => {
  return (
    <footer className="bg-[#070707] text-white overflow-hidden relative">
      
      {/* Background Images Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Cargo Ship - Bottom Right */}
       <img
        src="/footerfreight.png"
        alt="Left background"
        className="absolute left-2 sm:left-10 md:left-16 top-80 md:top-40 sm:bottom-16 md:-bottom-10 w-[400px] sm:w-[200px] md:w-[500px] opacity-20 pointer-events-none select-none"
      />

      {/* === RIGHT Background Image === */}
      <img
        src="/footership.png"
        alt="Right background"
        className="absolute right-0 bottom-56 sm:bottom-40 w-[400px] sm:w-[300px] md:w-[500px] opacity-20 pointer-events-none select-none"
      />
      </div>

      {/* Glow Effect */}
      <div className="absolute inset-x-0 -top-20 md:-top-40 h-40 md:h-72 bg-blue-600/20 blur-3xl pointer-events-none z-0" />

      <div className="max-w-[1400px] mx-auto px-6 md:px-10 pt-16 pb-6 relative z-10">

        {/* ================= MAIN GRID ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

          {/* ===== BRAND ===== */}
          <div className="space-y-8 lg:col-span-2">
            <div className="flex items-center gap-4">
              <div className="inline-block bg-white rounded-xl overflow-hidden">
                <img src="/logo_vpower.png" alt="V Power Logo" className="h-12 md:h-16 w-auto p-2 object-contain" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div>
                <h2 className="text-xl md:text-2xl font-bold mb-3">India</h2>
                <p className="text-gray-400 leading-relaxed text-sm max-w-xs">
                  C-14, Udyog Vihar Phase V, Sector 19, V Power Logistics, Gurugram, Haryana 122008
                </p>
              </div>

              <div>
                <h2 className="text-xl md:text-2xl font-bold mb-3">USA</h2>
                <div className="flex flex-col gap-3">
                  <p className="text-gray-400 leading-relaxed text-sm">
                    100 N HOWARD ST STE R, <br className="hidden sm:block"/>SPOKANE WA, 99201
                  </p>
                  <p className="text-gray-400 leading-relaxed text-sm border-t border-white/5 pt-2">
                    53 Frontage Rd, 1st Floor, <br className="hidden sm:block"/>Hampton, New Jersey 08827
                  </p>
                </div>
              </div>
            </div>

            {/* Socials */}
            <div className="flex gap-4 pt-4">
              {[
                { Icon: FacebookIcon, href: "https://www.facebook.com" },
                { Icon: LinkedInIcon, href: "https://www.linkedin.com/company/v-power-logistics" },
                { Icon: YouTubeIcon, href: "https://www.youtube.com" },
                { Icon: InstagramIcon, href: "https://www.instagram.com" }
              ].map(({ Icon, href }, i) => (
                <a
                  key={i}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 flex items-center justify-center hover:scale-110 transition-transform duration-300"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* ===== LINKS SECTIONS ===== */}
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-2 lg:col-span-2">
            <div className="lg:pl-8">
              <h3 className="text-xl md:text-2xl font-bold mb-6">Company</h3>
              <ul className="space-y-3 text-gray-400">
                {['Home', 'Shipments', 'Industries', 'News', 'Contact Us'].map((item) => (
                   <li key={item}>
                   <a href={`#${item.toLowerCase()}`} className="hover:text-white transition-colors inline-block">{item}</a>
                 </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xl md:text-2xl font-bold mb-6">Solutions</h3>
              <ul className="space-y-3 text-gray-400">
                {[
                  'Ocean Freight',
                  'Container Shipping',
                  'Door-To-Door',
                  'Freight Forwarding',
                  'Reverse Logistics'
                ].map(item => (
                  <li key={item}>
                    <a href="#shipment" className="hover:text-white text-sm md:text-base hover:translate-x-1 inline-block transition">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ================= CONTACT STRIP ================= */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 border-b border-white/10 pb-8 mt-12">
          <h1
            className="text-[14vw] lg:text-[100px] font-black tracking-tight opacity-70 select-none leading-none"
            style={{
              WebkitTextStroke: '1px white',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Since. 2015
          </h1>

          <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-4">
            <a
              href="mailto:contact@vpower-logistics.com"
              className="flex items-center gap-3 bg-white/5 backdrop-blur border border-white/10 p-4 rounded-xl flex-1 lg:min-w-[280px] hover:bg-white/10 transition"
            >
              <div className="bg-yellow-400/20 p-2 rounded-lg text-yellow-400 shrink-0">
                <Mail size={20} fill="currentColor" />
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Email</p>
                <p className="text-sm font-bold truncate">contact@vpower-logistics.com</p>
              </div>
            </a>

            <a
              href="tel:+919310023990"
              className="flex items-center gap-3 bg-white/5 backdrop-blur border border-white/10 p-4 rounded-xl flex-1 lg:min-w-[240px] hover:bg-white/10 transition"
            >
              <div className="bg-orange-500/20 p-2 rounded-lg text-orange-500 shrink-0">
                <PhoneCall size={20} fill="currentColor" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Call Us</p>
                <p className="text-sm font-bold">(+91) 9310023990</p>
              </div>
            </a>
          </div>
        </div>

        {/* ================= FOOTER BOTTOM ================= */}
        <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] md:text-xs text-gray-500">
          <p className="text-center md:text-left">
            © 2026 <span className="text-white font-semibold">V Power</span>. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;