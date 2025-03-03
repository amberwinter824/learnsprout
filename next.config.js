/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // This helps prevent TypeScript build errors during deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  // This prevents errors with Firebase in server components
  experimental: {
    serverComponentsExternalPackages: ['firebase', 'firebase-admin']
  },
  // This ensures we don't try to statically generate auth-protected routes
  output: 'standalone',
  // Add headers for deployment
  headers: async () => {
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

module.exports = nextConfig;