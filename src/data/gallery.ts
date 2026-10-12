import { photos, type Photo } from "./images";

export type GalleryItem = Photo & { caption: string };

export const gallery: GalleryItem[] = [
  { ...photos.interior, caption: "O espaço" },
  { ...photos.balcao, caption: "O balcão self-service" },
  { ...photos.toppings, caption: "Caldas e complementos" },
  { ...photos.fachada, caption: "Nossa fachada" },
  { ...photos.selfService, caption: "Monte do seu jeito" },
  { ...photos.ambiente, caption: "Ambiente" },
  { ...photos.copos, caption: "#loucosporsorvete" },
];
