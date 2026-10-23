import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Optional password for opening the app from another device, such as a phone
 * on the same Wi-Fi. It comes from APP_PASSWORD in `.env.local`; without it the
 * app is open to anyone who can reach the port, which is fine on 127.0.0.1.
 */

export const ACCESS_COOKIE = "da_acesso";

export function accessPassword(): string {
  return process.env.APP_PASSWORD ?? "";
}

/**
 * The cookie holds a hash of the password rather than a session id, so there
 * is no session store and changing the password signs every device out.
 * iniciar-app.ps1 derives the same value to call the API after startup.
 */
export function accessToken(password: string): string {
  return createHash("sha256").update(`diogo-automates:${password}`).digest("hex");
}

/** Constant-time comparison that also hides the length of the expected value. */
export function safeEqual(a: string, b: string): boolean {
  const x = createHash("sha256").update(a).digest();
  const y = createHash("sha256").update(b).digest();
  return timingSafeEqual(x, y);
}
