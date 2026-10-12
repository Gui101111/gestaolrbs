import type { Metadata, Viewport } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/caveat";
import "./globals.css";
import { business } from "@/data/business";
import { LocalBusinessSchema } from "@/components/LocalBusinessSchema";
import { Providers } from "@/components/Providers";

const title = "Berry's Porto Seguro | Sorvete Artesanal & Self-Service";
const description =
  "Conheça a Berry's em Porto Seguro: sorvete artesanal, experiência self-service e um espaço especial no centro da cidade. Venha montar sua combinação.";

export const metadata: Metadata = {
  ...(business.siteUrl ? { metadataBase: new URL(business.siteUrl), alternates: { canonical: "/" } } : {}),
  title: { default: title, template: "%s | Berry's Porto Seguro" },
  description,
  applicationName: business.fullName,
  keywords: [
    "Berry's Porto Seguro",
    "Berry's Iced Food",
    "sorvete Porto Seguro",
    "sorveteria Porto Seguro",
    "sorvete artesanal Porto Seguro",
    "self-service sorvete Porto Seguro",
  ],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: business.fullName,
    title,
    description,
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Berry's Iced Food – Porto Seguro" }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/og-image.jpg"] },
  icons: { icon: "/icon.svg" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#25A9D6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:font-semibold focus:text-navy focus:shadow-lift"
        >
          Pular para o conteúdo
        </a>
        <Providers>{children}</Providers>
        <LocalBusinessSchema />
      </body>
    </html>
  );
}
