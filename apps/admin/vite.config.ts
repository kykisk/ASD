/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/admin',
  server: {
    port: 4300,
    host: '0.0.0.0',
    proxy: {
      '/v1': {
        target: 'http://localhost:3100',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4300,
    host: '0.0.0.0',
    proxy: {
      '/v1': {
        target: 'http://localhost:3100',
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), nxViteTsPaths()],
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
}));
