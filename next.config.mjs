/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  // Enable strict mode for better error detection
  reactStrictMode: true,
  // Remove the standalone output for Vercel deployment
  // output: 'standalone'
  
  // Explicitly set the build directory
  distDir: '.next'
};

export default nextConfig;