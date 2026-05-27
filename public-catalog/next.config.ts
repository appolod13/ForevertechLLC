import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@napi-rs/canvas"],
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
};

export default nextConfig;
