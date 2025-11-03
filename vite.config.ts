import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: '/',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      'process.env': {
        ...Object.entries(env).reduce((prev, [key, val]) => {
          if (key.startsWith('VITE_')) {
            return {
              ...prev,
              [key]: val
            };
          }
          return prev;
        }, {}),
      },
    },
    server: {
      host: '::',
      port: 8080,
      strictPort: true,
      hmr: {
        port: 8080,
        host: 'localhost',
        protocol: 'ws',
      },
      // Allow ngrok host
      allowedHosts: [
        '4b8d111bae68.ngrok-free.app',
        '834703e13045.ngrok-free.app',
        'localhost',
        '127.0.0.1',
        '.ngrok-free.app'
      ],
    },
  preview: {
    port: 8080,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: mode === 'development',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          vendor: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
  plugins: [react()],
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-window',
        'react-virtualized-auto-sizer',
      ],
      esbuildOptions: {
        // Node.js global to browser globalThis
        define: {
          global: 'globalThis',
        },
      },
    },
  };
});
