import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** Relative base → works on domain root OR subfolder (e.g. yoursite.com/cpe/). */
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
