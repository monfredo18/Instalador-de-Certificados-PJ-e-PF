import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@cert-ecosystem/shared-types': path.resolve(__dirname, '../../packages/shared-types/src/index.ts'),
      '@cert-ecosystem/shared-core': path.resolve(__dirname, '../../packages/shared-core/src/index.ts'),
      '@cert-ecosystem/shared-ui': path.resolve(__dirname, '../../packages/shared-ui/src/index.ts'),
    },
  },
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              // Impede que o Vite tente empacotar dependências complexas de Node/WASM
              external: ['sql.js', 'node-forge'],
            },
          },
        },
      },
      preload: {
        input: 'electron/preload.ts',
      },
      renderer: {},
    }),
  ],
});
