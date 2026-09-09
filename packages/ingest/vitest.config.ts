import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./src/loadEnv.ts"],
    hookTimeout: 30_000,
  },
});
