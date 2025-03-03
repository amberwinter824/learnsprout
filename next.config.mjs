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

export default nextConfig;