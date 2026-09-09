import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./src/loadEnv.ts"],
    hookTimeout: 30_000,
    // Интеграционные тесты делят одну БД zerde109_test и пересоздают схему
    // в beforeAll — гоняем файлы последовательно, чтобы не топтать друг друга.
    fileParallelism: false,
  },
});
