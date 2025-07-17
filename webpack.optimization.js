// webpack.optimization.js - Utility for optimizing webpack cache
const path = require('path');

/**
 * Webpack cache optimization configuration
 * This helps resolve the "Serializing big strings" warning
 */
const optimizeWebpackCache = (config, { dev, isServer }) => {
  if (!dev) return config;

  // Configure filesystem cache with optimizations
  config.cache = {
    type: 'filesystem',
    cacheDirectory: path.resolve('.next/cache/webpack'),
    
    // Optimize cache store strategy
    store: 'pack',
    compression: 'gzip',
    
    // Reduce memory usage
    maxMemoryGenerations: 1,
    memoryCacheUnaffected: true,
    
    // Build dependencies for cache invalidation
    buildDependencies: {
      config: [__filename],
      tsconfig: [path.resolve('tsconfig.json')],
    },
    
    // Cache name with environment info
    name: `${dev ? 'development' : 'production'}-${isServer ? 'server' : 'client'}`,
    
    // Version for cache busting
    version: require('./package.json').version,
  };

  // Optimize module resolution
  config.resolve = {
    ...config.resolve,
    // Use aliases to reduce bundle size
    alias: {
      ...config.resolve?.alias,
      // Optimize React imports
      'react': require.resolve('react'),
      'react-dom': require.resolve('react-dom'),
    },
    // Optimize module extensions
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    // Reduce resolution attempts
    symlinks: false,
  };

  // Configure module rules to prevent large serialization
  const tsRule = {
    test: /\.(ts|tsx)$/,
    exclude: /node_modules/,
    use: [
      {
        loader: 'next/dist/compiled/babel-loader',
        options: {
          configFile: false,
          babelrc: false,
          presets: [
            ['next/babel', { 
              'preset-typescript': { allowNamespaces: true }
            }]
          ],
          // Optimize babel cache
          cacheDirectory: path.resolve('.next/cache/babel'),
          cacheCompression: true,
        },
      },
    ],
  };

  // Add optimized rules
  config.module.rules.push(tsRule);

  // Optimize chunks to prevent large string serialization
  config.optimization = {
    ...config.optimization,
    splitChunks: {
      chunks: 'all',
      minSize: 20000,
      maxSize: 200000, // Prevent chunks larger than 200KB
      cacheGroups: {
        // Vendor chunks
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
          maxSize: 200000,
        },
        
        // React specific chunk
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'react',
          chunks: 'all',
          priority: 20,
          maxSize: 100000,
        },
        
        // Supabase chunk
        supabase: {
          test: /[\\/]node_modules[\\/]@supabase[\\/]/,
          name: 'supabase',
          chunks: 'all',
          priority: 15,
          maxSize: 150000,
        },
        
        // Common code
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 5,
          maxSize: 100000,
          enforce: true,
        },
      },
    },
    
    // Module concatenation
    concatenateModules: true,
    
    // Optimize exports
    usedExports: true,
    sideEffects: false,
  };

  return config;
};

/**
 * Additional Next.js optimizations
 */
const getNextOptimizations = () => ({
  // Experimental features for performance
  experimental: {
    optimizePackageImports: [
      '@tanstack/react-query',
      '@supabase/supabase-js',
      '@supabase/auth-helpers-nextjs',
      'react-hook-form',
      '@hookform/resolvers',
      'date-fns',
      'zod',
      'clsx',
      'tailwind-merge',
      'sonner',
    ],
    
    // Memory optimizations
    memoryBasedWorkers: true,
    webpackBuildWorker: true,
    
    // Reduce bundle size
    bundlePagesRouterDependencies: true,
    optimizeServerReact: true,
  },
  
  // Compiler optimizations
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Output optimizations
  compress: true,
  poweredByHeader: false,
  
  // Source map optimizations
  productionBrowserSourceMaps: false,
  
  // Image optimizations
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false,
  },
});

module.exports = {
  optimizeWebpackCache,
  getNextOptimizations,
};