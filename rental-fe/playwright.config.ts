import { defineConfig, devices } from "@playwright/test"
import { loadEnv } from "vite"

const env = loadEnv("development", process.cwd(), "")
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173"
const skipWebServer = Boolean(process.env.PLAYWRIGHT_SKIP_WEBSERVER)
const browserChannel = process.env.PLAYWRIGHT_CHANNEL

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
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
          command: "npm run dev -- --host 127.0.0.1 --port 5173",
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: {
            ...process.env,
            ...env,
          },
        },
      }),
})
