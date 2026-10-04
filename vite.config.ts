/// <reference types="vitest/config" />
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Connect, type Plugin } from "vite"
import { VitePWA } from "vite-plugin-pwa"

// The prototype stored its data under the origin it ran on. Using the same port
// lets the app find that data on first run when the prototype was served here.
const PORT = 8642

// Serves the git-ignored songs/ folder from the local dev and preview servers only.
// It's never copied into dist/, so personal charts can't end up in a deployed build.
function personalSongs(): Plugin {
  const serve: Connect.NextHandleFunction = async (req, res, next) => {
    const url = (req.url ?? "").split("?")[0]
    const match = url.match(/\/songs\/([\w-]+\.js)$/)
    if (!match) return next()
    try {
      const body = await readFile(resolve(import.meta.dirname, "songs", match[1]))
      res.setHeader("Content-Type", "text/javascript; charset=utf-8")
      res.setHeader("Cache-Control", "no-store")
      res.end(body)
    } catch {
      res.statusCode = 404
      res.end()
    }
  }
  return {
    name: "personal-songs",
    configureServer: (server) => void server.middlewares.use(serve),
    configurePreviewServer: (server) => void server.middlewares.use(serve),
  }
}

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    tailwindcss(),
    personalSongs(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Song Practice",
        short_name: "Practice",
        description:
          "Play along with your guitar part and a click, from easy chords up to the record.",
        theme_color: "#fafafa",
        background_color: "#fafafa",
        display: "standalone",
        start_url: ".",
        scope: ".",
        icons: [
          { src: "icon.svg", sizes: "any", type: "image/svg+xml" },
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // songs/ is personal and only exists on the local server.
        navigateFallbackDenylist: [/\/songs\//],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    // One screen, all of it needed at start, so splitting the bundle wouldn't load anything later.
    chunkSizeWarningLimit: 700,
  },
  server: { port: PORT, strictPort: true },
  preview: { port: PORT, strictPort: true },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
})
