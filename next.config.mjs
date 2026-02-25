/** @type {import('next').NextConfig} */
const nextConfig = {
  // Experimental features for Next.js 16
  experimental: {
    // Enable proxy instead of middleware
    proxyTimeout: 30000,
  },

  // Production optimizations
  compress: true,
  poweredByHeader: false,

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
  },

  // Environment variables that should be available on the client
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
};

export default nextConfig;
