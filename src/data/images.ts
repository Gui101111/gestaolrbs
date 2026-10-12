/**
 * Fotos do site. Os arquivos em /public/images são gerados por `npm run images`
 * a partir dos originais em /assets-src (veja scripts/process-images.mjs).
 */
export type Photo = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export const photos = {
  interior: {
    src: "/images/interior.webp",
    alt: "Interior da Berry's em Porto Seguro, com balcão de sorvetes, madeira e detalhes em azul",
    width: 1220,
    height: 1166,
  },
  balcao: {
    src: "/images/balcao.webp",
    alt: "Vista ampla do balcão self-service de sorvetes da Berry's",
    width: 1220,
    height: 1600,
  },
  selfService: {
    src: "/images/self-service.webp",
    alt: "Balcão self-service de sorvete artesanal visto de perto",
    width: 1220,
    height: 1600,
  },
  toppings: {
    src: "/images/toppings.webp",
    alt: "Complementos, coberturas e caldas para montar o sorvete",
    width: 1220,
    height: 1193,
  },
  ambiente: {
    src: "/images/ambiente.webp",
    alt: "Mesas e ambiente interno aconchegante da Berry's",
    width: 1220,
    height: 1193,
  },
  fachada: {
    src: "/images/fachada.webp",
    alt: "Fachada da Berry's à noite com a logomarca iluminada, na Av. 22 de Abril",
    width: 1220,
    height: 1600,
  },
  copos: {
    src: "/images/copos.webp",
    alt: "Copos de sorvete com a marca Berry's",
    width: 1220,
    height: 1275,
  },
  vaquinha: {
    src: "/images/vaquinha.webp",
    alt: "Vaquinha mascote da Berry's lambendo um sorvete de casquinha, ao lado de uma cerca",
    width: 1220,
    height: 1101,
  },
} satisfies Record<string, Photo>;
