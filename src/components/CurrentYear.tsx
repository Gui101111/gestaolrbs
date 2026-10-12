"use client";

import { useEffect, useState } from "react";

/** Ano atual calculado no navegador (não fica preso ao ano do build). */
export function CurrentYear() {
  const [year, setYear] = useState<number | null>(null);
  useEffect(() => setYear(new Date().getFullYear()), []);
  return <span suppressHydrationWarning>{year ?? new Date().getFullYear()}</span>;
}
