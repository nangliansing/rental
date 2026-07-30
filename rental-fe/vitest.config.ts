import { mergeConfig } from "vite"
import { defineConfig } from "vitest/config"

import viteConfig from "./vite.config"

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.{test,spec}.{ts,tsx}", "e2e/fixtures/**/*.test.ts"],
      exclude: ["**/node_modules/**", "**/dist/**", "e2e/**/*.spec.ts"],
      clearMocks: true,
      restoreMocks: true,
      css: true,
      coverage: {
        provider: "v8",
        reporter: ["text", "html"],
        reportsDirectory: "coverage",
        exclude: ["src/test/**", "src/**/*.d.ts"],
      },
    },
  }),
)
