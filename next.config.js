/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    // Important: This prevents static generation for routes that need authentication
    experimental: {
      // This prevents errors with AuthProvider during build
      serverComponentsExternalPackages: ['firebase', 'firebase-admin']
    },
    // This ensures we don't try to statically generate auth-protected routes
    output: 'standalone',
    // Add Route Settings for dynamic routes
    routes: {
      // Make dashboard routes dynamic (not statically generated)
      '/dashboard': { dynamic: true },
      '/dashboard/**': { dynamic: true },
    },
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