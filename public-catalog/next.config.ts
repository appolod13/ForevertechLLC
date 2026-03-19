import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/studio",
        headers: [{ key: "cache-control", value: "no-store" }],
      },
      {
        source: "/studio/:path*",
        headers: [{ key: "cache-control", value: "no-store" }],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
