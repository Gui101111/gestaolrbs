"use client";

import { motion } from "framer-motion";
import { whatsappUrl } from "@/data/business";
import { WhatsAppIcon } from "./icons";
import { ease } from "@/lib/animations";

export function WhatsAppFloatingButton() {
  return (
    <motion.a
      href={whatsappUrl()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com a Berry's no WhatsApp"
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 1.6, duration: 0.6, ease }}
      className="group fixed bottom-5 right-5 z-40 flex h-14 items-center overflow-hidden rounded-full bg-[#0f7a3d] text-white shadow-[0_12px_30px_-10px_rgb(16_77_114/0.55)] transition-colors hover:bg-[#0b6331] md:bottom-7 md:right-7"
    >
      <span className="grid size-14 shrink-0 place-items-center">
        <WhatsAppIcon className="size-7" />
      </span>
      <span className="hidden max-w-0 whitespace-nowrap font-display text-sm font-bold opacity-0 transition-all duration-500 ease-out-soft md:inline group-hover:max-w-[180px] group-hover:pr-5 group-hover:opacity-100 group-focus-visible:max-w-[180px] group-focus-visible:pr-5 group-focus-visible:opacity-100">
        Fale com a gente
      </span>
    </motion.a>
  );
}
