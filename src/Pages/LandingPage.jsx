import Header from '../Components/LandingPage/Header'
import HeroSection from '../Components/LandingPage/HeroSection'
import TrustSection from '../Components/LandingPage/TrustSection'
import EfficientFreight from '../Components/LandingPage/EfficientFreight'
import OneTrackTransit from '../Components/LandingPage/OneTrackTransit'
import IndustrySection from '../Components/LandingPage/IndustrySection'
import TeamSection from '../Components/LandingPage/TeamSection'
import NewsSection from '../Components/LandingPage/NewsSection'
import Footer from '../Components/LandingPage/Footer'
import FormSection from '../Components/LandingPage/FormSection'

function LandingPage() {
  return (
    <div className="min-h-screen">
      <section id="home" className="scroll-mt-32">
        <Header />
      </section>
     
      <HeroSection />
      
      <EfficientFreight />
      <TrustSection />
      
      <section id="shipment" className="scroll-mt-32">
        <OneTrackTransit />
      </section>

      <section id="industries" className="scroll-mt-32">
        <IndustrySection />
      </section>

      <section id="about" className="scroll-mt-32">
        <TeamSection />
      </section>

      <section id="news" className="scroll-mt-32">
        <NewsSection />
      </section>

      <section id="contact" className="scroll-mt-32">
        <FormSection/>
      </section>

      <Footer />
      
    </div>
  )
}

export default LandingPage
