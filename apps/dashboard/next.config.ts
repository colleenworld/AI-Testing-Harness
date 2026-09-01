import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
    allowedDevOrigins: ['192.168.1.78'],
    transpilePackages: ['@repo/types', '@repo/utils'],

    // Optional but recommended for monorepos: ensures cleaner terminal output
    logging: {
        fetches: {
            fullUrl: true,
        },
    },
};

export default nextConfig;


