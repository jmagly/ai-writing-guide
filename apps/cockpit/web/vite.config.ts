import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the Bridge can serve the built assets from any path.
// In dev, proxy the control surface to a running Bridge (default :8120).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: process.env.BRIDGE_URL ?? 'http://127.0.0.1:8120', changeOrigin: true },
      '/healthz': { target: process.env.BRIDGE_URL ?? 'http://127.0.0.1:8120', changeOrigin: true },
    },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
