import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

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
    watch: {
      usePolling: true
    }
  }
});
