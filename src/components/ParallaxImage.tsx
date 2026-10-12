"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import type { Photo } from "@/data/images";
import { cn } from "@/lib/utils";

/**
 * Foto com parallax leve + zoom lento conforme o scroll.
 * O container recorta a imagem (overflow-hidden); a imagem é levemente maior para o deslocamento.
 */
export function ParallaxImage({
  photo,
  className,
  sizes,
  strength = 40,
  zoom = false,
  priority,
  position = "center",
}: {
  photo: Photo;
  className?: string;
  sizes: string;
  strength?: number;
  zoom?: boolean;
  priority?: boolean;
  position?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-strength, strength]);
  const scale = useTransform(scrollYProgress, [0, 1], reduce || !zoom ? [1.08, 1.08] : [1.16, 1.04]);

  return (
    <div ref={ref} className={cn("relative overflow-hidden", className)}>
      <motion.div style={{ y, scale }} className="absolute inset-0 will-change-transform">
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          style={{ objectPosition: position }}
        />
      </motion.div>
    </div>
  );
}
