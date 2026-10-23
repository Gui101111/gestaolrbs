import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the previous server's assets intact while preparing this update.
  distDir: ".next-local-v2",
  // better-sqlite3 is a native module and must not be bundled.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
