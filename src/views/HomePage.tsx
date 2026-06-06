import { HeroSection } from '@/views/home/HeroSection';
import { PillarsSection } from '@/views/home/PillarsSection';
import { FeaturesSection } from '@/views/home/FeaturesSection';
import { ResultsSection } from '@/views/home/ResultsSection';
import { InstallSection } from '@/views/home/InstallSection';

export default function HomePage() {
    return (
        <div className="bg-black">
            <HeroSection />
            <PillarsSection />
            <FeaturesSection />
            <ResultsSection />
            <InstallSection />
        </div>
    );
}
