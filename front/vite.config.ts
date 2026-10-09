import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Both deployment configurations point to this directory (relative to their roots).
    outDir: 'dist',
    target: 'es2020',
    rollupOptions: {
      output: {
        // Keep document-export libraries out of the initial application chunk.
        manualChunks(id) {
          // Only group these packages: do not absorb shared dependencies
          // into a chunk needed by the landing page.
          const moduleId = id.replaceAll('\\', '/');
          if (moduleId.includes('vite/preload-helper')) return 'preload-runtime';
          if (moduleId.includes('/node_modules/jspdf/') ||
              moduleId.includes('/node_modules/jspdf-autotable/')) {
            return 'pdf-vendor';
          }
          if (moduleId.includes('/node_modules/xlsx/')) {
            return 'spreadsheet-vendor';
          }
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});