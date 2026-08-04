import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

import { defineConfig, devices } from "@playwright/test"

import { SMOKE_TEST_GEOLOCATION } from "./e2e/fixtures/test-geolocation"

/** Minimal .env loader so Playwright does not depend on the Vite package resolution. */
function loadDotEnvFile(fileName: string): Record<string, string> {
  const filePath = resolve(process.cwd(), fileName)
  if (!existsSync(filePath)) return {}

  const env: Record<string, string> = {}
  for (const rawLine of readFileSync(filePath, "utf8").split("\n")) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue

    const separatorIndex = line.indexOf("=")
    if (separatorIndex <= 0) continue

    const key = line.slice(0, separatorIndex).trim()
    let value = line.slice(separatorIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

const env = {
  ...loadDotEnvFile(".env"),
  ...loadDotEnvFile(".env.local"),
  ...loadDotEnvFile(".env.development"),
  ...loadDotEnvFile(".env.development.local"),
}
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
        permissions: ["geolocation"],
        geolocation: SMOKE_TEST_GEOLOCATION,
        locale: "en-US",
        timezoneId: "UTC",
        ...(browserChannel ? { channel: browserChannel as "chrome" } : {}),
      },
    },
  ],
  ...(skipWebServer
    ? {}
    : {
        webServer: {
          command: isCi
            ? "npm run preview -- --host 127.0.0.1 --port 5173 --strictPort"
            : "npm run dev -- --host 127.0.0.1 --port 5173",
          url: baseURL,
          reuseExistingServer: !isCi,
          timeout: isCi ? 180_000 : 120_000,
          env: webServerEnv,
        },
      }),
})
