// frontend/next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      enabled: false, // ✅ 正确禁用 Turbopack
    },
    
  },
  reactStrictMode: true,
};

export default nextConfig;