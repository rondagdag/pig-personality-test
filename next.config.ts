import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.blob.core.windows.net',
      },
    ],
  },
  async headers() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // In development, skip CSP entirely to avoid blocking Next.js dev features
    // In production, use strict CSP
    const headers = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'no-referrer-when-downgrade' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    ];

    // Only apply CSP in production
    if (!isDevelopment) {
      headers.push({
        key: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self'; img-src 'self' data: https:; connect-src 'self' https:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none';"
      });
    }
    
    return [
      {
        source: '/(.*)',
        headers,
      },
    ];
  },
};

export default nextConfig;
