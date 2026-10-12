import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { SocialProof } from "@/components/SocialProof";
import { SelfServiceSection } from "@/components/SelfServiceSection";
import { ToppingsSection } from "@/components/ToppingsSection";
import { AboutSection } from "@/components/AboutSection";
import { EnvironmentSection } from "@/components/EnvironmentSection";
import { Gallery } from "@/components/Gallery";
import { LocationSection } from "@/components/LocationSection";
import { InstagramSection } from "@/components/InstagramSection";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";
import { WhatsAppFloatingButton } from "@/components/WhatsAppFloatingButton";

export default function Home() {
  return (
    <>
      <Header />
      <main id="conteudo">
        <Hero />
        <SocialProof />
        <SelfServiceSection />
        <ToppingsSection />
        <AboutSection />
        <EnvironmentSection />
        <Gallery />
        <LocationSection />
        <InstagramSection />
        <FinalCTA />
      </main>
      <Footer />
      <aside aria-label="Contato rápido">
        <WhatsAppFloatingButton />
      </aside>
    </>
  );
}
