import type { NextConfig } from "next";

// Where /api/* is proxied. NEXT_PUBLIC_API_BASE_URL is still honoured so
// existing deployments that set it keep pointing at the same backend.
const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
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
