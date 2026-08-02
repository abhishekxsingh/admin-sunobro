import type { NextConfig } from "next";

const BACKEND_URL =
  "https://preflight-hdfabqd3apc5bjfu.centralindia-01.azurewebsites.net";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        // Browser → same-origin /api/* (no CORS) → Azure backend
        source: "/api/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
