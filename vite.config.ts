import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Allow the Arena preview host (any *.e2b.app subdomain) plus localhost.
    allowedHosts: [".e2b.app", "localhost", "127.0.0.1"],
    proxy: {
      // Dev proxy: /api/v1 → local Cloudflare worker (wrangler dev on :8787)
      "/api": {
        target: process.env.VITE_DEV_API_URL || "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Split vendor chunks so the app shell stays small on slow connections.
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-query": ["@tanstack/react-query", "axios"],
          "vendor-ui": ["recharts", "sonner", "lucide-react"],
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
}));
