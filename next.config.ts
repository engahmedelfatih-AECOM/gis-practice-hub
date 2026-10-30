import type { NextConfig } from "next";

/**
 * Cache Components are intentionally disabled. Every screen in this application
 * renders per-request, scoped to the signed-in user, so a static shell has no
 * value and the Suspense-everywhere model only adds noise (see ADR-004).
 */
const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["pino", "pino-pretty", "postgres", "nodemailer"],
  experimental: {
    // Workbook uploads on the Administration > Import screen.
    serverActions: { bodySizeLimit: "25mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
