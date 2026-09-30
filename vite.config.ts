import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

const rawPort = process.env.PORT ?? '5173';
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? '/';

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, path.resolve(import.meta.dirname), '');
  const backend =
    process.env.ZENTRIX_BACKEND_URL?.trim() ||
    env.ZENTRIX_BACKEND_URL?.trim() ||
    'http://127.0.0.1:8000';

  const backendPaths = [
    '/auth/',
    '/cours/',
    '/courses/',
    '/notes/',
    '/ai/',
    '/ai-course-gen/',
    '/notifications/',
    '/dashboard/',
    '/analytics/',
    '/admin/',
    '/quizzes/',
    '/chapter-completions/',
    '/certificates/',
    '/reviews/',
    '/library/',
    '/questionnaires/',
    '/health',
  ];

  return {
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: Object.fromEntries(
      backendPaths.map((route) => [
        route,
        { target: backend, changeOrigin: true, secure: false },
      ]),
    ),
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
  };
});
