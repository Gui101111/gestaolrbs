import { Hero } from "@/components/landing/hero";
import { MarqueeBand } from "@/components/landing/marquee-band";
import { ProductDemo } from "@/components/landing/product-demo";
import { Manifesto } from "@/components/landing/manifesto";
import { HowItWorks } from "@/components/landing/how-it-works";
import { StylesShowcase } from "@/components/landing/styles-showcase";
import { FormatsSection } from "@/components/landing/formats-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { ForLawyers } from "@/components/landing/for-lawyers";
import { PricingSection } from "@/components/landing/pricing-section";
import { FaqSection } from "@/components/landing/faq-section";
import { FinalCta } from "@/components/landing/final-cta";
import { getSessionUser } from "@/lib/auth/dal";
import { getPublicPlans } from "@/services/billing/plans";

export default async function HomePage() {
  const [user, plans] = await Promise.all([getSessionUser(), getPublicPlans()]);
  const authed = Boolean(user);
  return (
    <>
      <Hero isAuthenticated={authed} />
      <MarqueeBand />
      <ProductDemo />
      <Manifesto />
      <HowItWorks />
      <StylesShowcase />
      <FormatsSection />
      <FeaturesSection />
      <ForLawyers />
      <PricingSection plans={plans} />
      <FaqSection />
      <FinalCta isAuthenticated={authed} />
    </>
  );
}
