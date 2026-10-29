import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

const page = (p) => fileURLToPath(new URL(p, import.meta.url))

// The phone piano game (/tiles) is its own small page (tiles.html): it shares no code with the site,
// so phones never download the maps, Phaser, fonts etc. In development /tiles is rewritten to it.
function tilesPage() {
  return {
    name: 'raga-tiles-page',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (/^\/tiles\/?(\?|$)/.test(req.url)) req.url = req.url.replace(/^\/tiles\/?/, '/tiles.html')
        next()
      })
    },
  }
}

// The site is served from the root of the booth server (server/index.js, port 3000).
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss(), tilesPage()],
  // harfbuzzjs loads its .wasm via import.meta.url and uses top-level await,
  // so keep it out of dependency pre-bundling.
  optimizeDeps: { exclude: ['harfbuzzjs'] },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000, // the site runs locally, size isn't critical (the /tiles page is kept small on purpose)
    rollupOptions: { input: { main: page('./index.html'), tiles: page('./tiles.html') } },
  },
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
