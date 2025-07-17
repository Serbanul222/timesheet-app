// next.config.ts - Complete fix: disable webpack cache to eliminate warning
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { dev }) => {
    // Completely disable webpack cache in development to eliminate the warning
    if (dev) {
      config.cache = false;
    }

    return config;
  },

  experimental: {
    // Package import optimizations to reduce bundle size
    optimizePackageImports: [
      '@tanstack/react-query',
      '@supabase/supabase-js',
      'react-hook-form',
      'date-fns',
      'zod',
    ],
  },

  // Basic optimizations
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;