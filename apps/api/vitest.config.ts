import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["@zerde/ingest/loadEnv"],
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
