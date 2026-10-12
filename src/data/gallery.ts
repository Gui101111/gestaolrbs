import { photos, type Photo } from "./images";

export type GalleryItem = Photo & { caption: string; layout: string };

// `layout` define a posição no grid desktop (masonry assimétrico).
export const gallery: GalleryItem[] = [
  { ...photos.fachada, caption: "Nossa fachada", layout: "md:col-start-1 md:row-start-1 md:row-span-2 lg:col-start-1 lg:row-start-1 lg:row-span-2" },
  { ...photos.interior, caption: "O espaço", layout: "md:col-start-2 md:row-start-1 md:col-span-2 lg:col-start-2 lg:row-start-1 lg:col-span-2" },
  { ...photos.toppings, caption: "Complementos", layout: "md:col-start-2 md:row-start-2 lg:col-start-4 lg:row-start-1" },
  { ...photos.selfService, caption: "Self-service", layout: "md:col-start-3 md:row-start-2 lg:col-start-4 lg:row-start-2 lg:row-span-2" },
  { ...photos.ambiente, caption: "Ambiente", layout: "md:col-start-1 md:row-start-3 lg:col-start-2 lg:row-start-2 lg:col-span-2" },
  { ...photos.balcao, caption: "O balcão", layout: "md:col-start-2 md:row-start-3 md:col-span-2 lg:col-start-1 lg:row-start-3 lg:col-span-3" },
];
