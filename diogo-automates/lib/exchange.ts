import { getSetting, setSetting } from "./db";
import type { ExchangeRate } from "./currency";

const CACHE_KEY = "usd_brl_quote";
const REFRESH_MS = 60 * 60 * 1000;
let retryAt = 0;
let pending: Promise<ExchangeRate | null> | null = null;

function validQuote(value: unknown): value is ExchangeRate {
  if (!value || typeof value !== "object") return false;
  const quote = value as ExchangeRate;
  return Number.isFinite(quote.rate) && quote.rate > 0 &&
    typeof quote.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(quote.date) &&
    Number.isFinite(Date.parse(quote.date)) && Number.isFinite(quote.fetchedAt);
}

/** Public reference quote only: no account data or API keys leave this app. */
export async function getExchangeRate(): Promise<ExchangeRate | null> {
  let cached: ExchangeRate | null = null;
  try {
    const stored: unknown = JSON.parse(getSetting(CACHE_KEY) ?? "null");
    if (validQuote(stored)) cached = stored;
  } catch { /* Invalid cache is treated as unavailable. */ }

  if (cached && Date.now() - cached.fetchedAt < REFRESH_MS) return { ...cached, stale: false };
  if (Date.now() < retryAt) return cached ? { ...cached, stale: true } : null;
  if (pending) return pending;

  pending = (async () => {
    try {
      const response = await fetch("https://api.frankfurter.dev/v2/rate/USD/BRL", {
        cache: "no-store", signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) throw new Error("Cotação indisponível");
      const data = await response.json();
      const quote = { rate: data.rate, date: data.date, fetchedAt: Date.now(), stale: false };
      if (data.base !== "USD" || data.quote !== "BRL" || !validQuote(quote)) throw new Error("Cotação inválida");
      setSetting(CACHE_KEY, JSON.stringify(quote));
      retryAt = 0;
      return quote;
    } catch {
      retryAt = Date.now() + 5 * 60 * 1000;
      return cached ? { ...cached, stale: true } : null;
    } finally {
      pending = null;
    }
  })();
  return pending;
}
