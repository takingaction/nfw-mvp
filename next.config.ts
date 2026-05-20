import type { NextConfig } from "next";

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
