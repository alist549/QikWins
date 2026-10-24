import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Allow Codespaces / tunnel hostnames so the site opens on a phone.
  server: { allowedHosts: true },
  preview: { allowedHosts: true },
});
