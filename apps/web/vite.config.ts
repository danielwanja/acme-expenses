import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // Firebase + Zod in one bundle is about 1.2 MB; fine for an internal tool.
  build: { chunkSizeWarningLimit: 1500 },
  server: {
    // npm run dev: send /api to the Hosting emulator, which rewrites it to the
    // api function exactly as production Hosting does.
    proxy: { "/api": "http://127.0.0.1:5000" },
  },
});
