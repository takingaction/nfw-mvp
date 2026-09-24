import type { NextConfig } from "next";

// 2026-09-24: invalidate stale Vercel build cache. The previous deploy
// restored a cached install of `next ^16.1.6` that resolved to 16.1.7 and
// failed to resolve '@vercel/turbopack-next/internal/font/google/font'
// during Turbopack's font processing. We pin `next` to "16.1.6" exactly
// in package.json; this comment is the cache-busting change so Vercel
// does a fresh install on the next deploy. Safe to remove in a future
// commit once the cache has been refreshed at least once.
const nextConfig: NextConfig = {
  trailingSlash: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.myshopify.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.shopify.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.vercel.app",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "static-stage.accessdevelopment.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "static.accessdevelopment.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "auth.nationalfundforwomen.org",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
