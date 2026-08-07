/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { readFileSync, existsSync } from 'fs';

function loadBuildEnv() {
  const buildFile = path.resolve(__dirname, '.env.build');
  if (!existsSync(buildFile)) return {};
  const content = readFileSync(buildFile, 'utf-8');
  const vars: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    vars[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
  }
  return vars;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const buildEnv = loadBuildEnv();

  // Merge build env into loaded env (build env takes precedence)
  const merged = { ...env, ...buildEnv };

  const viteEnv = Object.entries(merged).reduce((acc, [key, val]) => {
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
        define: {
          global: 'globalThis',
        },
      },
    },
    define: {
      ...viteEnv,
      'import.meta.env.MODE': JSON.stringify(mode),
      'process.env': Object.entries(merged).reduce((prev, [key, val]) => {
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
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
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
      minify: 'esbuild',
      chunkSizeWarningLimit: 1000,
    },
    plugins: [react()],
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: './src/test/setup.ts',
      css: true,
    },
  };
});