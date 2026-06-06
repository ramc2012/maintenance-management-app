import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiProxyTarget = process.env.VITE_DEV_API_PROXY_TARGET || "http://localhost:3003";
const cognitiveProxyTarget =
  process.env.VITE_DEV_COGNITIVE_PROXY_TARGET || "http://localhost:8003";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Use different folder name to avoid conflict with /assets route
    assetsDir: '_static'
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true,
      },
      "/cognitive": {
        target: cognitiveProxyTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cognitive/, ""),
      },
    },
    watch: {
      usePolling: true
    }
  }
});
