import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    pool: "forks",
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts", "app/api/**/*.ts"],
      exclude: ["lib/db.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
