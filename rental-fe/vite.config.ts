import path from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const disableDevProxy = Boolean(
  process.env.VITE_DISABLE_PROXY || process.env.CI,
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: disableDevProxy
      ? {}
      : {
          "/api": {
            target: "http://localhost:3000",
            changeOrigin: true,
          },
        },
  },
})