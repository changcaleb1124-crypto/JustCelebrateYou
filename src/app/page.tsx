import Navbar from '@/components/Navbar';
import LandingHero from '@/components/landing/LandingHero';
import DemoPreview from '@/components/landing/DemoPreview';
import HowItWorks from '@/components/landing/HowItWorks';
import KeepsakeSpotlight from '@/components/landing/KeepsakeSpotlight';
import OccasionsGrid from '@/components/landing/OccasionsGrid';
import FAQSection from '@/components/landing/FAQSection';
import LandingFooter from '@/components/landing/LandingFooter';

export default function LandingPage() {
    return (
        <div className="landing-wrapper">
            <Navbar isLanding={true} />
            <main>
                <LandingHero />
                <DemoPreview />
                <HowItWorks />
                <KeepsakeSpotlight />
                <OccasionsGrid />
                <FAQSection />
                <LandingFooter />
            </main>
        </div>
    );
}
