import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number | null | undefined, decimals = 1) {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)).toLocaleString("pt-BR")} ${sizes[i]}`;
}

export function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export function formatMinutes(minutes: number | null | undefined) {
  if (!minutes) return "0 min";
  if (minutes < 1) return `${Math.round(minutes * 60)} s`;
  return `${minutes.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} min`;
}

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  return dateFmt.format(typeof value === "string" ? new Date(value) : value).replace(".", "");
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  return dateTimeFmt.format(typeof value === "string" ? new Date(value) : value).replace(".", "");
}

export function formatRelative(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  const diff = (date.getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  }
  return "agora mesmo";
}

export function formatCurrency(cents: number | null | undefined, currency = "BRL") {
  if (cents == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

export function initials(name: string | null | undefined) {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/).filter((p) => !/^(dr|dra|de|da|do|dos|das)\.?$/i.test(p));
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function firstName(name: string | null | undefined) {
  if (!name) return "";
  return name.trim().split(/\s+/)[0] ?? "";
}

export function greeting(date = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(date),
  );
  if (hour < 5) return "Boa noite";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

/** Nome de arquivo seguro para o Storage. */
export function safeFileName(name: string) {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  return `${slugify(base) || "arquivo"}${ext ? `.${ext}` : ""}`;
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function absoluteUrl(path = "/") {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}
