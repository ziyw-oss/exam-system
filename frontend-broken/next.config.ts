import type { NextConfig } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5001";

const nextConfig: NextConfig = {
  // No rewrites or redirects here — handled by middleware
};

console.log("🌍 Loaded NEXT_PUBLIC_API_BASE:", API_BASE);

export default nextConfig;