/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  // Using ESM format with .mjs extension
  // Add output configuration for better Vercel deployment
  output: 'standalone',
  
  // Explicitly set swcMinify
  swcMinify: true,
  
  // Enable app directory (only needed for Next.js versions before 13.4)
  // experimental: {
  //   appDir: true,
  // },
};

export default nextConfig;