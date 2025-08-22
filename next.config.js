/** @type {import('next').NextConfig} */
const nextConfig = {
  // (Kein turbo-Flag nötig. Du nutzt bereits Webpack – siehe Loader-Pfade im Log.)
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000'] },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.b-cdn.net' },
    ],
  },
};

module.exports = nextConfig;
