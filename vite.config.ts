import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/mocha-api": {
        target: "https://uiyacnls65gg4.mocha.app",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mocha-api/, "/api"),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
