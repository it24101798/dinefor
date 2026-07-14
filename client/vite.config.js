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
    ],

    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },

      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
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
    ],
  },

  build: {
    outDir: "dist",
    sourcemap: true,
  },
});