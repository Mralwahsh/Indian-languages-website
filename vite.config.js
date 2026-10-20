import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The site is served from the root of the booth server (server/index.js, port 3000).
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  // harfbuzzjs loads its .wasm via import.meta.url and uses top-level await,
  // so keep it out of dependency pre-bundling.
  optimizeDeps: { exclude: ['harfbuzzjs'] },
  build: { target: 'es2022', chunkSizeWarningLimit: 2000 }, // runs locally, size isn't critical
  server: {
    port: 5173,
    host: true, // reachable from phones on the hotspot during development
    proxy: {
      '/socket.io': { target: 'http://localhost:3000', ws: true },
      '/api': 'http://localhost:3000',
    },
  },
  preview: { port: 4173 },
})
