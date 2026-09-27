import type { NextConfig } from "next";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  "https://preflight-hdfabqd3apc5bjfu.centralindia-01.azurewebsites.net";

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
