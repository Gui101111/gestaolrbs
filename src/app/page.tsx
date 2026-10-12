import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { SocialProof } from "@/components/SocialProof";
import { BuildYourCup } from "@/components/BuildYourCup";
import { Marquee } from "@/components/Marquee";
import { ToppingsSection } from "@/components/ToppingsSection";
import { AboutSection } from "@/components/AboutSection";
import { Gallery } from "@/components/Gallery";
import { EnvironmentSection } from "@/components/EnvironmentSection";
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
        <BuildYourCup />
        <Marquee />
        <ToppingsSection />
        <AboutSection />
        <Gallery />
        <EnvironmentSection />
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
