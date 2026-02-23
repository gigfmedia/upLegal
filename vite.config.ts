import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load all env variables
  const env = loadEnv(mode, process.cwd(), '');
  
  // Filter only VITE_* variables
  const viteEnv = Object.entries(env).reduce((acc, [key, val]) => {
    if (key.startsWith('VITE_')) {
      acc[`import.meta.env.${key}`] = JSON.stringify(val);
    }
    return acc;
  }, {} as Record<string, string>);

  return {
    base: '/',
    resolve: {
      alias: [
        {
          find: '@',
          replacement: path.resolve(__dirname, './src'),
        },
      ],
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    },
    optimizeDeps: {
      exclude: ['email-cita-agendada.html', 'email-preview.html'],
      include: [
        'react',
        'react-dom',
        'react-window',
        'react-virtualized-auto-sizer',
      ],
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
          '.ts': 'tsx',
        },
        // Node.js global to browser globalThis
        define: {
          global: 'globalThis',
        },
      },
    },
    define: {
      ...viteEnv,
      'import.meta.env.MODE': JSON.stringify(mode),
      'process.env': Object.entries(env).reduce((prev, [key, val]) => {
        if (key.startsWith('VITE_')) {
          return {
            ...prev,
            [key]: val
          };
        }
        return prev;
      }, {}),
    },
    server: {
      host: '::',
      port: 3001,
      strictPort: true,
      hmr: {
        port: 3002,
        host: 'localhost',
        protocol: 'ws',
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3000', // Your backend server URL
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
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
    chunkSizeWarningLimit: 1000,
  },
  plugins: [react()],
  };
});
