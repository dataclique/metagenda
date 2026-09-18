import { defineConfig } from "vitest/config"

export default defineConfig({
  root: import.meta.dirname,
  test: {
    include: ["cli/test/**/*.test.ts"],
    setupFiles: ["test/setup.ts"],
    maxWorkers: 1,
  },
})
