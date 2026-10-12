import { business } from "@/data/business";

export function LocalBusinessSchema() {
  const { address } = business;
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "IceCreamShop",
    name: business.fullName,
    alternateName: "Berry's Porto Seguro",
    telephone: business.phoneDisplayIntl,
    image: business.siteUrl ? `${business.siteUrl}/og-image.jpg` : undefined,
    url: business.siteUrl || undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: address.street,
      addressLocality: address.city,
      addressRegion: address.state,
      postalCode: address.postalCode || undefined,
      addressCountry: address.countryCode,
    },
    sameAs: [business.instagramUrl],
  };
  if (business.geo) {
    schema.geo = { "@type": "GeoCoordinates", ...business.geo };
  }
  if (business.openingHours.length) {
    schema.openingHours = business.openingHours;
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
