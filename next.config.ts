import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
  /*
   * Remote image allow-list. The platform stores user-uploaded photos
   * (menu items, gallery, promotions, covers) on a variety of hosts —
   * Supabase Storage, Cloudinary, R2, and tenant-supplied URLs. Rather
   * than hardcode each, we allow any HTTPS source. Next/Image still
   * optimizes, caches, and serves them through the local _next/image
   * endpoint, so the security surface is the same as <img>.
   */
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24,
  },
  /*
   * Experimental: optimize package imports for faster cold starts and
   * smaller bundles. These are the heaviest libs in the dependency tree.
   */
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@radix-ui/react-icons",
      "date-fns",
    ],
  },
};

export default nextConfig;
