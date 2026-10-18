import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/** Na Vercel, sem NEXT_PUBLIC_SITE_URL, usa o domínio de produção do projeto. */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined);

const nextConfig: NextConfig = {
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  env: siteUrl ? { NEXT_PUBLIC_SITE_URL: siteUrl } : {},
  poweredByHeader: false,
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    qualities: [75, 90],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  async redirects() {
    return [
      { source: "/login", destination: "/entrar", permanent: true },
      { source: "/register", destination: "/criar-conta", permanent: true },
      { source: "/verify-email", destination: "/verificar-email", permanent: true },
      { source: "/forgot-password", destination: "/recuperar-senha", permanent: true },
      { source: "/reset-password", destination: "/nova-senha", permanent: true },
      { source: "/app/biblioteca", destination: "/app/projetos", permanent: true },
      { source: "/app/projetos/novo", destination: "/app/novo", permanent: true },
      { source: "/app/perfil", destination: "/app/configuracoes?aba=conta", permanent: true },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/media/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/vendor/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800" }],
      },
    ];
  },
};

export default nextConfig;
