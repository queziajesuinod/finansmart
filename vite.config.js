import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Separa libs grandes em chunks próprios (cacheáveis entre deploys) e
        // tira os ícones de marca (simple-icons) do bundle principal.
        manualChunks: {
          react: ["react", "react-dom"],
          icons: ["lucide-react"],
          brands: ["simple-icons"],
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
});
