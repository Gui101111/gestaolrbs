import { siteConfig } from "@/config/site";

function esc(v: string) {
  return v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout({ eyebrow, title, body, cta }: { eyebrow: string; title: string; body: string; cta?: { label: string; href: string } }) {
  const button = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px"><tr><td style="border-radius:999px;background:#C6A15B;background-image:linear-gradient(135deg,#8C6B2F,#E1C487 45%,#C6A15B);">
        <a href="${cta.href}" style="display:inline-block;padding:15px 30px;font-size:12px;font-weight:bold;letter-spacing:2.5px;text-transform:uppercase;color:#140F06;text-decoration:none;">${esc(cta.label)}</a>
       </td></tr></table>`
    : "";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#07090C;font-family:Helvetica,Arial,sans-serif;color:#F5F5F2;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#07090C;padding:40px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td align="center" style="padding-bottom:28px;"><span style="font-family:Georgia,serif;font-size:22px;letter-spacing:8px;color:#E1C487;">${esc(siteConfig.name)}</span></td></tr>
<tr><td style="background:#0D1015;border:1px solid rgba(198,161,91,0.35);border-radius:20px;padding:40px 36px;">
<p style="margin:0 0 8px;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#C6A15B;">${esc(eyebrow)}</p>
<h1 style="margin:0 0 18px;font-family:Georgia,serif;font-weight:normal;font-size:28px;line-height:1.25;color:#F5F5F2;">${esc(title)}</h1>
<div style="font-size:15px;line-height:1.7;color:#A6ABB4;">${body}</div>${button}
</td></tr>
<tr><td align="center" style="padding-top:24px;font-size:11px;line-height:1.6;color:#5C6169;">${esc(siteConfig.legal.companyName)} · ${esc(siteConfig.contact.support)}</td></tr>
</table></td></tr></table></body></html>`;
}

const url = (path: string) => `${siteConfig.url.replace(/\/$/, "")}${path}`;

export const emailTemplates = {
  welcome: (name: string) => ({
    subject: `Bem-vindo(a) à ${siteConfig.name}`,
    html: layout({
      eyebrow: "Conta ativa",
      title: `Olá, ${esc(name || "Dr(a).")}. Sua conta está pronta.`,
      body: "<p>Você já pode enviar seu primeiro vídeo. Grave como sempre gravou — a plataforma cuida dos cortes, legendas e formatos.</p><p>Dica: salve a identidade do seu escritório em <strong>Minha Marca</strong> para aplicá-la automaticamente.</p>",
      cta: { label: "Criar primeiro projeto", href: url("/app/projetos/novo") },
    }),
  }),
  projectReceived: (name: string, projectName: string, projectId: string) => ({
    subject: `Recebemos seu vídeo: ${projectName}`,
    html: layout({
      eyebrow: "Projeto na fila",
      title: "Seu vídeo entrou em edição.",
      body: `<p>${esc(name || "Olá")}, o projeto <strong>${esc(projectName)}</strong> foi recebido e está na fila de processamento. Avisaremos assim que estiver pronto.</p>`,
      cta: { label: "Acompanhar processamento", href: url(`/app/projetos/${projectId}`) },
    }),
  }),
  videoReady: (name: string, projectName: string, projectId: string) => ({
    subject: `Seu vídeo está pronto: ${projectName}`,
    html: layout({
      eyebrow: "Vídeo pronto",
      title: "Seu vídeo está pronto.",
      body: `<p>${esc(name || "Olá")}, a edição de <strong>${esc(projectName)}</strong> foi concluída. Assista, compare com o original e baixe em MP4.</p>`,
      cta: { label: "Ver vídeo", href: url(`/app/projetos/${projectId}`) },
    }),
  }),
  revisionDone: (name: string, projectName: string, projectId: string) => ({
    subject: `Ajuste concluído: ${projectName}`,
    html: layout({
      eyebrow: "Ajuste concluído",
      title: "O ajuste solicitado foi aplicado.",
      body: `<p>${esc(name || "Olá")}, a nova versão de <strong>${esc(projectName)}</strong> já está disponível.</p>`,
      cta: { label: "Ver nova versão", href: url(`/app/projetos/${projectId}`) },
    }),
  }),
  paymentConfirmed: (name: string, planName: string) => ({
    subject: "Pagamento confirmado",
    html: layout({
      eyebrow: "Assinatura",
      title: "Pagamento confirmado.",
      body: `<p>${esc(name || "Olá")}, recebemos o pagamento do <strong>${esc(planName)}</strong>. Sua assinatura está ativa.</p>`,
      cta: { label: "Abrir painel", href: url("/app") },
    }),
  }),
  paymentFailed: (name: string, planName: string) => ({
    subject: "Não conseguimos processar seu pagamento",
    html: layout({
      eyebrow: "Assinatura",
      title: "Pagamento pendente.",
      body: `<p>${esc(name || "Olá")}, não identificamos o pagamento do <strong>${esc(planName)}</strong>. Atualize a forma de pagamento para continuar criando projetos.</p>`,
      cta: { label: "Ver assinatura", href: url("/app/assinatura") },
    }),
  }),
  adminNewProject: (projectName: string, projectId: string, userEmail: string) => ({
    subject: `[Fila] Novo projeto: ${projectName}`,
    html: layout({
      eyebrow: "Admin",
      title: "Novo projeto na fila.",
      body: `<p><strong>${esc(projectName)}</strong> enviado por ${esc(userEmail)}.</p>`,
      cta: { label: "Abrir no admin", href: url(`/admin/projetos/${projectId}`) },
    }),
  }),
};
