import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/projects/status-badge";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/dal";
import { formatCurrency, formatRelative } from "@/lib/utils";

export default async function AdminOverview() {
  await requireAdmin();
  const admin = createAdminClient();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const [subs, submitted, queue, paid, waitlist, recent] = await Promise.all([
    admin.from("subscriptions").select("status", { count: "exact", head: true }).eq("status", "active"),
    admin.from("projects").select("id", { count: "exact", head: true }).gte("submitted_at", monthStart),
    admin.from("projects").select("id", { count: "exact", head: true }).in("status", ["queued", "processing", "revision_requested"]),
    admin.from("payments").select("amount_cents").in("status", ["confirmed", "received"]).gte("paid_at", monthStart),
    admin.from("waitlist").select("id", { count: "exact", head: true }),
    admin.from("projects").select("id, name, status, submitted_at, user_id").in("status", ["queued", "processing", "revision_requested", "failed"]).order("submitted_at", { ascending: true }).limit(8),
  ]);
  const revenue = (paid.data ?? []).reduce((s, p) => s + p.amount_cents, 0);
  const stats = [
    { label: "Assinantes ativos", value: String(subs.count ?? 0) },
    { label: "Vídeos enviados no mês", value: String(submitted.count ?? 0) },
    { label: "Na fila / em edição", value: String(queue.count ?? 0) },
    { label: "Receita confirmada no mês", value: formatCurrency(revenue) },
    { label: "Lista de espera", value: String(waitlist.count ?? 0) },
  ];
  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Admin" title="Visão geral" description="Operação da plataforma em tempo real." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-fg/[0.07] bg-fg/[0.02] p-5">
            <p className="text-xs text-mist">{s.label}</p>
            <p className="mt-3 font-display text-3xl text-ivory">{s.value}</p>
          </div>
        ))}
      </div>
      <section className="rounded-3xl border border-fg/[0.07] bg-fg/[0.02] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl text-ivory">Próximos da fila</h2>
          <Link href="/admin/projetos" className="inline-flex items-center gap-1 text-sm text-gold hover:text-gold-light">
            Ver fila <ArrowRight className="size-4" />
          </Link>
        </div>
        {recent.data?.length ? (
          <ul className="divide-y divide-fg/[0.05]">
            {recent.data.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/projetos/${p.id}`} className="flex items-center justify-between gap-4 py-3 transition hover:text-gold-light">
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-ivory">{p.name}</span>
                    <span className="text-xs text-mist">enviado {formatRelative(p.submitted_at)}</span>
                  </span>
                  <StatusBadge status={p.status} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-mist">Fila vazia.</p>
        )}
      </section>
    </div>
  );
}
