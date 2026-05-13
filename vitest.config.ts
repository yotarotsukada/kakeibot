import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "~/": new URL("./app/", import.meta.url).pathname,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
  },
});
