/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['nanoid', 'js-cookie', 'lucide-react'],
  webpack: (config, { isServer }) => {
    // Fix for js-cookie
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
}

export default nextConfig 