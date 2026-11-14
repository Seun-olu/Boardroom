import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    exclude: ["e2e/**", "node_modules/**"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "supabase/tests/**/*.test.ts"],
  },
});
