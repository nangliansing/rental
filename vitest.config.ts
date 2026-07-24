import { mergeConfig } from "vite"
import { defineConfig } from "vitest/config"

import viteConfig from "./vite.config"

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
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
