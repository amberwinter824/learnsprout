import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  // Output configuration for better Vercel deployment
  output: 'standalone',
  
  // Explicitly set swcMinify
  swcMinify: true,
  
  // Critical: This prevents errors with Firebase in server components
  experimental: {
    serverComponentsExternalPackages: ['firebase', 'firebase-admin'],
  },
  
  // Important for dynamic routes (prevents static generation of auth routes)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store',
          },
        ],
      },
    ];
  },
};

// Configure PWA
const pwaConfig = {
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // Use your existing service worker file
  sw: 'service-worker.js',
  // Exclude manifest from the build process
  buildExcludes: [/manifest\.json$/]
};

// Apply PWA configuration to Next.js config
export default withPWA(pwaConfig)(nextConfig);