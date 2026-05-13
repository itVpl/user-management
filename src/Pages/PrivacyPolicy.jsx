import React, { useState, useEffect } from "react";

const sections = [
  {
    id: "information",
    title: "Information We Collect",
    content: [
      "Personal Identification Information: Name, email address, phone number, and address when you register or use our services.",
      "Location Data: With your permission, we collect real-time location data to provide logistics and delivery tracking services.",
      "Device Information: Device type, operating system, unique device identifiers, and mobile network information.",
      "Usage Data: Information on how you access and use the App, including log data, pages visited, and actions taken.",
    ],
  },
  {
    id: "usage",
    title: "How We Use Your Information",
    content: [
      "To provide, operate, and maintain our logistics services.",
      "To track and manage shipments and deliveries.",
      "To communicate with you about orders, updates, and support.",
      "To improve and personalize the App experience.",
      "To comply with legal obligations.",
    ],
  },
  {
    id: "sharing",
    title: "Sharing of Information",
    content: [
      "We do not sell or rent your personal data to third parties. We may share data with:",
      "Service Providers: Trusted third parties who assist in operating our app and services, under strict confidentiality agreements.",
      "Legal Requirements: When required by law or to protect our rights and users' safety.",
    ],
  },
  {
    id: "location",
    title: "Location Data",
    content: [
      "Our app uses location data to enable real-time shipment tracking and route optimization.",
      "Location access is only used while the app is in active use (foreground), unless you have explicitly granted background location access.",
      "You may revoke location permissions at any time through your device settings.",
    ],
  },
  {
    id: "retention",
    title: "Data Retention",
    content: [
      "We retain your personal data only as long as necessary to provide our services or as required by law.",
      "You may request deletion of your account and associated data by contacting us.",
    ],
  },
  {
    id: "security",
    title: "Security",
    content: [
      "We implement industry-standard security measures to protect your personal data.",
      "However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.",
    ],
  },
  {
    id: "children",
    title: "Children's Privacy",
    content: [
      "Our App is not directed to children under the age of 13.",
      "We do not knowingly collect personal data from children.",
      "If you believe a child has provided us with personal data, please contact us immediately.",
    ],
  },
  {
    id: "rights",
    title: "Your Rights",
    content: [
      "Depending on your location, you may have the right to:",
      "Access the personal data we hold about you.",
      "Request correction or deletion of your data.",
      "Object to or restrict processing of your data.",
      "Request data portability.",
      "To exercise these rights, contact us at the email below.",
    ],
  },
  {
    id: "changes",
    title: "Changes to This Policy",
    content: [
      "We may update this Privacy Policy from time to time.",
      "We will notify you of significant changes by updating the date at the top of this page.",
      "Continued use of the App after changes constitutes your acceptance of the revised policy.",
    ],
  },
  {
    id: "contact",
    title: "Contact Us",
    content: [
      "Company: V Power Logistics",
      "Website: https://vpower-logistics.com",
      "Email: support@vpower-logistics.com",
    ],
  },
];

const PrivacyPolicy = () => {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [activeSection, setActiveSection] = useState("information");

  const handleScroll = () => {
    setShowBackToTop(window.scrollY > 300);
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToSection = (id) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#ffffff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

        * {
          font-family: 'Poppins', 'Segoe UI', sans-serif;
        }

        :root {
          --primary: #1a472a;
          --accent: #ff6b35;
          --accent-light: #ffa500;
          --text-dark: #1a1a1a;
          --text-light: #666666;
          --bg-light: #f9fafb;
          --border: #e5e7eb;
          --success: #10b981;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .header-animate {
          animation: slideDown 0.6s ease-out;
        }

        .section-animate {
          animation: fadeIn 0.6s ease-out forwards;
        }

        .back-to-top-animate {
          animation: slideDown 0.3s ease-out;
        }

        .nav-link-active {
          color: var(--accent);
          background: white;
          box-shadow: 0 2px 8px rgba(26, 71, 42, 0.1);
        }

        .highlight-box {
          background: linear-gradient(120deg, rgba(255, 107, 53, 0.1) 0%, rgba(255, 165, 0, 0.1) 100%);
          border-left: 4px solid var(--accent);
        }

        .smooth-scroll {
          scroll-behavior: smooth;
        }

        .section-title-underline {
          background: linear-gradient(90deg, var(--accent) 0%, var(--accent-light) 100%);
        }

        @media (max-width: 768px) {
          .nav-scroll {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
        }
      `}</style>

      {/* Header */}
      <header className="header-animate" style={{
        background: "linear-gradient(135deg, #1a472a 0%, #0f3620 100%)",
        color: "white",
        padding: "3rem 2rem",
        textAlign: "center",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
      }}>
        <h1 style={{
          fontSize: "2.5rem",
          marginBottom: "0.5rem",
          fontWeight: "700",
          letterSpacing: "-0.5px",
        }}>
          <span style={{ color: "#ffa500" }}>V Power Logistics</span>
          <br />
          Privacy Policy
        </h1>
        <div style={{
          fontSize: "0.95rem",
          opacity: 0.9,
          marginTop: "0.5rem",
        }}>
          Last updated: May 12, 2026
        </div>
      </header>

      {/* Navigation */}
      <nav className="sticky top-0 z-50" style={{
        background: "#f9fafb",
        padding: "1.5rem 2rem",
        borderBottom: "2px solid #e5e7eb",
        animation: "slideDown 0.8s ease-out",
      }}>
        <div className="max-w-4xl mx-auto">
          <div className="nav-scroll flex flex-wrap gap-3 justify-center md:justify-start" style={{
            WebkitOverflowScrolling: "touch",
            paddingBottom: "0.5rem",
          }}>
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`whitespace-nowrap px-4 py-2 rounded transition-all duration-300 ${
                  activeSection === section.id ? "nav-link-active" : ""
                }`}
                style={{
                  color: activeSection === section.id ? "#ff6b35" : "#1a472a",
                  fontSize: "0.95rem",
                  fontWeight: "500",
                  background: activeSection === section.id ? "white" : "transparent",
                  boxShadow: activeSection === section.id ? "0 2px 4px rgba(26, 71, 42, 0.1)" : "none",
                  cursor: "pointer",
                  border: "none",
                }}
              >
                {section.title.split(" ").slice(0, 2).join(" ")}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Introduction */}
        <section className="section-animate mb-12" style={{ animationDelay: "0.1s" }}>
          <p style={{
            color: "#666666",
            marginBottom: "1.5rem",
            lineHeight: 1.8,
          }}>
            <strong style={{ color: "#1a1a1a" }}>V Power Logistics</strong> ("we", "our", or "us") operates the V Power Logistics mobile application (the "App"). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our App and the choices you have associated with that data.
          </p>
          <div className="highlight-box p-6 rounded" style={{
            fontStyle: "italic",
            color: "#1a1a1a",
          }}>
            <p style={{ margin: 0 }}>
              We are committed to protecting your privacy and ensuring you have a positive experience on our platform. Please read this policy carefully to understand our practices.
            </p>
          </div>
        </section>

        {/* Sections */}
        {sections.map((section, index) => (
          <section
            key={section.id}
            id={section.id}
            className="section-animate mb-12"
            style={{
              animationDelay: `${(index + 2) * 0.1}s`,
            }}
            onMouseEnter={() => setActiveSection(section.id)}
          >
            <h2 style={{
              color: "#1a472a",
              fontSize: "1.5rem",
              marginBottom: "1rem",
              paddingBottom: "0.75rem",
              borderBottom: "3px solid #ff6b35",
              display: "inline-block",
              fontWeight: "700",
            }}>
              {section.title}
            </h2>

            <ul style={{
              listStyle: "none",
              marginLeft: "1.5rem",
              marginBottom: "1rem",
              marginTop: "1rem",
              padding: 0,
            }}>
              {section.content.map((item, idx) => (
                <li
                  key={idx}
                  style={{
                    color: "#666666",
                    marginBottom: "0.75rem",
                    position: "relative",
                    paddingLeft: "1.5rem",
                    lineHeight: 1.8,
                    transition: "color 0.3s ease",
                  }}
                  onMouseEnter={(e) => e.target.style.color = "#1a472a"}
                  onMouseLeave={(e) => e.target.style.color = "#666666"}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      color: "#10b981",
                      fontWeight: "bold",
                      fontSize: "1.1rem",
                    }}
                  >
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            {section.id === "location" && (
              <div className="highlight-box p-6 rounded mt-4" style={{
                fontStyle: "italic",
                color: "#1a1a1a",
              }}>
                <p style={{ margin: 0 }}>
                  Your location privacy is important to us. You maintain full control over location permissions at all times.
                </p>
              </div>
            )}
          </section>
        ))}
      </main>

      {/* Footer */}
      <footer style={{
        background: "#1a472a",
        color: "white",
        padding: "2.5rem",
        textAlign: "center",
        marginTop: "4rem",
        borderTop: "4px solid #ff6b35",
      }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ marginBottom: "0.5rem", color: "rgba(255, 255, 255, 0.9)" }}>
            <strong style={{ color: "#ffa500" }}>V Power Logistics</strong>
          </p>
          <p style={{ marginBottom: "0.5rem", color: "rgba(255, 255, 255, 0.9)" }}>
            Professional Logistics Solutions
          </p>
          <p style={{ marginBottom: "0.5rem" }}>
            Website:{" "}
            <a
              href="https://vpower-logistics.com"
              style={{
                color: "#ffa500",
                textDecoration: "none",
                transition: "opacity 0.3s ease",
              }}
              onMouseEnter={(e) => e.target.style.opacity = "0.8"}
              onMouseLeave={(e) => e.target.style.opacity = "1"}
            >
              vpower-logistics.com
            </a>
          </p>
          <p style={{ marginBottom: "0.5rem" }}>
            Email:{" "}
            <a
              href="mailto:support@vpower-logistics.com"
              style={{
                color: "#ffa500",
                textDecoration: "none",
                transition: "opacity 0.3s ease",
              }}
              onMouseEnter={(e) => e.target.style.opacity = "0.8"}
              onMouseLeave={(e) => e.target.style.opacity = "1"}
            >
              support@vpower-logistics.com
            </a>
          </p>
        </div>
        <div style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.2)",
          paddingTop: "1.5rem",
          marginTop: "1.5rem",
          fontSize: "0.9rem",
          opacity: 0.85,
        }}>
          <p style={{ marginBottom: "0.5rem" }}>
            &copy; 2026 V Power Logistics. All rights reserved.
          </p>
          <p>This Privacy Policy is effective as of May 12, 2026</p>
        </div>
      </footer>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="back-to-top-animate fixed bottom-8 right-8 z-40"
          style={{
            background: "#ff6b35",
            color: "white",
            width: "50px",
            height: "50px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            border: "none",
            fontWeight: "bold",
            fontSize: "1.2rem",
            boxShadow: "0 4px 12px rgba(255, 107, 53, 0.3)",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            e.target.style.background = "#ffa500";
            e.target.style.transform = "translateY(-3px)";
            e.target.style.boxShadow = "0 6px 16px rgba(255, 107, 53, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "#ff6b35";
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "0 4px 12px rgba(255, 107, 53, 0.3)";
          }}
        >
          ↑
        </button>
      )}
    </div>
  );
};

export default PrivacyPolicy;