import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env": "{}",
    "process": '{"env":{}}'
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    emptyOutDir: true,
    minify: "esbuild",
  },
});
