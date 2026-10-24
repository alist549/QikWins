import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // PixiJS and Tone.js are loaded on demand, in their own chunks.
  build: { chunkSizeWarningLimit: 1000 },
  // Allow Codespaces / tunnel hostnames so the site opens on a phone.
  server: { allowedHosts: true },
  preview: { allowedHosts: true },
});
