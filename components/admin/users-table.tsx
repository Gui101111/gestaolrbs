"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminSetRoleAction, adminSetUserPlanAction } from "@/lib/actions/admin";
import { formatDate } from "@/lib/utils";

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  createdAt: string;
  planName: string | null;
  subStatus: string | null;
  periodEnd: string | null;
  videos: number;
  projects: number;
};

export function UsersTable({ users, plans }: { users: AdminUserRow[]; plans: { id: string; name: string }[] }) {
  const router = useRouter();
  const [target, setTarget] = React.useState<AdminUserRow | null>(null);
  const [planId, setPlanId] = React.useState(plans[0]?.id ?? "");
  const [status, setStatus] = React.useState<"active" | "trialing">("active");
  const [days, setDays] = React.useState("30");
  const [q, setQ] = React.useState("");
  const [pending, start] = React.useTransition();
  const filtered = users.filter((u) => `${u.name ?? ""} ${u.email ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou e-mail" className="max-w-sm" aria-label="Buscar usuários" />
      <div className="overflow-x-auto rounded-3xl border border-fg/[0.07] bg-fg/[0.02]">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="border-b border-fg/[0.06] text-xs text-mist">
            <tr>
              <th className="px-5 py-3 font-medium">Usuário</th>
              <th className="px-5 py-3 font-medium">Plano</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Uso no ciclo</th>
              <th className="px-5 py-3 font-medium">Cadastro</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-fg/[0.04]">
                <td className="px-5 py-3.5">
                  <p className="text-ivory">
                    {u.name ?? "—"} {u.role === "admin" && <Badge variant="gold" className="ml-1">Admin</Badge>}
                  </p>
                  <p className="text-xs text-mist">{u.email}</p>
                </td>
                <td className="px-5 py-3.5 text-ivory/90">{u.planName ?? "—"}</td>
                <td className="px-5 py-3.5 text-mist">
                  {u.subStatus ?? "—"}
                  {u.periodEnd && <span className="block text-xs">até {formatDate(u.periodEnd)}</span>}
                </td>
                <td className="px-5 py-3.5 text-mist">
                  {u.videos} vídeos · {u.projects} projetos
                </td>
                <td className="px-5 py-3.5 text-mist">{formatDate(u.createdAt)}</td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setTarget(u)}>
                      Conceder plano
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          const res = await adminSetRoleAction(u.id, u.role === "admin" ? "user" : "admin");
                          if (!res.ok) return void toast.error(res.error);
                          toast.success("Perfil atualizado.");
                          router.refresh();
                        })
                      }
                    >
                      {u.role === "admin" ? "Remover admin" : "Tornar admin"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(target)} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conceder plano</DialogTitle>
            <DialogDescription>Ativa um plano manualmente para {target?.email} (cortesia, parceria ou cobrança fora da plataforma de pagamento).</DialogDescription>
          </DialogHeader>
          <Field label="Plano">
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger aria-label="Plano">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <Select value={status} onValueChange={(v) => setStatus(v as "active" | "trialing")}>
                <SelectTrigger aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="trialing">Avaliação</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Duração (dias)">
              <Input inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="gold"
              loading={pending}
              onClick={() =>
                target &&
                start(async () => {
                  const res = await adminSetUserPlanAction({ userId: target.id, planId, status, days: Number(days) || 30 });
                  if (!res.ok) return void toast.error(res.error);
                  toast.success("Plano concedido.");
                  setTarget(null);
                  router.refresh();
                })
              }
            >
              Conceder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
