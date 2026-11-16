
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    host: "0.0.0.0",
    port: 5173,
    open: true,

    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "dinefor.com",
      "www.dinefor.com",
      "screenshot-online-valued-correlation.trycloudflare.com",
      "emails-elections-remains-heat.trycloudflare.com",
    ],

    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
        configure(proxy) {
          // Preserve existing backend CORS configuration.
          proxy.on("proxyReq", (proxyReq) =>
            proxyReq.setHeader("Origin", "http://localhost:5173")
          );
        },
      },

      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
        configure(proxy) {
          // Preserve existing backend CORS configuration.
          proxy.on("proxyReq", (proxyReq) =>
            proxyReq.setHeader("Origin", "http://localhost:5173")
          );
        },
      },
    },
  },

  preview: {
    host: "0.0.0.0",
    port: 4173,

    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "dinefor.com",
      "www.dinefor.com",
      "screenshot-online-valued-correlation.trycloudflare.com",
      "emails-elections-remains-heat.trycloudflare.com",
    ],
  },

  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
