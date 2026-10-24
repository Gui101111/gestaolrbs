import { Hero } from "@/components/landing/hero";
import { Steps } from "@/components/landing/steps";
import { FinalCta } from "@/components/landing/final-cta";
import { DockedStatue, StatueDockProvider } from "@/components/landing/statue-dock";
import { getSessionUser } from "@/lib/auth/dal";

export default async function HomePage() {
  const authed = Boolean(await getSessionUser());
  return (
    <StatueDockProvider>
      <Hero isAuthenticated={authed} />
      <Steps />
      <FinalCta isAuthenticated={authed} />
      <DockedStatue />
    </StatueDockProvider>
  );
}
