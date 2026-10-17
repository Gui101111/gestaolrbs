import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin TRIBUNA" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();
  return (
    <div className="min-h-dvh bg-ink">
      <header className="sticky top-0 z-30 border-b border-fg/[0.06] bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 md:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Logo href="/admin" />
              <span className="hidden items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-[0.625rem] font-semibold tracking-[0.2em] text-gold-light uppercase sm:inline-flex">
                <Shield className="size-3" /> Admin
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="hidden text-mist md:inline">{profile.full_name}</span>
              <Link href="/app" className="inline-flex items-center gap-1.5 text-mist transition hover:text-ivory">
                <ArrowLeft className="size-4" /> Painel
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
