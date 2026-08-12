import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(() => ({
  // GitHub Pages serves this project at a sub-path (github.io/<repo-name>/), not the domain root, so
  // every asset reference needs that prefix — but ONLY for that specific deploy target. Gated behind
  // an explicit env var (set by .github/workflows/deploy-pages.yml) rather than just "is this a
  // production build", because `npm run dist:win` ALSO runs `vite build` under the hood, and the
  // Electron app's own local static server (electron/main.cjs) serves dist/ at its own root — it
  // would 404 every asset if this same sub-path prefix leaked into that build too.
  base: process.env.GITHUB_PAGES ? '/Fire-Emblem-Fates-Unit-Planner/' : '/',
  // host: true binds the dev server to all network interfaces (not just localhost) so it's
  // reachable from a phone on the same Wi-Fi/LAN for mobile testing. allowedHosts lists the
  // Tailscale MagicDNS hostname too — Vite blocks any Host header it doesn't recognize by
  // default (DNS-rebinding protection), which otherwise rejects requests coming in through
  // `tailscale serve`'s reverse proxy even though the raw LAN IP is allowed.
  // Reads PORT so the harness can assign a free port when 5173 is already taken by another
  // session's dev server on this same machine — Vite doesn't honor PORT on its own.
  server: {
    host: true,
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    allowedHosts: ['grantpc.tailaa1e6c.ts.net'],
  },
  // Same reasoning as `server` above, but for `vite preview` — needed to actually test the PWA's
  // offline/install behavior, since the dev server (`vite dev`) doesn't generate a real service
  // worker; only a production build (`vite build` + `vite preview`) does.
  preview: {
    host: true,
    allowedHosts: ['grantpc.tailaa1e6c.ts.net'],
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Default globPatterns only picked up the JS/CSS/HTML bundle and the 4 manifest icons (10
      // entries, ~635KB) — none of public/art/'s portrait PNGs, since those are plain copied
      // public-dir files rather than part of Rollup's own asset graph. Without them precached, the
      // app shell loads offline (it's cached) but every portrait image request just hits the dead
      // network and fails — confirmed: offline testing showed the app opening fine with every
      // portrait missing. Explicitly including png/webp brings the whole 4.3MB art folder (147
      // files) into the precache too, small enough to just cache all of it upfront rather than
      // only whichever portraits happened to be viewed before going offline.
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
      },
      manifest: {
        name: 'Fates Unit Planner',
        short_name: 'Unit Planner',
        description: 'Fire Emblem Fates marriage, pair-up, and inheritance planner',
        theme_color: '#7c3aed',
        background_color: '#16171d',
        display: 'standalone',
        // Relative (no leading slash) rather than root-absolute — a web app manifest resolves
        // relative URLs against the manifest file's OWN location, which already sits at whatever
        // the configured base is (domain root normally, a sub-path on GitHub Pages), so this way
        // the icons resolve correctly either way without needing to know `base` here too.
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
}))
