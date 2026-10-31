import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

const page = (p) => fileURLToPath(new URL(p, import.meta.url))

// Phone-sized pages are their own small HTML entries that share no code with the site, so phones never
// download the maps, Phaser, fonts etc.: /tiles (Raga Tiles) and /chess/puzzles (Puzzle Challenge).
// In development their clean URLs are rewritten to the HTML files; server/index.js does the same in the booth.
const PAGES = [
  [/^\/tiles\/?(?=\?|$)/, '/tiles.html'],
  [/^\/chess\/puzzles\/?(?=\?|$)/, '/chess-puzzles.html'],
]
function separatePages() {
  return {
    name: 'separate-pages',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        for (const [re, file] of PAGES) if (re.test(req.url)) req.url = req.url.replace(re, file)
        next()
      })
    },
  }
}

// The site is served from the root of the booth server (server/index.js, port 3000).
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss(), separatePages()],
  // harfbuzzjs loads its .wasm via import.meta.url and uses top-level await,
  // so keep it out of dependency pre-bundling.
  optimizeDeps: { exclude: ['harfbuzzjs'] },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000, // the site runs locally, size isn't critical (the phone pages are kept small on purpose)
    rollupOptions: { input: { main: page('./index.html'), tiles: page('./tiles.html'), chessPuzzles: page('./chess-puzzles.html') } },
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
