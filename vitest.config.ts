import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
