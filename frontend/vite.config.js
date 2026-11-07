// frontend/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  envDir: "../",
  server: {
    port: 5173,
    proxy: {
      // Keep the one unmigrated data-ingestion endpoint on FastAPI.
      "/api/upload-csv": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      // Migrated API requests use Express. Using 127.0.0.1 avoids IPv6 issues on Windows.
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
});
