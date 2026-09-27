import type { NextConfig } from "next";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  "http://localhost:3000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL.replace(/\/$/, "")}/:path*`,
      },
    ];
  },
};

export default nextConfig;
