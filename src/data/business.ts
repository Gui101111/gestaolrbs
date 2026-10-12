/**
 * Dados centrais da Berry's. Altere aqui e o site inteiro é atualizado.
 * Não adicione informações não confirmadas (preços, horários, delivery etc.).
 */
export const business = {
  name: "Berry's",
  fullName: "Berry's Iced Food",
  tagline: "Uma experiência feita do seu jeito.",

  phone: "(73) 99853-3104",
  phoneE164: "+5573998533104",
  phoneDisplayIntl: "+55 73 99853-3104",
  whatsapp: "5573998533104",
  whatsappMessage:
    "Olá! Vi o site da Berry's Porto Seguro e gostaria de mais informações.",

  instagram: "@berrysportoseguro",
  instagramUrl: "https://www.instagram.com/berrysportoseguro",

  // Avaliação no Google — atualize a contagem quando aumentar.
  rating: 4.9,
  reviewCount: 240,

  address: {
    street: "Av. 22 de Abril, 329B",
    district: "Centro",
    city: "Porto Seguro",
    state: "BA",
    postalCode: "", // preencher quando confirmado
    country: "Brasil",
    countryCode: "BR",
  },

  // Preencher somente com coordenadas confirmadas (ex.: do Google Business Profile).
  geo: null as null | { latitude: number; longitude: number },

  // Horário de funcionamento: deixar vazio até confirmação.
  // Formato schema.org, ex.: ["Mo-Su 13:00-22:00"]
  openingHours: [] as string[],

  // Domínio definitivo (ex.: "https://berrysportoseguro.com.br"). Ativa canonical e URL no schema.
  siteUrl: "" as string,
} as const;

export const whatsappUrl = (message: string = business.whatsappMessage) =>
  `https://wa.me/${business.whatsapp}?text=${encodeURIComponent(message)}`;

const mapsQuery = `${business.fullName}, ${business.address.street}, ${business.address.city} ${business.address.state}`;

export const mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;

// Embed por pesquisa — não exige API key.
export const mapsEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapsQuery)}&output=embed`;

export const formatRating = (n: number) => n.toFixed(1).replace(".", ",");

export const navLinks = [
  { label: "Início", href: "#inicio" },
  { label: "A Berry's", href: "#a-berrys" },
  { label: "Experiência", href: "#experiencia" },
  { label: "Galeria", href: "#galeria" },
  { label: "Localização", href: "#localizacao" },
  { label: "Contato", href: "#contato" },
] as const;
