import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Relative base so the production build also works when served from any folder.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  // harfbuzzjs loads its .wasm via import.meta.url and uses top-level await,
  // so keep it out of dependency pre-bundling.
  optimizeDeps: { exclude: ['harfbuzzjs'] },
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 }, // runs locally, size isn't critical
  server: { port: 5173 },
  preview: { port: 4173 },
})
