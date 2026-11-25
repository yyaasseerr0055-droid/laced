import type { NextConfig } from "next";

// This app is fully live and per-user (login-protected), so we keep Next.js's
// classic rendering mode instead of the public-website caching mode.
const nextConfig: NextConfig = {
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
