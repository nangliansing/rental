import { defineConfig, devices } from "@playwright/test"
import { loadEnv } from "vite"

const env = loadEnv("development", process.cwd(), "")
const webServerEnv = {
  ...process.env,
  ...env,
  VITE_GOOGLE_MAPS_API_KEY:
    process.env.VITE_GOOGLE_MAPS_API_KEY ??
    env.VITE_GOOGLE_MAPS_API_KEY ??
    "test-google-maps-api-key",
  VITE_GOOGLE_MAPS_MAP_ID:
    process.env.VITE_GOOGLE_MAPS_MAP_ID ??
    env.VITE_GOOGLE_MAPS_MAP_ID ??
    "test-google-maps-map-id",
}
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173"
const skipWebServer = Boolean(process.env.PLAYWRIGHT_SKIP_WEBSERVER)
const browserChannel = process.env.PLAYWRIGHT_CHANNEL
const isCi = Boolean(process.env.CI)

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  timeout: process.env.CI ? 120_000 : 60_000,
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 7"],
        ...(browserChannel ? { channel: browserChannel as "chrome" } : {}),
      },
    },
  ],
  ...(skipWebServer
    ? {}
    : {
        webServer: {
          command: isCi
            ? "npm run build && npm run preview -- --host 127.0.0.1 --port 5173 --strictPort"
            : "npm run dev -- --host 127.0.0.1 --port 5173",
          url: baseURL,
          reuseExistingServer: !isCi,
          timeout: isCi ? 180_000 : 120_000,
          env: webServerEnv,
        },
      }),
})
