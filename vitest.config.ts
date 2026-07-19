import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Mirrors tsconfig.json's "@/*" -> "./*" path mapping — Next's own
  // bundler resolves it via tsconfig automatically, but Vitest needs it
  // spelled out (build6 §6.2: topics.ts imports PEOPLE via "@/lib/...").
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    include: ["scripts/**/*.test.ts", "lib/**/*.test.ts"],
    environment: "node",
  },
});
