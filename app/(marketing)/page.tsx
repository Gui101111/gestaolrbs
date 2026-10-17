import { Hero } from "@/components/landing/hero";
import { MarqueeBand } from "@/components/landing/marquee-band";
import { Explore } from "@/components/landing/explore";
import { FinalCta } from "@/components/landing/final-cta";
import { DockedStatue, StatueDockProvider } from "@/components/landing/statue-dock";
import { getSessionUser } from "@/lib/auth/dal";
import { getPublicPlans } from "@/services/billing/plans";

export default async function HomePage() {
  const [user, plans] = await Promise.all([getSessionUser(), getPublicPlans()]);
  const authed = Boolean(user);
  return (
    <StatueDockProvider>
      <Hero isAuthenticated={authed} />
      <MarqueeBand />
      <Explore plans={plans} isAuthenticated={authed} />
      <FinalCta isAuthenticated={authed} />
      <DockedStatue />
    </StatueDockProvider>
  );
}
