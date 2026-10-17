import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/auth/dal";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin TRIBUNA" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="glass-strong sticky top-0 z-30 border-x-0 border-t-0">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 md:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Logo href="/admin" />
              <span className="hidden items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-[0.625rem] font-semibold tracking-[0.2em] text-gold-2 uppercase sm:inline-flex">
                <Shield className="size-3" /> Admin
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="hidden text-fg-2 md:inline">{profile.full_name}</span>
              <Link href={ROUTES.app} className="inline-flex items-center gap-1.5 text-fg-2 transition hover:text-fg">
                <ArrowLeft className="size-4" /> Voltar ao app
              </Link>
            </div>
          </div>
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">{children}</main>
    </div>
  );
}
