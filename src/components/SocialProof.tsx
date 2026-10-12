"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useReducedMotion } from "framer-motion";
import { business, formatRating } from "@/data/business";
import { GoogleIcon } from "./icons";
import { ease } from "@/lib/animations";

function CountUp({ to, decimals = 0, prefix = "" }: { to: number; decimals?: number; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? to : 0);

  useEffect(() => {
    if (!inView || reduce) return;
    const c = animate(0, to, { duration: 1.4, ease, onUpdate: setValue });
    return () => c.stop();
  }, [inView, reduce, to]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {decimals ? value.toFixed(decimals).replace(".", ",") : Math.round(value)}
    </span>
  );
}

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

export function SocialProof() {
  // Arredonda para baixo à centena: "Mais de 200 avaliações"
  const rounded = Math.floor(business.reviewCount / 100) * 100;

  return (
    <section aria-label="Avaliações e destaques" className="relative z-10 bg-white">
      <motion.ul
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.5 }}
        variants={{ show: { transition: { staggerChildren: 0.1 } } }}
        className="container-x grid grid-cols-2 gap-y-6 py-8 md:grid-cols-4 md:divide-x md:divide-navy/10 md:py-10"
      >
        <motion.li variants={item} className="col-span-2 flex items-center justify-center gap-3 md:col-span-1">
          <GoogleIcon className="size-7 shrink-0" />
          <div>
            <p className="flex items-center gap-1 text-[#f5b301]" aria-hidden="true">
              {"★★★★★"}
            </p>
            <p className="font-display text-lg font-extrabold text-navy">
              <CountUp to={business.rating} decimals={1} /> no Google
            </p>
            <span className="sr-only">Nota {formatRating(business.rating)} de 5 no Google</span>
          </div>
        </motion.li>
        <motion.li variants={item} className="flex flex-col items-center justify-center text-center">
          <p className="font-display text-lg font-extrabold text-navy">
            <CountUp to={rounded} prefix="+" />
          </p>
          <p className="text-sm text-ink/65">avaliações</p>
        </motion.li>
        <motion.li variants={item} className="flex flex-col items-center justify-center text-center">
          <p className="font-display text-lg font-extrabold text-navy">Porto Seguro</p>
          <p className="text-sm text-ink/65">Centro – BA</p>
        </motion.li>
        <motion.li variants={item} className="col-span-2 flex flex-col items-center justify-center text-center md:col-span-1">
          <p className="font-display text-lg font-extrabold text-navy">Self-service</p>
          <p className="text-sm text-ink/65">monte do seu jeito</p>
        </motion.li>
      </motion.ul>
    </section>
  );
}
